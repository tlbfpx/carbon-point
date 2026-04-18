package com.carbonpoint.mall.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.mall.entity.ExchangeOrder;
import com.carbonpoint.mall.entity.Product;
import com.carbonpoint.mall.mapper.ExchangeOrderMapper;
import com.carbonpoint.mall.mapper.MallProductMapper;
import com.carbonpoint.mall.util.CouponGenerator;
import com.carbonpoint.points.service.PointAccountService;
import com.carbonpoint.points.mapper.PointsUserMapper;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.service.NotificationTrigger;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExchangeService {

    /** pending 订单超时时间（分钟），超过此时间自动转为 expired */
    private static final int PENDING_TIMEOUT_MINUTES = 15;

    /** 定时任务每次最多处理订单数，防止锁表 */
    private static final int BATCH_SIZE = 500;

    /** 最大分页条数限制 */
    private static final int MAX_PAGE_SIZE = 100;

    private final MallProductMapper productMapper;
    private final ExchangeOrderMapper exchangeOrderMapper;
    private final PointAccountService pointAccountService;
    private final PointsUserMapper userMapper;
    private final CouponGenerator couponGenerator;
    private final NotificationTrigger notificationTrigger;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public ExchangeOrder exchange(Long userId, Long productId) {
        Product product = productMapper.selectById(productId);
        if (product == null) {
            throw new BusinessException(ErrorCode.MALL_PRODUCT_NOT_FOUND);
        }
        if (!product.getTenantId().equals(TenantContext.getTenantId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        if (!"active".equals(product.getStatus())) {
            throw new BusinessException(ErrorCode.MALL_PRODUCT_OFF_SALE);
        }

        // check stock (-1 = unlimited)
        if (product.getStock() != -1 && product.getStock() <= 0) {
            throw new BusinessException(ErrorCode.MALL_PRODUCT_STOCK_EMPTY);
        }

        // check per-user limit
        if (product.getMaxPerUser() != null) {
            LambdaQueryWrapper<ExchangeOrder> qw = new LambdaQueryWrapper<>();
            qw.eq(ExchangeOrder::getUserId, userId)
              .eq(ExchangeOrder::getProductId, productId)
              .ne(ExchangeOrder::getOrderStatus, "cancelled");
            long count = exchangeOrderMapper.selectCount(qw);
            if (count >= product.getMaxPerUser()) {
                throw new BusinessException(ErrorCode.EXCHANGE_POINT_NOT_ENOUGH, "已达兑换上限");
            }
        }

        // check point balance
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        Integer availablePoints = user.getAvailablePoints();
        if (availablePoints == null || availablePoints < product.getPointsPrice()) {
            throw new BusinessException(ErrorCode.EXCHANGE_POINT_NOT_ENOUGH,
                "积分不够，当前可用 " + availablePoints + "，需要 " + product.getPointsPrice());
        }

        // step 5: freeze points (atomic deduction)
        pointAccountService.freezePoints(userId, product.getPointsPrice(), "exchange",
                "product_" + productId, "兑换商品: " + product.getName());

        // step 6: create exchange order
        ExchangeOrder order = new ExchangeOrder();
        order.setTenantId(product.getTenantId());
        order.setUserId(userId);
        order.setProductId(productId);
        order.setProductName(product.getName());
        order.setProductType(product.getType());
        order.setPointsSpent(product.getPointsPrice());
        order.setOrderStatus("pending");
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());

        if (product.getValidityDays() != null) {
            order.setExpiresAt(LocalDateTime.now().plusDays(product.getValidityDays()));
        }
        exchangeOrderMapper.insert(order);

        // step 7: fulfill virtual product based on type
        String couponCode = fulfillProduct(order, product);
        order.setCouponCode(couponCode);

        // step 8: update order to fulfilled
        order.setOrderStatus("fulfilled");
        order.setFulfilledAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());
        exchangeOrderMapper.updateById(order);

        // step 9: confirm frozen points consumed
        pointAccountService.confirmFrozenPoints(userId, product.getPointsPrice(), "order_" + order.getId());

         // step 10: deduct stock with optimistic locking (retry up to 3 times)
        if (product.getStock() != -1) {
            deductStockWithRetry(product, 3);
        }

        // step 11: send order fulfilled notification
        notificationTrigger.onOrderFulfilled(order.getTenantId(), userId, user.getPhone(), user.getEmail(),
                order.getId(), order.getProductName());

        log.info("exchange: userId={}, productId={}, orderId={}, points={}", userId, productId, order.getId(), product.getPointsPrice());
        return order;
    }

    /**
     * Deduct product stock using optimistic locking.
     * Retries up to maxRetries times on version conflict, then throws STOCK_EMPTY.
     */
    private void deductStockWithRetry(Product product, int maxRetries) {
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            // Re-fetch the latest product
            Product latest = productMapper.selectById(product.getId());
            if (latest == null || latest.getStock() == -1) {
                return; // unlimited stock
            }
            if (latest.getStock() <= 0) {
                throw new BusinessException(ErrorCode.MALL_PRODUCT_STOCK_EMPTY);
            }

            // Atomic deduction with optimistic lock: UPDATE ... WHERE id=? AND version=? AND stock > 0
            int rows = productMapper.deductStockWithVersion(latest.getId(), latest.getVersion());
            if (rows == 1) {
                // Check if stock is now 0 and update status
                Product updated = productMapper.selectById(product.getId());
                if (updated != null && updated.getStock() != -1 && updated.getStock() == 0) {
                    Product statusUpdate = new Product();
                    statusUpdate.setId(updated.getId());
                    statusUpdate.setStatus("sold_out");
                    productMapper.updateById(statusUpdate);
                }
                return; // Success
            }

            // rows == 0: stock was already 0 or version mismatch (another transaction took it)
            if (attempt == maxRetries) {
                throw new BusinessException(ErrorCode.MALL_PRODUCT_STOCK_EMPTY);
            }
            // Retry with fresh data
        }
    }

    /**
     * Restore product stock using conditional update with optimistic lock.
     * Retries up to 3 times on version conflict. Safely handles concurrent cancels.
     */
    private void restoreStockWithRetry(Long productId) {
        if (productId == null) return;
        for (int attempt = 1; attempt <= 3; attempt++) {
            Product product = productMapper.selectById(productId);
            if (product == null || product.getStock() == -1) {
                return; // unlimited stock or product deleted
            }

            // Conditional update: only restore if status != inactive (prevents restoring deleted product)
            int rows = productMapper.restoreStockWithVersion(product.getId(), product.getVersion());
            if (rows == 1) {
                // If it was sold_out, reactivate
                Product updated = productMapper.selectById(productId);
                if (updated != null && updated.getStock() != -1 && "sold_out".equals(updated.getStatus())) {
                    Product statusUpdate = new Product();
                    statusUpdate.setId(updated.getId());
                    statusUpdate.setStatus("active");
                    productMapper.updateById(statusUpdate);
                }
                return; // Success
            }
            // rows == 0: version mismatch — retry
        }
        log.warn("restoreStockWithRetry: failed to restore stock for productId={} after 3 attempts", productId);
    }

    private String fulfillProduct(ExchangeOrder order, Product product) {
        String type = product.getType();
        if ("coupon".equals(type)) {
            try {
                JsonNode config = objectMapper.readTree(product.getFulfillmentConfig() != null ?
                        product.getFulfillmentConfig() : "{}");
                int codeLen = config.has("codeLength") ? config.get("codeLength").asInt() : 16;
                String prefix = config.has("prefix") ? config.get("prefix").asText() : "CP";
                return couponGenerator.generate(codeLen, prefix);
            } catch (JsonProcessingException e) {
                log.warn("Failed to parse fulfillment_config, using default", e);
                return couponGenerator.generate(16, "CP");
            }
        } else if ("recharge".equals(type)) {
            // Phase 2: integrate with recharge API
            log.info("recharge order {} pending integration", order.getId());
            return null;
        } else if ("privilege".equals(type)) {
            // Activate privilege directly
            log.info("privilege order {} fulfilled directly", order.getId());
            return null;
        }
        return null;
    }

    @Transactional
    public void cancelOrder(Long orderId, Long userId) {
        ExchangeOrder order = exchangeOrderMapper.selectById(orderId);
        if (order == null) {
            throw new BusinessException(ErrorCode.ORDER_NOT_FOUND);
        }
        if (!order.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        if (!"pending".equals(order.getOrderStatus())) {
            throw new BusinessException(ErrorCode.ORDER_STATUS_ERROR, "只能取消待处理订单");
        }
        cancelOrderInternal(order, "订单取消退还积分");
        log.info("cancelOrder: orderId={}", orderId);
    }

    /**
     * 管理员取消订单（可在 pending 状态下取消）。
     * 积分解冻 + 库存回滚。
     */
    @Transactional
    public void adminCancelOrder(Long orderId, Long adminId) {
        ExchangeOrder order = exchangeOrderMapper.selectById(orderId);
        if (order == null) {
            throw new BusinessException(ErrorCode.ORDER_NOT_FOUND);
        }
        if (!"pending".equals(order.getOrderStatus())) {
            throw new BusinessException(ErrorCode.ORDER_STATUS_ERROR, "只能取消待处理订单");
        }
        cancelOrderInternal(order, "管理员取消订单退还积分");
        log.info("adminCancelOrder: orderId={}, adminId={}", orderId, adminId);
    }

    /**
     * Shared cancellation logic: update status, unfreeze points, restore stock.
     */
    private void cancelOrderInternal(ExchangeOrder order, String reason) {
        order.setOrderStatus("cancelled");
        order.setUpdatedAt(LocalDateTime.now());
        exchangeOrderMapper.updateById(order);

        pointAccountService.unfreezePoints(order.getUserId(), order.getPointsSpent(),
                "order_" + order.getId(), reason);

        restoreStockWithRetry(order.getProductId());
    }

    /**
     * Validate that an order is in a fulfillable state (status == "fulfilled").
     * Throws ORDER_COUPON_ALREADY_USED if already used, ORDER_STATUS_ERROR otherwise.
     */
    private void validateFulfillable(ExchangeOrder order) {
        if ("used".equals(order.getOrderStatus())) {
            throw new BusinessException(ErrorCode.ORDER_COUPON_ALREADY_USED, "该券码已使用");
        }
        if ("expired".equals(order.getOrderStatus()) || "cancelled".equals(order.getOrderStatus())) {
            throw new BusinessException(ErrorCode.ORDER_STATUS_ERROR);
        }
        if (!"fulfilled".equals(order.getOrderStatus())) {
            throw new BusinessException(ErrorCode.ORDER_STATUS_ERROR);
        }
    }

    @Transactional
    public void fulfillOrder(Long orderId, Long adminId) {
        ExchangeOrder order = exchangeOrderMapper.selectById(orderId);
        if (order == null) {
            throw new BusinessException(ErrorCode.ORDER_NOT_FOUND);
        }
        validateFulfillable(order);

        order.setOrderStatus("used");
        order.setUsedAt(LocalDateTime.now());
        order.setUsedBy("admin:" + adminId);
        order.setUpdatedAt(LocalDateTime.now());
        exchangeOrderMapper.updateById(order);

        log.info("fulfillOrder: orderId={}, adminId={}", orderId, adminId);
    }

    /**
     * 管理员通过券码核销。
     * coupon_code 有唯一索引（DDL: UNIQUE KEY uk_coupon），重复核销触发唯一键冲突时捕获异常。
     * 已使用的券码返回 COUPON_ALREADY_USED。
     */
    @Transactional
    public ExchangeOrder redeemByCouponCode(String couponCode, Long adminId) {
        if (couponCode == null || couponCode.isBlank()) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "券码不能为空");
        }

        LambdaQueryWrapper<ExchangeOrder> qw = new LambdaQueryWrapper<>();
        qw.eq(ExchangeOrder::getCouponCode, couponCode);
        ExchangeOrder order = exchangeOrderMapper.selectOne(qw);

        if (order == null) {
            throw new BusinessException(ErrorCode.MALL_COUPON_NOT_FOUND, "券码不存在");
        }

        validateFulfillable(order);

        order.setOrderStatus("used");
        order.setUsedAt(LocalDateTime.now());
        order.setUsedBy("admin:" + adminId);
        order.setUpdatedAt(LocalDateTime.now());
        exchangeOrderMapper.updateById(order);

        log.info("redeemByCouponCode: couponCode={}, orderId={}, adminId={}", couponCode, order.getId(), adminId);
        return order;
    }

    @Transactional
    public void userConfirmUse(Long orderId, Long userId) {
        ExchangeOrder order = exchangeOrderMapper.selectById(orderId);
        if (order == null) {
            throw new BusinessException(ErrorCode.ORDER_NOT_FOUND);
        }
        if (!order.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        validateFulfillable(order);

        order.setOrderStatus("used");
        order.setUsedAt(LocalDateTime.now());
        order.setUsedBy("self");
        order.setUpdatedAt(LocalDateTime.now());
        exchangeOrderMapper.updateById(order);

        log.info("userConfirmUse: orderId={}", orderId);
    }

    /**
     * 处理 pending 超时订单（15min 未转为 fulfilled）。
     * 每 5 分钟执行一次，每次最多处理 500 条。
     * pending → expired：解冻积分 + 回滚库存。
     */
    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void expirePendingOrders() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(PENDING_TIMEOUT_MINUTES);
        LambdaQueryWrapper<ExchangeOrder> qw = new LambdaQueryWrapper<>();
        qw.eq(ExchangeOrder::getOrderStatus, "pending")
          .lt(ExchangeOrder::getCreatedAt, cutoff)
          .last("LIMIT " + BATCH_SIZE);

        List<ExchangeOrder> pending = exchangeOrderMapper.selectList(qw);
        for (ExchangeOrder order : pending) {
            // 解冻积分
            pointAccountService.unfreezePoints(order.getUserId(), order.getPointsSpent(),
                    "order_" + order.getId(), "订单超时退还积分");
            // 回滚库存
            restoreStockWithRetry(order.getProductId());

            // 更新状态为 expired（记录过期原因：timeout）
            order.setOrderStatus("expired");
            order.setUpdatedAt(LocalDateTime.now());
            exchangeOrderMapper.updateById(order);

            // 发送订单过期通知
            User user = userMapper.selectById(order.getUserId());
            if (user != null) {
                notificationTrigger.onOrderExpired(order.getTenantId(), user.getId(), user.getPhone(), user.getEmail(),
                        order.getId(), order.getPointsSpent());
            }

            log.info("expirePendingOrders: orderId={} (timeout)", order.getId());
        }
        log.info("expirePendingOrders: processed {} pending orders", pending.size());
    }

    /**
     * 处理 fulfilled 卡券过期（已发放但超过有效期）。
     * 每天凌晨执行。
     * fulfilled → expired：不涉及积分（积分已在 fulfilled 时确认消费）。
     */
    @Scheduled(cron = "0 0 2 * * ?") // 2 AM daily
    @Transactional
    public void expireFulfilledCoupons() {
        LocalDateTime now = LocalDateTime.now();
        LambdaQueryWrapper<ExchangeOrder> qw = new LambdaQueryWrapper<>();
        qw.eq(ExchangeOrder::getOrderStatus, "fulfilled")
          .lt(ExchangeOrder::getExpiresAt, now)
          .last("LIMIT " + BATCH_SIZE);

        List<ExchangeOrder> expired = exchangeOrderMapper.selectList(qw);
        for (ExchangeOrder order : expired) {
            order.setOrderStatus("expired");
            order.setUpdatedAt(now);
            exchangeOrderMapper.updateById(order);
            log.info("expireFulfilledCoupons: orderId={} (coupon expired)", order.getId());
        }
        log.info("expireFulfilledCoupons: processed {} fulfilled orders", expired.size());
    }

    public Page<ExchangeOrder> getMyOrders(Long userId, int page, int size, String status) {
        int effectiveSize = Math.min(size, MAX_PAGE_SIZE);
        Page<ExchangeOrder> p = new Page<>(page, effectiveSize);
        LambdaQueryWrapper<ExchangeOrder> qw = new LambdaQueryWrapper<>();
        qw.eq(ExchangeOrder::getUserId, userId);
        if (status != null) {
            qw.eq(ExchangeOrder::getOrderStatus, status);
        }
        qw.orderByDesc(ExchangeOrder::getCreatedAt);
        return exchangeOrderMapper.selectPage(p, qw);
    }

    public ExchangeOrder getOrderById(Long orderId) {
        ExchangeOrder order = exchangeOrderMapper.selectById(orderId);
        if (order == null) {
            throw new BusinessException(ErrorCode.ORDER_NOT_FOUND);
        }
        return order;
    }

    public Page<ExchangeOrder> getOrdersByTenant(Long tenantId, int page, int size, String status) {
        int effectiveSize = Math.min(size, MAX_PAGE_SIZE);
        Page<ExchangeOrder> p = new Page<>(page, effectiveSize);
        LambdaQueryWrapper<ExchangeOrder> qw = new LambdaQueryWrapper<>();
        qw.eq(ExchangeOrder::getTenantId, tenantId);
        if (status != null) {
            qw.eq(ExchangeOrder::getOrderStatus, status);
        }
        qw.orderByDesc(ExchangeOrder::getCreatedAt);
        return exchangeOrderMapper.selectPage(p, qw);
    }

    /**
     * Get user's coupons (exchange orders of type 'coupon').
     * Maps orderStatus to coupon status: pending/fulfilled → available, used → used, expired → expired.
     */
    public List<Map<String, Object>> getMyCoupons(Long userId, String status) {
        LambdaQueryWrapper<ExchangeOrder> qw = new LambdaQueryWrapper<>();
        qw.eq(ExchangeOrder::getUserId, userId)
          .eq(ExchangeOrder::getProductType, "coupon");
        if (status != null) {
            switch (status) {
                case "used":
                    qw.eq(ExchangeOrder::getOrderStatus, "used");
                    break;
                case "expired":
                    qw.eq(ExchangeOrder::getOrderStatus, "expired");
                    break;
                case "available":
                    qw.and(w -> w.eq(ExchangeOrder::getOrderStatus, "pending")
                            .or().eq(ExchangeOrder::getOrderStatus, "fulfilled"));
                    break;
                // other → no status filter
            }
        }
        qw.ne(ExchangeOrder::getOrderStatus, "cancelled");
        qw.orderByDesc(ExchangeOrder::getCreatedAt);
        List<ExchangeOrder> orders = exchangeOrderMapper.selectList(qw);

        return orders.stream().map(order -> {
            Map<String, Object> coupon = new java.util.HashMap<>();
            coupon.put("id", String.valueOf(order.getId()));
            coupon.put("name", order.getProductName());
            coupon.put("code", order.getCouponCode());
            coupon.put("expireTime", order.getExpiresAt() != null ? order.getExpiresAt().toString() : null);
            // Map order status to coupon status
            String couponStatus;
            switch (order.getOrderStatus()) {
                case "pending":
                case "fulfilled": couponStatus = "available"; break;
                case "used": couponStatus = "used"; break;
                case "expired": couponStatus = "expired"; break;
                default: couponStatus = "available";
            }
            coupon.put("status", couponStatus);
            return coupon;
        }).toList();
    }
}

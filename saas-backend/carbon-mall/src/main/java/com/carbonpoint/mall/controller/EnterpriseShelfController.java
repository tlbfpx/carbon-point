package com.carbonpoint.mall.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.system.entity.PlatformMallProductEntity;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.entity.TenantProductShelfEntity;
import com.carbonpoint.system.mapper.PlatformMallProductMapper;
import com.carbonpoint.system.mapper.TenantMapper;
import com.carbonpoint.system.mapper.TenantProductShelfMapper;
import com.carbonpoint.system.security.RequirePerm;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 企业商品货架管理控制器。
 * 企业管理员从平台商品池选购商品上架到自己的积分商城。
 */
@RestController
@RequestMapping("/api/enterprise/mall")
@RequiredArgsConstructor
public class EnterpriseShelfController {

    private final TenantProductShelfMapper shelfMapper;
    private final PlatformMallProductMapper platformMallProductMapper;
    private final TenantMapper tenantMapper;

    /**
     * 查看本企业货架上的商品列表。
     * GET /api/enterprise/mall/shelf
     */
    @GetMapping("/shelf")
    @RequirePerm("enterprise:product:list")
    public Result<Page<ShelfProductVO>> listShelf(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Integer shelfStatus) {
        Long tenantId = TenantContext.getTenantId();
        BigDecimal exchangeRate = getExchangeRate(tenantId);

        // Query shelf items
        Page<TenantProductShelfEntity> shelfPage = new Page<>(page, Math.min(size, 100));
        LambdaQueryWrapper<TenantProductShelfEntity> qw = new LambdaQueryWrapper<>();
        qw.eq(TenantProductShelfEntity::getTenantId, tenantId);
        if (shelfStatus != null) {
            qw.eq(TenantProductShelfEntity::getShelfStatus, shelfStatus);
        }
        qw.orderByDesc(TenantProductShelfEntity::getCreatedAt);
        shelfMapper.selectPage(shelfPage, qw);

        // Enrich with platform product details and compute display price
        Page<ShelfProductVO> result = new Page<>(shelfPage.getCurrent(), shelfPage.getSize(), shelfPage.getTotal());
        List<ShelfProductVO> voList = shelfPage.getRecords().stream().map(shelf -> {
            PlatformMallProductEntity product = platformMallProductMapper.selectById(shelf.getPlatformMallProductId());
            ShelfProductVO vo = new ShelfProductVO();
            vo.setId(shelf.getId());
            vo.setPlatformMallProductId(shelf.getPlatformMallProductId());
            vo.setShelfStatus(shelf.getShelfStatus());
            vo.setShelfAt(shelf.getShelfAt());
            vo.setCreatedAt(shelf.getCreatedAt());
            if (product != null) {
                vo.setName(product.getName());
                vo.setType(product.getType());
                vo.setDescription(product.getDescription());
                vo.setImageUrl(product.getImageUrl());
                vo.setFulfillmentConfig(product.getFulfillmentConfig());
                // Calculate display price in points
                int pointsPrice = exchangeRate.compareTo(BigDecimal.ZERO) > 0
                        ? new BigDecimal(product.getPriceCents()).divide(exchangeRate, 0, RoundingMode.HALF_UP).intValue()
                        : product.getPriceCents();
                vo.setPointsPrice(pointsPrice);
                vo.setBasePriceCents(product.getPriceCents());
            }
            return vo;
        }).collect(Collectors.toList());
        result.setRecords(voList);
        return Result.success(result);
    }

    /**
     * 将平台商品上架到本企业商城。
     * POST /api/enterprise/mall/shelf
     */
    @PostMapping("/shelf")
    @RequirePerm("enterprise:product:create")
    public Result<TenantProductShelfEntity> addShelfItem(@RequestBody ShelfAddRequest req) {
        Long tenantId = TenantContext.getTenantId();

        // Verify platform product exists and is active
        PlatformMallProductEntity product = platformMallProductMapper.selectById(req.getPlatformMallProductId());
        if (product == null || product.getStatus() != 1) {
            throw new BusinessException(ErrorCode.MALL_PRODUCT_NOT_FOUND);
        }

        // Check if already on shelf
        LambdaQueryWrapper<TenantProductShelfEntity> exists = new LambdaQueryWrapper<>();
        exists.eq(TenantProductShelfEntity::getTenantId, tenantId)
              .eq(TenantProductShelfEntity::getPlatformMallProductId, req.getPlatformMallProductId());
        if (shelfMapper.selectCount(exists) > 0) {
            return Result.error("MALL007", "该商品已在货架中");
        }

        TenantProductShelfEntity shelf = new TenantProductShelfEntity();
        shelf.setTenantId(tenantId);
        shelf.setPlatformMallProductId(req.getPlatformMallProductId());
        shelf.setShelfStatus(1);
        shelf.setShelfAt(LocalDateTime.now());
        shelf.setCreatedAt(LocalDateTime.now());
        shelfMapper.insert(shelf);
        return Result.success(shelf);
    }

    /**
     * 从本企业货架下架商品。
     * DELETE /api/enterprise/mall/shelf/{id}
     */
    @DeleteMapping("/shelf/{id}")
    @RequirePerm("enterprise:product:delete")
    public Result<Void> removeShelfItem(@PathVariable Long id) {
        Long tenantId = TenantContext.getTenantId();
        TenantProductShelfEntity shelf = shelfMapper.selectById(id);
        if (shelf == null || !shelf.getTenantId().equals(tenantId)) {
            throw new BusinessException(ErrorCode.MALL_PRODUCT_NOT_FOUND);
        }
        shelf.setShelfStatus(0);
        shelfMapper.updateById(shelf);
        return Result.success();
    }

    /**
     * 查看平台商品池中可供选购的商品列表（排除已上架的）。
     * GET /api/enterprise/mall/available
     */
    @GetMapping("/available")
    @RequirePerm("enterprise:product:list")
    public Result<List<AvailableProductVO>> listAvailable() {
        Long tenantId = TenantContext.getTenantId();
        BigDecimal exchangeRate = getExchangeRate(tenantId);

        // Get already shelved product IDs
        LambdaQueryWrapper<TenantProductShelfEntity> shelfQw = new LambdaQueryWrapper<>();
        shelfQw.eq(TenantProductShelfEntity::getTenantId, tenantId)
                .eq(TenantProductShelfEntity::getShelfStatus, 1);
        List<Long> shelvedProductIds = shelfMapper.selectList(shelfQw).stream()
                .map(TenantProductShelfEntity::getPlatformMallProductId)
                .collect(Collectors.toList());

        // Query platform products not on shelf
        LambdaQueryWrapper<PlatformMallProductEntity> qw = new LambdaQueryWrapper<>();
        qw.eq(PlatformMallProductEntity::getStatus, 1);
        if (!shelvedProductIds.isEmpty()) {
            qw.notIn(PlatformMallProductEntity::getId, shelvedProductIds);
        }
        qw.orderByDesc(PlatformMallProductEntity::getCreatedAt);

        List<AvailableProductVO> voList = platformMallProductMapper.selectList(qw).stream()
                .map(product -> {
                    AvailableProductVO vo = new AvailableProductVO();
                    vo.setId(product.getId());
                    vo.setName(product.getName());
                    vo.setType(product.getType());
                    vo.setDescription(product.getDescription());
                    vo.setImageUrl(product.getImageUrl());
                    vo.setBasePriceCents(product.getPriceCents());
                    int pointsPrice = exchangeRate.compareTo(BigDecimal.ZERO) > 0
                            ? new BigDecimal(product.getPriceCents()).divide(exchangeRate, 0, RoundingMode.HALF_UP).intValue()
                            : product.getPriceCents();
                    vo.setPointsPrice(pointsPrice);
                    return vo;
                }).collect(Collectors.toList());

        return Result.success(voList);
    }

    /**
     * 获取本企业的积分兑换汇率。
     * GET /api/enterprise/mall/exchange-rate
     */
    @GetMapping("/exchange-rate")
    @RequirePerm("enterprise:product:list")
    public Result<ExchangeRateVO> getExchangeRate() {
        Long tenantId = TenantContext.getTenantId();
        BigDecimal rate = getExchangeRate(tenantId);
        ExchangeRateVO vo = new ExchangeRateVO();
        vo.setTenantId(tenantId);
        vo.setPointsExchangeRate(rate);
        return Result.success(vo);
    }

    /**
     * 更新本企业的积分兑换汇率。
     * PUT /api/enterprise/mall/exchange-rate
     */
    @PutMapping("/exchange-rate")
    @RequirePerm("enterprise:product:edit")
    public Result<ExchangeRateVO> updateExchangeRate(@RequestBody ExchangeRateUpdateRequest req) {
        Long tenantId = TenantContext.getTenantId();
        Tenant tenant = tenantMapper.selectById(tenantId);
        if (tenant == null) {
            throw new BusinessException(ErrorCode.TENANT_NOT_FOUND);
        }
        if (req.getPointsExchangeRate() == null || req.getPointsExchangeRate().compareTo(BigDecimal.ZERO) <= 0) {
            return Result.error("SYSTEM002", "兑换汇率必须大于0");
        }
        tenant.setPointsExchangeRate(req.getPointsExchangeRate());
        tenantMapper.updateById(tenant);

        ExchangeRateVO vo = new ExchangeRateVO();
        vo.setTenantId(tenantId);
        vo.setPointsExchangeRate(req.getPointsExchangeRate());
        return Result.success(vo);
    }

    private BigDecimal getExchangeRate(Long tenantId) {
        Tenant tenant = tenantMapper.selectById(tenantId);
        if (tenant != null && tenant.getPointsExchangeRate() != null) {
            return tenant.getPointsExchangeRate();
        }
        return BigDecimal.ONE;
    }

    // ── DTO inner classes ──────────────────────────────────────────────────────

    @Data
    public static class ShelfProductVO {
        private Long id;
        private Long platformMallProductId;
        private String name;
        private String type;
        private String description;
        private String imageUrl;
        private String fulfillmentConfig;
        private Integer basePriceCents;
        /** 展示积分价格（基于企业兑换汇率计算） */
        private Integer pointsPrice;
        private Integer shelfStatus;
        private LocalDateTime shelfAt;
        private LocalDateTime createdAt;
    }

    @Data
    public static class AvailableProductVO {
        private Long id;
        private String name;
        private String type;
        private String description;
        private String imageUrl;
        private Integer basePriceCents;
        /** 展示积分价格 */
        private Integer pointsPrice;
    }

    @Data
    public static class ExchangeRateVO {
        private Long tenantId;
        private BigDecimal pointsExchangeRate;
    }

    @Data
    public static class ShelfAddRequest {
        private Long platformMallProductId;
    }

    @Data
    public static class ExchangeRateUpdateRequest {
        private BigDecimal pointsExchangeRate;
    }
}

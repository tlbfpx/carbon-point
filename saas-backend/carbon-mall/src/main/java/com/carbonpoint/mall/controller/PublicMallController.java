package com.carbonpoint.mall.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.system.entity.PlatformMallProductEntity;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.entity.TenantProductShelfEntity;
import com.carbonpoint.system.mapper.PlatformMallProductMapper;
import com.carbonpoint.system.mapper.TenantMapper;
import com.carbonpoint.system.mapper.TenantProductShelfMapper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 商城公开控制器 - 供H5用户端调用。
 * 不需要管理员权限，用户登录后可以访问。
 */
@RestController
@RequestMapping("/api/mall")
@RequiredArgsConstructor
public class PublicMallController {

    private final TenantProductShelfMapper shelfMapper;
    private final PlatformMallProductMapper platformMallProductMapper;
    private final TenantMapper tenantMapper;

    /**
     * 获取当前企业货架上的可购买商品列表（H5端首页用）。
     * GET /api/mall/products
     */
    @GetMapping("/products")
    public Result<List<PublicProductVO>> listProducts(
            @RequestParam(required = false) String type) {
        Long tenantId = TenantContext.getTenantId();
        BigDecimal exchangeRate = getExchangeRate(tenantId);

        // 查询货架上已上架的商品
        LambdaQueryWrapper<TenantProductShelfEntity> qw = new LambdaQueryWrapper<>();
        qw.eq(TenantProductShelfEntity::getTenantId, tenantId);
        qw.eq(TenantProductShelfEntity::getShelfStatus, 1);
        qw.orderByDesc(TenantProductShelfEntity::getShelfAt);
        List<TenantProductShelfEntity> shelfItems = shelfMapper.selectList(qw);

        // 组装返回数据
        List<PublicProductVO> products = shelfItems.stream().map(shelf -> {
            PlatformMallProductEntity product = platformMallProductMapper.selectById(shelf.getPlatformMallProductId());
            if (product == null) {
                return null;
            }
            // 按类型过滤（可选）
            if (type != null && !type.isEmpty() && !type.equals(product.getType())) {
                return null;
            }
            PublicProductVO vo = new PublicProductVO();
            vo.setId(String.valueOf(shelf.getId()));
            vo.setShelfId(shelf.getId());
            vo.setPlatformMallProductId(shelf.getPlatformMallProductId());
            vo.setName(product.getName());
            vo.setType(product.getType());
            vo.setDescription(product.getDescription());
            vo.setImageUrl(product.getImageUrl());
            // 计算积分价格
            int pointsPrice = exchangeRate.compareTo(BigDecimal.ZERO) > 0
                    ? new BigDecimal(product.getPriceCents()).divide(exchangeRate, 0, RoundingMode.HALF_UP).intValue()
                    : product.getPriceCents();
            vo.setPointsPrice(pointsPrice);
            // 库存暂时返回null或固定值（新架构暂不处理库存）
            vo.setStock(null);
            return vo;
        }).filter(item -> item != null).collect(Collectors.toList());

        return Result.success(products);
    }

    /**
     * 获取商品详情（H5端商品详情页用）。
     * GET /api/mall/products/{id}
     */
    @GetMapping("/products/{id}")
    public Result<PublicProductVO> getProductDetail(@PathVariable Long id) {
        Long tenantId = TenantContext.getTenantId();
        BigDecimal exchangeRate = getExchangeRate(tenantId);

        TenantProductShelfEntity shelf = shelfMapper.selectById(id);
        if (shelf == null || !shelf.getTenantId().equals(tenantId) || shelf.getShelfStatus() != 1) {
            return Result.error("MALL001", "商品不存在或已下架");
        }

        PlatformMallProductEntity product = platformMallProductMapper.selectById(shelf.getPlatformMallProductId());
        if (product == null) {
            return Result.error("MALL001", "商品不存在或已下架");
        }

        PublicProductVO vo = new PublicProductVO();
        vo.setId(String.valueOf(shelf.getId()));
        vo.setShelfId(shelf.getId());
        vo.setPlatformMallProductId(shelf.getPlatformMallProductId());
        vo.setName(product.getName());
        vo.setType(product.getType());
        vo.setDescription(product.getDescription());
        vo.setImageUrl(product.getImageUrl());
        int pointsPrice = exchangeRate.compareTo(BigDecimal.ZERO) > 0
                ? new BigDecimal(product.getPriceCents()).divide(exchangeRate, 0, RoundingMode.HALF_UP).intValue()
                : product.getPriceCents();
        vo.setPointsPrice(pointsPrice);
        vo.setStock(null);
        vo.setFulfillmentConfig(product.getFulfillmentConfig());

        return Result.success(vo);
    }

    private BigDecimal getExchangeRate(Long tenantId) {
        Tenant tenant = tenantMapper.selectById(tenantId);
        if (tenant != null && tenant.getPointsExchangeRate() != null) {
            return tenant.getPointsExchangeRate();
        }
        return BigDecimal.ONE;
    }

    @Data
    public static class PublicProductVO {
        private String id;
        private Long shelfId;
        private Long platformMallProductId;
        private String name;
        private String type;
        private String description;
        private String imageUrl;
        private Integer pointsPrice;
        private Integer stock;
        private String fulfillmentConfig;
    }
}

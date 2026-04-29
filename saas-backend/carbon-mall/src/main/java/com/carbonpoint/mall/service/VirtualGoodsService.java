package com.carbonpoint.mall.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.mall.dto.ProductCreateDTO;
import com.carbonpoint.mall.entity.VirtualGoods;
import com.carbonpoint.mall.mapper.VirtualGoodsMapper;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.mapper.TenantMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class VirtualGoodsService {

    private static final int MAX_PAGE_SIZE = 100;
    private final VirtualGoodsMapper virtualGoodsMapper;
    private final TenantMapper tenantMapper;

    @Transactional
    public VirtualGoods create(ProductCreateDTO dto) {
        VirtualGoods virtualGoods = new VirtualGoods();
        virtualGoods.setTenantId(TenantContext.getTenantId());
        virtualGoods.setName(dto.getName());
        virtualGoods.setDescription(dto.getDescription());
        virtualGoods.setImage(dto.getImage());
        virtualGoods.setType(dto.getType());
        virtualGoods.setPointsPrice(dto.getPointsPrice());
        virtualGoods.setStock(dto.getStock());
        virtualGoods.setMaxPerUser(dto.getMaxPerUser());
        virtualGoods.setValidityDays(dto.getValidityDays() != null ? dto.getValidityDays() : 30);
        virtualGoods.setFulfillmentConfig(dto.getFulfillmentConfig());
        virtualGoods.setStatus("inactive");
        virtualGoods.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : 0);
        virtualGoods.setCreatedAt(LocalDateTime.now());
        virtualGoods.setUpdatedAt(LocalDateTime.now());
        virtualGoodsMapper.insert(virtualGoods);
        log.info("createVirtualGoods: id={}, name={}", virtualGoods.getId(), virtualGoods.getName());
        return virtualGoods;
    }

    @Transactional
    public VirtualGoods update(Long id, ProductCreateDTO dto) {
        VirtualGoods virtualGoods = virtualGoodsMapper.selectById(id);
        if (virtualGoods == null) {
            throw new BusinessException(ErrorCode.MALL_PRODUCT_NOT_FOUND);
        }
        if (!virtualGoods.getTenantId().equals(TenantContext.getTenantId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        if (dto.getName() != null) virtualGoods.setName(dto.getName());
        if (dto.getDescription() != null) virtualGoods.setDescription(dto.getDescription());
        if (dto.getImage() != null) virtualGoods.setImage(dto.getImage());
        if (dto.getType() != null) virtualGoods.setType(dto.getType());
        if (dto.getPointsPrice() != null) virtualGoods.setPointsPrice(dto.getPointsPrice());
        if (dto.getStock() != null) virtualGoods.setStock(dto.getStock());
        if (dto.getMaxPerUser() != null) virtualGoods.setMaxPerUser(dto.getMaxPerUser());
        if (dto.getValidityDays() != null) virtualGoods.setValidityDays(dto.getValidityDays());
        if (dto.getFulfillmentConfig() != null) virtualGoods.setFulfillmentConfig(dto.getFulfillmentConfig());
        if (dto.getSortOrder() != null) virtualGoods.setSortOrder(dto.getSortOrder());
        virtualGoods.setUpdatedAt(LocalDateTime.now());
        virtualGoodsMapper.updateById(virtualGoods);
        return virtualGoods;
    }

    @Transactional
    public void delete(Long id) {
        VirtualGoods virtualGoods = virtualGoodsMapper.selectById(id);
        if (virtualGoods == null) {
            throw new BusinessException(ErrorCode.MALL_PRODUCT_NOT_FOUND);
        }
        if (!virtualGoods.getTenantId().equals(TenantContext.getTenantId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        virtualGoodsMapper.deleteById(id);
        log.info("deleteVirtualGoods: id={}", id);
    }

    @Transactional
    public VirtualGoods toggleStatus(Long id) {
        VirtualGoods virtualGoods = virtualGoodsMapper.selectById(id);
        if (virtualGoods == null) {
            throw new BusinessException(ErrorCode.MALL_PRODUCT_NOT_FOUND);
        }
        if (!virtualGoods.getTenantId().equals(TenantContext.getTenantId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        if ("inactive".equals(virtualGoods.getStatus())) {
            virtualGoods.setStatus("active");
        } else if ("active".equals(virtualGoods.getStatus())) {
            virtualGoods.setStatus("inactive");
        } else if ("sold_out".equals(virtualGoods.getStatus())) {
            virtualGoods.setStatus("active");
        }
        virtualGoods.setUpdatedAt(LocalDateTime.now());
        virtualGoodsMapper.updateById(virtualGoods);
        log.info("toggleStatus: id={}, newStatus={}", id, virtualGoods.getStatus());
        return virtualGoods;
    }

    @Transactional
    public int updateStock(Long id, int delta) {
        VirtualGoods virtualGoods = virtualGoodsMapper.selectById(id);
        if (virtualGoods == null) {
            throw new BusinessException(ErrorCode.MALL_PRODUCT_NOT_FOUND);
        }
        if (virtualGoods.getStock() == -1) {
            return -1; // unlimited
        }
        int newStock = virtualGoods.getStock() + delta;
        if (newStock < 0) {
            throw new BusinessException(ErrorCode.MALL_PRODUCT_STOCK_EMPTY);
        }
        virtualGoods.setStock(newStock);
        if (newStock == 0) {
            virtualGoods.setStatus("sold_out");
        }
        virtualGoods.setUpdatedAt(LocalDateTime.now());
        virtualGoodsMapper.updateById(virtualGoods);
        return newStock;
    }

    public Page<VirtualGoods> list(Long tenantId, int page, int size, String status, String type) {
        int effectiveSize = Math.min(size, MAX_PAGE_SIZE);
        Page<VirtualGoods> p = new Page<>(page, effectiveSize);
        LambdaQueryWrapper<VirtualGoods> qw = new LambdaQueryWrapper<>();
        qw.eq(tenantId != null, VirtualGoods::getTenantId, tenantId);
        if (status != null && !status.isBlank()) {
            qw.eq(VirtualGoods::getStatus, status);
        }
        if (type != null && !type.isBlank()) {
            qw.eq(VirtualGoods::getType, type);
        }
        qw.orderByAsc(VirtualGoods::getSortOrder).orderByDesc(VirtualGoods::getCreatedAt);
        return virtualGoodsMapper.selectPage(p, qw);
    }

    public VirtualGoods getById(Long id) {
        VirtualGoods virtualGoods = virtualGoodsMapper.selectById(id);
        if (virtualGoods == null) {
            throw new BusinessException(ErrorCode.MALL_PRODUCT_NOT_FOUND);
        }
        return virtualGoods;
    }

    /**
     * 根据租户的积分兑换汇率计算商品展示积分价格。
     * pointsPrice = basePriceCents / exchangeRate
     * 如果 exchangeRate 未设置或为0/负数，默认为1.0。
     *
     * @param basePriceCents 基准价格（分）
     * @param tenantId       租户ID
     * @return 展示积分价格
     */
    public int calculateDisplayPrice(int basePriceCents, Long tenantId) {
        BigDecimal exchangeRate = getExchangeRate(tenantId);
        return new BigDecimal(basePriceCents)
                .divide(exchangeRate, 0, RoundingMode.HALF_UP)
                .intValue();
    }

    /**
     * 获取租户的积分兑换汇率，默认1.0。
     */
    private BigDecimal getExchangeRate(Long tenantId) {
        if (tenantId == null) {
            return BigDecimal.ONE;
        }
        Tenant tenant = tenantMapper.selectById(tenantId);
        if (tenant != null && tenant.getPointsExchangeRate() != null
                && tenant.getPointsExchangeRate().compareTo(BigDecimal.ZERO) > 0) {
            return tenant.getPointsExchangeRate();
        }
        return BigDecimal.ONE;
    }
}

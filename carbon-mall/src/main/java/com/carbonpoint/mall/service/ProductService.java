package com.carbonpoint.mall.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.mall.dto.ProductCreateDTO;
import com.carbonpoint.mall.entity.Product;
import com.carbonpoint.mall.mapper.MallProductMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductService {

    private static final int MAX_PAGE_SIZE = 100;
    private final MallProductMapper productMapper;

    @Transactional
    public Product create(ProductCreateDTO dto) {
        Product product = new Product();
        product.setTenantId(TenantContext.getTenantId());
        product.setName(dto.getName());
        product.setDescription(dto.getDescription());
        product.setImage(dto.getImage());
        product.setType(dto.getType());
        product.setPointsPrice(dto.getPointsPrice());
        product.setStock(dto.getStock());
        product.setMaxPerUser(dto.getMaxPerUser());
        product.setValidityDays(dto.getValidityDays() != null ? dto.getValidityDays() : 30);
        product.setFulfillmentConfig(dto.getFulfillmentConfig());
        product.setStatus("inactive");
        product.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : 0);
        product.setCreatedAt(LocalDateTime.now());
        product.setUpdatedAt(LocalDateTime.now());
        productMapper.insert(product);
        log.info("createProduct: id={}, name={}", product.getId(), product.getName());
        return product;
    }

    @Transactional
    public Product update(Long id, ProductCreateDTO dto) {
        Product product = productMapper.selectById(id);
        if (product == null) {
            throw new BusinessException(ErrorCode.MALL_PRODUCT_NOT_FOUND);
        }
        if (!product.getTenantId().equals(TenantContext.getTenantId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        if (dto.getName() != null) product.setName(dto.getName());
        if (dto.getDescription() != null) product.setDescription(dto.getDescription());
        if (dto.getImage() != null) product.setImage(dto.getImage());
        if (dto.getType() != null) product.setType(dto.getType());
        if (dto.getPointsPrice() != null) product.setPointsPrice(dto.getPointsPrice());
        if (dto.getStock() != null) product.setStock(dto.getStock());
        if (dto.getMaxPerUser() != null) product.setMaxPerUser(dto.getMaxPerUser());
        if (dto.getValidityDays() != null) product.setValidityDays(dto.getValidityDays());
        if (dto.getFulfillmentConfig() != null) product.setFulfillmentConfig(dto.getFulfillmentConfig());
        if (dto.getSortOrder() != null) product.setSortOrder(dto.getSortOrder());
        product.setUpdatedAt(LocalDateTime.now());
        productMapper.updateById(product);
        return product;
    }

    @Transactional
    public void delete(Long id) {
        Product product = productMapper.selectById(id);
        if (product == null) {
            throw new BusinessException(ErrorCode.MALL_PRODUCT_NOT_FOUND);
        }
        if (!product.getTenantId().equals(TenantContext.getTenantId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        productMapper.deleteById(id);
        log.info("deleteProduct: id={}", id);
    }

    @Transactional
    public Product toggleStatus(Long id) {
        Product product = productMapper.selectById(id);
        if (product == null) {
            throw new BusinessException(ErrorCode.MALL_PRODUCT_NOT_FOUND);
        }
        if (!product.getTenantId().equals(TenantContext.getTenantId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        if ("inactive".equals(product.getStatus())) {
            product.setStatus("active");
        } else if ("active".equals(product.getStatus())) {
            product.setStatus("inactive");
        } else if ("sold_out".equals(product.getStatus())) {
            product.setStatus("active");
        }
        product.setUpdatedAt(LocalDateTime.now());
        productMapper.updateById(product);
        log.info("toggleStatus: id={}, newStatus={}", id, product.getStatus());
        return product;
    }

    @Transactional
    public int updateStock(Long id, int delta) {
        Product product = productMapper.selectById(id);
        if (product == null) {
            throw new BusinessException(ErrorCode.MALL_PRODUCT_NOT_FOUND);
        }
        if (product.getStock() == -1) {
            return -1; // unlimited
        }
        int newStock = product.getStock() + delta;
        if (newStock < 0) {
            throw new BusinessException(ErrorCode.MALL_PRODUCT_STOCK_EMPTY);
        }
        product.setStock(newStock);
        if (newStock == 0) {
            product.setStatus("sold_out");
        }
        product.setUpdatedAt(LocalDateTime.now());
        productMapper.updateById(product);
        return newStock;
    }

    public Page<Product> list(Long tenantId, int page, int size, String status, String type) {
        int effectiveSize = Math.min(size, MAX_PAGE_SIZE);
        Page<Product> p = new Page<>(page, effectiveSize);
        LambdaQueryWrapper<Product> qw = new LambdaQueryWrapper<>();
        qw.eq(tenantId != null, Product::getTenantId, tenantId);
        if (status != null && !status.isBlank()) {
            qw.eq(Product::getStatus, status);
        }
        if (type != null && !type.isBlank()) {
            qw.eq(Product::getType, type);
        }
        qw.orderByAsc(Product::getSortOrder).orderByDesc(Product::getCreatedAt);
        return productMapper.selectPage(p, qw);
    }

    public Product getById(Long id) {
        Product product = productMapper.selectById(id);
        if (product == null) {
            throw new BusinessException(ErrorCode.MALL_PRODUCT_NOT_FOUND);
        }
        return product;
    }
}

package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.system.dto.res.TenantProductRes;
import com.carbonpoint.system.entity.*;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.service.TenantProductService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TenantProductServiceImpl implements TenantProductService {

    private final TenantMapper tenantMapper;
    private final PackageProductMapper packageProductMapper;
    private final PackageProductFeatureMapper packageProductFeatureMapper;
    private final ProductMapper productMapper;
    private final ProductFeatureMapper productFeatureMapper;

    @Override
    public List<TenantProductRes> getTenantProducts(Long tenantId) {
        // 1. Get tenant and resolve package_id
        Tenant tenant = tenantMapper.selectByIdForPlatform(tenantId);
        if (tenant == null) {
            throw new BusinessException(ErrorCode.TENANT_NOT_FOUND);
        }

        if (tenant.getPackageId() == null) {
            return Collections.emptyList();
        }

        Long packageId = tenant.getPackageId();

        // 2. Get package-product associations
        List<PackageProductEntity> packageProducts = packageProductMapper.selectByPackageId(packageId);
        if (packageProducts.isEmpty()) {
            return Collections.emptyList();
        }

        // 3. Build product response list
        List<TenantProductRes> result = new ArrayList<>();
        for (PackageProductEntity pp : packageProducts) {
            ProductEntity product = productMapper.selectById(pp.getProductId());
            if (product == null || product.getStatus() == null || product.getStatus() != 1) {
                continue;
            }

            // 4. Get enabled features for this product in the package
            List<PackageProductFeatureEntity> ppfList = packageProductFeatureMapper
                    .selectByPackageIdAndProductId(packageId, pp.getProductId());

            Map<String, String> featureConfig = new LinkedHashMap<>();
            for (PackageProductFeatureEntity ppf : ppfList) {
                if (Boolean.TRUE.equals(ppf.getIsEnabled())) {
                    String value = ppf.getConfigValue() != null ? ppf.getConfigValue() : "";
                    featureConfig.put(ppf.getFeatureId(), value);
                }
            }

            result.add(TenantProductRes.builder()
                    .productId(product.getId())
                    .productCode(product.getCode())
                    .productName(product.getName())
                    .category(product.getCategory())
                    .featureConfig(featureConfig)
                    .build());
        }

        return result;
    }
}

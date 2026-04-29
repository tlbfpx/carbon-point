package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.system.dto.req.PackageFeaturesUpdateReq;
import com.carbonpoint.system.dto.res.PackageDetailRes;
import com.carbonpoint.system.dto.res.PackageFeatureRes;
import com.carbonpoint.system.dto.res.PackageProductRes;
import com.carbonpoint.system.dto.res.PackageRes;
import com.carbonpoint.system.entity.FeatureEntity;
import com.carbonpoint.system.entity.PackagePlatformProduct;
import com.carbonpoint.system.entity.PackagePlatformProductFeature;
import com.carbonpoint.system.entity.PermissionPackage;
import com.carbonpoint.system.entity.PlatformProduct;
import com.carbonpoint.system.entity.PlatformProductFeature;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.service.PackagePlatformProductService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Implementation of PackagePlatformProductService.
 * Handles all package-product and package-product-feature related operations.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PackagePlatformProductServiceImpl implements PackagePlatformProductService {

    private final PermissionPackageMapper packageMapper;
    private final PackagePlatformProductMapper packagePlatformProductMapper;
    private final PackagePlatformProductFeatureMapper packagePlatformProductFeatureMapper;
    private final PlatformProductMapper platformProductMapper;
    private final PlatformProductFeatureMapper platformProductFeatureMapper;
    private final FeatureMapper featureMapper;

    @Override
    public PackageDetailRes getPackageDetail(Long packageId) {
        PermissionPackage pkg = packageMapper.selectById(packageId);
        if (pkg == null) {
            throw new BusinessException(ErrorCode.PACKAGE_NOT_FOUND);
        }

        List<PackagePlatformProduct> packageProducts = packagePlatformProductMapper.selectByPackageId(packageId);
        List<PackageProductRes> productResList = new ArrayList<>();

        for (PackagePlatformProduct pp : packageProducts) {
            PlatformProduct product = platformProductMapper.selectById(pp.getProductId());
            if (product == null) {
                continue;
            }

            List<PackagePlatformProductFeature> ppfList = packagePlatformProductFeatureMapper
                    .selectByPackageIdAndProductId(packageId, pp.getProductId());
            List<PackageFeatureRes> featureResList = buildFeatureResList(pp.getProductId(), ppfList);

            productResList.add(PackageProductRes.builder()
                    .productId(product.getId())
                    .productCode(product.getCode())
                    .productName(product.getName())
                    .productCategory(product.getCategory())
                    .productStatus(product.getStatus())
                    .sortOrder(pp.getSortOrder())
                    .features(featureResList)
                    .createdAt(pp.getCreatedAt())
                    .build());
        }

        return PackageDetailRes.builder()
                .id(pkg.getId())
                .code(pkg.getCode())
                .name(pkg.getName())
                .description(pkg.getDescription())
                .status(pkg.getStatus())
                .maxUsers(pkg.getMaxUsers())
                .createdAt(pkg.getCreatedAt())
                .updatedAt(pkg.getUpdatedAt())
                .products(productResList)
                .tenantCount(packageMapper.countTenantsByPackageId(packageId))
                .build();
    }

    @Override
    @Transactional
    public void updatePackageFeatures(Long packageId, PackageFeaturesUpdateReq req) {
        log.info("Updating package features: packageId={}", packageId);

        PermissionPackage pkg = packageMapper.selectById(packageId);
        if (pkg == null) {
            throw new BusinessException(ErrorCode.PACKAGE_NOT_FOUND);
        }

        if (req.getProducts() == null || req.getProducts().isEmpty()) {
            log.info("No products in request, clearing all package-product-feature configs");
            packagePlatformProductFeatureMapper.deleteByPackageId(packageId);
            return;
        }

        for (PackageFeaturesUpdateReq.ProductFeatureItem productItem : req.getProducts()) {
            String productCode = productItem.getProductCode();
            log.info("Processing product: productCode={}", productCode);

            PlatformProduct product = platformProductMapper.selectByCode(productCode);
            if (product == null) {
                log.warn("Product not found: productCode={}", productCode);
                continue;
            }
            String productId = product.getId();

            log.info("Clearing existing feature configs: packageId={}, productId={}", packageId, productId);
            packagePlatformProductFeatureMapper.deleteByPackageIdAndProductId(packageId, productId);

            ensurePackageProductAssociationExists(packageId, productId);

            if (productItem.getFeatures() != null && !productItem.getFeatures().isEmpty()) {
                List<PackagePlatformProductFeature> features = new ArrayList<>();
                for (PackageFeaturesUpdateReq.FeatureItem fi : productItem.getFeatures()) {
                    FeatureEntity feature = featureMapper.selectByCode(fi.getFeatureCode());
                    if (feature == null) {
                        log.warn("Feature not found: featureCode={}", fi.getFeatureCode());
                        continue;
                    }

                    PackagePlatformProductFeature ppf = new PackagePlatformProductFeature();
                    ppf.setPackageId(packageId);
                    ppf.setProductId(productId);
                    ppf.setFeatureId(feature.getId());
                    ppf.setConfigValue(fi.getConfigValue());
                    ppf.setIsEnabled(fi.getIsEnabled() != null ? fi.getIsEnabled() : true);
                    ppf.setIsCustomized(determineIsCustomized(productId, feature.getId(), fi.getConfigValue()));
                    features.add(ppf);
                }
                if (!features.isEmpty()) {
                    log.info("Batch inserting {} feature configs", features.size());
                    packagePlatformProductFeatureMapper.batchInsert(features);
                }
            }
        }

        log.info("Package features updated successfully: packageId={}", packageId);
    }

    private List<PackageFeatureRes> buildFeatureResList(String productId, List<PackagePlatformProductFeature> ppfList) {
        List<PlatformProductFeature> productFeatures = platformProductFeatureMapper.selectByProductId(productId);

        if (ppfList.isEmpty()) {
            if (productFeatures.isEmpty()) {
                return Collections.emptyList();
            }
            Map<String, Feature> featureMap = loadFeatureEntities(productFeatures);
            return productFeatures.stream()
                    .map(pf -> {
                        FeatureEntity feature = featureMap.get(pf.getFeatureId());
                        return PackageFeatureRes.builder()
                                .featureId(pf.getFeatureId())
                                .featureCode(feature != null ? feature.getCode() : null)
                                .featureName(feature != null ? feature.getName() : null)
                                .featureType(feature != null ? feature.getType() : null)
                                .valueType(feature != null ? feature.getValueType() : null)
                                .configValue(pf.getConfigValue())
                                .isEnabled(pf.getIsEnabled() != null ? pf.getIsEnabled() : true)
                                .isCustomized(false)
                                .productDefaultValue(pf.getConfigValue())
                                .systemDefaultValue(feature != null ? feature.getDefaultValue() : null)
                                .build();
                    })
                    .toList();
        }

        Map<String, PlatformProductFeature> productFeatureMap = productFeatures.stream()
                .collect(Collectors.toMap(PlatformProductFeature::getFeatureId, pf -> pf));

        Map<String, Feature> featureMap = loadFeatureEntities(productFeatures);

        return ppfList.stream()
                .map(ppf -> {
                    PlatformProductFeature pf = productFeatureMap.get(ppf.getFeatureId());
                    FeatureEntity feature = featureMap.get(ppf.getFeatureId());
                    return PackageFeatureRes.builder()
                            .featureId(ppf.getFeatureId())
                            .featureCode(feature != null ? feature.getCode() : null)
                            .featureName(feature != null ? feature.getName() : null)
                            .featureType(feature != null ? feature.getType() : null)
                            .valueType(feature != null ? feature.getValueType() : null)
                            .configValue(ppf.getConfigValue())
                            .isEnabled(ppf.getIsEnabled())
                            .isCustomized(ppf.getIsCustomized())
                            .productDefaultValue(pf != null ? pf.getConfigValue() : null)
                            .systemDefaultValue(feature != null ? feature.getDefaultValue() : null)
                            .createdAt(ppf.getCreatedAt())
                            .updatedAt(ppf.getUpdatedAt())
                            .build();
                })
                .toList();
    }

    private Map<String, FeatureEntity> loadFeatureEntities(List<PlatformProductFeature> productFeatures) {
        List<String> featureIds = productFeatures.stream()
                .map(PlatformProductFeature::getFeatureId)
                .distinct()
                .toList();
        if (featureIds.isEmpty()) {
            return Collections.emptyMap();
        }
        List<FeatureEntity> features = featureIds.stream()
                .map(id -> {
                    LambdaQueryWrapper<FeatureEntity> wrapper = new LambdaQueryWrapper<>();
                    wrapper.eq(FeatureEntity::getId, id);
                    return featureMapper.selectOne(wrapper);
                })
                .filter(Objects::nonNull)
                .toList();
        return features.stream()
                .collect(Collectors.toMap(FeatureEntity::getId, f -> f));
    }

    private Boolean determineIsCustomized(String productId, String featureId, String configValue) {
        PlatformProductFeature pf = platformProductFeatureMapper.selectByProductIdAndFeatureId(productId, featureId);
        if (pf == null || pf.getConfigValue() == null) {
            return false;
        }
        return !Objects.equals(pf.getConfigValue(), configValue);
    }

    private void ensurePackageProductAssociationExists(Long packageId, String productId) {
        PackagePlatformProduct existing = packagePlatformProductMapper.selectByPackageIdAndProductId(packageId, productId);
        if (existing == null) {
            PackagePlatformProduct newAssociation = new PackagePlatformProduct();
            newAssociation.setPackageId(packageId);
            newAssociation.setProductId(productId);
            newAssociation.setSortOrder(0);
            packagePlatformProductMapper.insert(newAssociation);
            log.info("Created package-product association: packageId={}, productId={}", packageId, productId);
        }
    }
}

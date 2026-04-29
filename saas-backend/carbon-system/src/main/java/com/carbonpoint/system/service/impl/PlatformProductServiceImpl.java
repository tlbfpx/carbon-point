package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.system.dto.req.ProductCreateReq;
import com.carbonpoint.system.dto.req.ProductFeatureUpdateReq;
import com.carbonpoint.system.dto.req.ProductUpdateReq;
import com.carbonpoint.system.dto.res.PageRes;
import com.carbonpoint.system.dto.res.ProductFeatureRes;
import com.carbonpoint.system.dto.res.ProductPackageBriefRes;
import com.carbonpoint.system.dto.res.ProductRes;
import com.carbonpoint.system.entity.FeatureEntity;
import com.carbonpoint.system.entity.PackagePlatformProduct;
import com.carbonpoint.system.entity.PermissionPackage;
import com.carbonpoint.system.entity.PlatformProduct;
import com.carbonpoint.system.entity.PlatformProductFeature;
import com.carbonpoint.system.mapper.FeatureMapper;
import com.carbonpoint.system.mapper.PackagePlatformProductMapper;
import com.carbonpoint.system.mapper.PermissionPackageMapper;
import com.carbonpoint.system.mapper.PlatformProductFeatureMapper;
import com.carbonpoint.system.mapper.PlatformProductMapper;
import com.carbonpoint.system.service.PlatformProductService;
import com.carbonpoint.system.service.ProductRuleTemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * PlatformProduct service implementation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PlatformProductServiceImpl implements PlatformProductService {

    private final PlatformProductMapper platformProductMapper;
    private final PlatformProductFeatureMapper platformProductFeatureMapper;
    private final FeatureMapper featureMapper;
    private final PackagePlatformProductMapper packagePlatformProductMapper;
    private final PermissionPackageMapper permissionPackageMapper;
    private final ProductRuleTemplateService ruleTemplateService;

    @Override
    public PageRes<ProductRes> getProducts(int page, int size, String category, Integer status, String keyword) {
        LambdaQueryWrapper<PlatformProduct> w = new LambdaQueryWrapper<>();

        if (StringUtils.hasText(category)) {
            w.eq(PlatformProduct::getCategory, category);
        }
        if (status != null) {
            w.eq(PlatformProduct::getStatus, status);
        }
        if (StringUtils.hasText(keyword)) {
            w.and(wr -> wr.like(PlatformProduct::getName, keyword)
                    .or().like(PlatformProduct::getCode, keyword));
        }

        w.orderByAsc(PlatformProduct::getSortOrder)
         .orderByDesc(PlatformProduct::getCreatedAt);

        IPage<PlatformProduct> pageResult = platformProductMapper.selectPage(new Page<>(page, size), w);

        List<ProductRes> records = pageResult.getRecords().stream()
                .map(this::toRes)
                .collect(Collectors.toList());

        return PageRes.<ProductRes>builder()
                .total(pageResult.getTotal())
                .records(records)
                .build();
    }

    @Override
    public ProductRes getProduct(String id) {
        PlatformProduct product = platformProductMapper.selectById(id);
        if (product == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "Product not found");
        }
        return toRes(product);
    }

    @Override
    @Transactional
    public ProductRes createProduct(ProductCreateReq req) {
        LambdaQueryWrapper<PlatformProduct> w = new LambdaQueryWrapper<>();
        w.eq(PlatformProduct::getCode, req.getCode());
        if (platformProductMapper.selectCount(w) > 0) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "Product code already exists");
        }

        PlatformProduct product = new PlatformProduct();
        product.setCode(req.getCode());
        product.setName(req.getName());
        product.setCategory(req.getCategory());
        product.setDescription(req.getDescription());
        product.setStatus(req.getStatus() != null ? req.getStatus() : 1);
        product.setSortOrder(req.getSortOrder() != null ? req.getSortOrder() : 0);
        product.setTriggerType(req.getTriggerType());
        product.setRuleChainConfig(req.getRuleChainConfig());
        product.setDefaultConfig(req.getDefaultConfig());

        platformProductMapper.insert(product);

        log.info("PlatformProduct created: id={}, code={}, name={}", product.getId(), product.getCode(), product.getName());
        return toRes(product);
    }

    @Override
    @Transactional
    public ProductRes updateProduct(String id, ProductUpdateReq req) {
        PlatformProduct product = platformProductMapper.selectById(id);
        if (product == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "Product not found");
        }

        if (StringUtils.hasText(req.getCode()) && !req.getCode().equals(product.getCode())) {
            LambdaQueryWrapper<PlatformProduct> w = new LambdaQueryWrapper<>();
            w.eq(PlatformProduct::getCode, req.getCode());
            if (platformProductMapper.selectCount(w) > 0) {
                throw new BusinessException(ErrorCode.PARAM_INVALID, "Product code already exists");
            }
            product.setCode(req.getCode());
        }

        if (StringUtils.hasText(req.getName())) {
            product.setName(req.getName());
        }
        if (StringUtils.hasText(req.getCategory())) {
            product.setCategory(req.getCategory());
        }
        if (StringUtils.hasText(req.getDescription())) {
            product.setDescription(req.getDescription());
        }
        if (req.getStatus() != null) {
            product.setStatus(req.getStatus());
        }
        if (req.getSortOrder() != null) {
            product.setSortOrder(req.getSortOrder());
        }
        if (StringUtils.hasText(req.getTriggerType())) {
            product.setTriggerType(req.getTriggerType());
        }
        if (StringUtils.hasText(req.getRuleChainConfig())) {
            product.setRuleChainConfig(req.getRuleChainConfig());
        }
        if (StringUtils.hasText(req.getDefaultConfig())) {
            product.setDefaultConfig(req.getDefaultConfig());
        }

        platformProductMapper.updateById(product);
        log.info("PlatformProduct updated: id={}", id);
        return toRes(product);
    }

    @Override
    @Transactional
    public void deleteProduct(String id) {
        PlatformProduct product = platformProductMapper.selectById(id);
        if (product == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "Product not found");
        }

        platformProductMapper.deleteById(id);
        platformProductFeatureMapper.delete(new LambdaQueryWrapper<PlatformProductFeature>()
                .eq(PlatformProductFeature::getProductId, id));

        log.info("PlatformProduct deleted: id={}, code={}", id, product.getCode());
    }

    @Override
    public List<ProductFeatureRes> getProductFeatures(String productId) {
        PlatformProduct product = platformProductMapper.selectById(productId);
        if (product == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "Product not found");
        }

        List<PlatformProductFeature> pfs = platformProductFeatureMapper.selectList(
                new LambdaQueryWrapper<PlatformProductFeature>()
                        .eq(PlatformProductFeature::getProductId, productId));

        List<String> featureIds = pfs.stream()
                .map(PlatformProductFeature::getFeatureId)
                .collect(Collectors.toList());

        Map<String, FeatureEntity> featureMap = featureMapper.selectBatchIds(featureIds).stream()
                .collect(Collectors.toMap(FeatureEntity::getId, f -> f));

        return pfs.stream().map(pf -> {
            FeatureEntity feature = featureMap.get(pf.getFeatureId());
            return ProductFeatureRes.builder()
                    .id(pf.getId() != null ? String.valueOf(pf.getId()) : null)
                    .productId(pf.getProductId())
                    .featureId(pf.getFeatureId())
                    .featureCode(feature != null ? feature.getCode() : null)
                    .featureName(feature != null ? feature.getName() : null)
                    .featureType(feature != null ? feature.getType() : null)
                    .valueType(feature != null ? feature.getValueType() : null)
                    .defaultValue(feature != null ? feature.getDefaultValue() : null)
                    .configValue(pf.getConfigValue())
                    .isRequired(pf.getIsRequired())
                    .isEnabled(pf.getIsEnabled())
                    .createdAt(pf.getCreatedAt())
                    .updatedAt(pf.getUpdatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void updateProductFeatures(String productId, ProductFeatureUpdateReq req) {
        PlatformProduct product = platformProductMapper.selectById(productId);
        if (product == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "Product not found");
        }

        platformProductFeatureMapper.delete(new LambdaQueryWrapper<PlatformProductFeature>()
                .eq(PlatformProductFeature::getProductId, productId));

        if (req.getFeatures() != null && !req.getFeatures().isEmpty()) {
            for (ProductFeatureUpdateReq.ProductFeatureItem item : req.getFeatures()) {
                PlatformProductFeature pf = new PlatformProductFeature();
                pf.setProductId(productId);
                pf.setFeatureId(item.getFeatureId());
                pf.setConfigValue(item.getConfigValue());
                pf.setIsRequired(item.getIsRequired() != null ? item.getIsRequired() : false);
                pf.setIsEnabled(item.getIsEnabled() != null ? item.getIsEnabled() : true);
                platformProductFeatureMapper.insert(pf);
            }
        }

        log.info("PlatformProduct features updated: productId={}, featureCount={}",
                productId, req.getFeatures() != null ? req.getFeatures().size() : 0);
    }

    @Override
    public List<ProductPackageBriefRes> getProductPackages(String productId) {
        List<Long> packageIds = packagePlatformProductMapper.selectPackageIdsByProductId(productId);
        if (packageIds.isEmpty()) {
            return List.of();
        }
        List<PermissionPackage> packages = permissionPackageMapper.selectBatchIds(packageIds);
        return packages.stream()
                .map(pkg -> ProductPackageBriefRes.builder()
                        .id(pkg.getId())
                        .code(pkg.getCode())
                        .name(pkg.getName())
                        .build())
                .collect(Collectors.toList());
    }

    private ProductRes toRes(PlatformProduct product) {
        int featureCount = platformProductFeatureMapper.selectCount(
                new LambdaQueryWrapper<PlatformProductFeature>()
                        .eq(PlatformProductFeature::getProductId, product.getId())).intValue();
        return ProductRes.builder()
                .id(product.getId())
                .code(product.getCode())
                .name(product.getName())
                .category(product.getCategory())
                .description(product.getDescription())
                .status(product.getStatus())
                .sortOrder(product.getSortOrder())
                .triggerType(product.getTriggerType())
                .ruleChainConfig(product.getRuleChainConfig())
                .defaultConfig(product.getDefaultConfig())
                .basicConfig(product.getBasicConfig())
                .featureCount(featureCount)
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }

    @Override
    public String getBasicConfig(String productId) {
        PlatformProduct product = platformProductMapper.selectById(productId);
        if (product == null) throw new IllegalArgumentException("产品不存在: " + productId);
        return product.getBasicConfig();
    }

    @Override
    @Transactional
    public void updateBasicConfig(String productId, String basicConfigJson) {
        PlatformProduct product = platformProductMapper.selectById(productId);
        if (product == null) throw new IllegalArgumentException("产品不存在: " + productId);
        product.setBasicConfig(basicConfigJson);
        platformProductMapper.updateById(product);
        ruleTemplateService.syncToTenants(productId);
    }
}

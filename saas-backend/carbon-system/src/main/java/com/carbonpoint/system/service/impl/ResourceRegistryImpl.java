package com.carbonpoint.system.service.impl;

import com.carbonpoint.common.util.JsonUtils;
import com.carbonpoint.system.entity.FeatureEntity;
import com.carbonpoint.system.entity.PlatformProduct;
import com.carbonpoint.system.entity.PlatformResource;
import com.carbonpoint.system.enums.ResourceType;
import com.carbonpoint.system.mapper.FeatureMapper;
import com.carbonpoint.system.mapper.PlatformProductMapper;
import com.carbonpoint.system.service.ResourceRegistry;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Implementation of ResourceRegistry.
 * <p>
 * Phase 1 implementation: reads from existing Feature and Product tables.
 * Future phases will read from platform_resources table.
 * <p>
 * This is completely non-intrusive - existing code continues to work.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ResourceRegistryImpl implements ResourceRegistry {

    private final FeatureMapper featureMapper;
    private final PlatformProductMapper productMapper;

    // Feature flag - disabled by default
    @Value("${feature.unified-resources:false}")
    private boolean unifiedResourcesEnabled;

    // Cache for resources (from existing tables)
    private volatile Map<String, PlatformResource> resourceCache = new ConcurrentHashMap<>();
    private volatile Map<String, FeatureEntity> featureEntityCache = new ConcurrentHashMap<>();
    private volatile Map<String, PlatformProduct> productCache = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        log.info("Initializing ResourceRegistry (feature enabled: {})", unifiedResourcesEnabled);
        refresh();
    }

    @Override
    @PostConstruct  // Also refresh on start
    public synchronized void refresh() {
        log.info("Refreshing resource cache");

        Map<String, PlatformResource> newResourceCache = new ConcurrentHashMap<>();
        Map<String, FeatureEntity> newFeatureCache = new ConcurrentHashMap<>();
        Map<String, PlatformProduct> newProductCache = new ConcurrentHashMap<>();

        // Load features from existing Feature table
        List<FeatureEntity> features = featureMapper.selectList(null);
        for (FeatureEntity feature : features) {
            PlatformResource resource = buildResourceFromFeature(feature);
            newResourceCache.put(resource.getCode(), resource);
            newFeatureCache.put(feature.getCode(), feature);
        }

        // Load products from existing PlatformProduct table
        List<PlatformProduct> products = productMapper.selectList(null);
        for (PlatformProduct product : products) {
            PlatformResource resource = buildResourceFromProduct(product);
            newResourceCache.put(resource.getCode(), resource);
            newProductCache.put(product.getCode(), product);
        }

        // Atomic swap
        resourceCache = newResourceCache;
        featureEntityCache = newFeatureCache;
        productCache = newProductCache;

        log.info("Resource cache refreshed: {} resources ({} features, {} products)",
                resourceCache.size(), featureEntityCache.size(), productCache.size());
    }

    @Override
    public List<PlatformResource> getAllResources() {
        return new ArrayList<>(resourceCache.values());
    }

    @Override
    public PlatformResource getResourceByCode(String code) {
        return resourceCache.get(code);
    }

    @Override
    public List<PlatformResource> getFunctionProducts() {
        return resourceCache.values().stream()
                .filter(r -> ResourceType.FUNCTION_PRODUCT.getCode().equals(r.getType()))
                .sorted(Comparator.comparing(PlatformResource::getSortOrder))
                .collect(Collectors.toList());
    }

    @Override
    public List<PlatformResource> getFeatures() {
        return resourceCache.values().stream()
                .filter(r -> ResourceType.FEATURE.getCode().equals(r.getType()))
                .sorted(Comparator.comparing(PlatformResource::getSortOrder))
                .collect(Collectors.toList());
    }

    @Override
    public boolean isFeatureEnabled() {
        return unifiedResourcesEnabled;
    }

    @Override
    public FeatureEntity getFeatureEntityByCode(String code) {
        return featureEntityCache.get(code);
    }

    @Override
    public PlatformProduct getProductByCode(String code) {
        return productCache.get(code);
    }

    // ========== Private helper methods ==========

    private PlatformResource buildResourceFromFeature(FeatureEntity feature) {
        PlatformResource resource = new PlatformResource();
        resource.setCode(feature.getCode());
        resource.setType(ResourceType.FEATURE.getCode());
        resource.setName(feature.getName());
        resource.setCategory(feature.getCategory());
        resource.setDescription(feature.getDescription());
        resource.setIcon(null);  // Features don't have icons in old table
        resource.setStatus(feature.getStatus() == 1 ? "ENABLED" : "DISABLED");
        resource.setSortOrder(feature.getSortOrder() != null ? feature.getSortOrder() : 0);
        resource.setDeleted(feature.getDeleted() != null && feature.getDeleted());
        resource.setCreatedAt(feature.getCreatedAt());
        resource.setUpdatedAt(feature.getUpdatedAt());

        // Store feature type and value type as metadata
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("featureType", feature.getType());
        metadata.put("valueType", feature.getValueType());
        metadata.put("defaultValue", feature.getDefaultValue());
        resource.setMetadata(JsonUtils.toJsonString(metadata));

        return resource;
    }

    private PlatformResource buildResourceFromProduct(PlatformProduct product) {
        PlatformResource resource = new PlatformResource();
        resource.setCode(product.getCode());
        resource.setType(ResourceType.FUNCTION_PRODUCT.getCode());
        resource.setName(product.getName());
        resource.setCategory(product.getCategory());
        resource.setDescription(product.getDescription());
        resource.setIcon(product.getIcon());
        resource.setStatus(product.getStatus() == 1 ? "ENABLED" : "DISABLED");
        resource.setSortOrder(product.getSortOrder() != null ? product.getSortOrder() : 0);
        resource.setDeleted(product.getDeleted() != null && product.getDeleted());
        resource.setCreatedAt(product.getCreatedAt());
        resource.setUpdatedAt(product.getUpdatedAt());

        // Store product configuration as metadata
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("triggerType", product.getTriggerType());
        metadata.put("ruleChainConfig", product.getRuleChainConfig());
        metadata.put("defaultConfig", product.getDefaultConfig());
        metadata.put("basicConfig", product.getBasicConfig());
        resource.setMetadata(JsonUtils.toJsonString(metadata));

        return resource;
    }
}

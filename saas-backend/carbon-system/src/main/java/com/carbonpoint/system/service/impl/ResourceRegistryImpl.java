package com.carbonpoint.system.service.impl;

import com.carbonpoint.system.config.FeatureToggleProperties;
import com.carbonpoint.system.entity.FeatureEntity;
import com.carbonpoint.system.entity.PlatformProduct;
import com.carbonpoint.system.entity.PlatformResource;
import com.carbonpoint.system.enums.ResourceType;
import com.carbonpoint.system.mapper.FeatureMapper;
import com.carbonpoint.system.mapper.PlatformProductMapper;
import com.carbonpoint.system.repository.PlatformResourceRepository;
import com.carbonpoint.system.service.ResourceRegistry;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Implementation of ResourceRegistry with feature toggle support.
 * <p>
 * When feature.unified-resources is true: reads from new platform_resources table as primary.
 * When false (default): reads from existing Feature and Product tables.
 * <p>
 * In both cases, maintains compatibility with old APIs.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ResourceRegistryImpl implements ResourceRegistry {

    private final FeatureMapper featureMapper;
    private final PlatformProductMapper productMapper;
    private final ObjectMapper objectMapper;
    private final PlatformResourceRepository platformResourceRepository;
    private final FeatureToggleProperties featureToggleProperties;

    // Cache for resources
    private volatile Map<String, PlatformResource> resourceCache = new ConcurrentHashMap<>();
    private volatile Map<String, FeatureEntity> featureEntityCache = new ConcurrentHashMap<>();
    private volatile Map<String, PlatformProduct> productCache = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        log.info("Initializing ResourceRegistry (feature enabled: {})", featureToggleProperties.isUnifiedResources());
        refresh();
    }

    @Override
    public synchronized void refresh() {
        log.info("Refreshing resource cache (feature enabled: {})", featureToggleProperties.isUnifiedResources());

        Map<String, PlatformResource> newResourceCache = new ConcurrentHashMap<>();
        Map<String, FeatureEntity> newFeatureCache = new ConcurrentHashMap<>();
        Map<String, PlatformProduct> newProductCache = new ConcurrentHashMap<>();

        if (featureToggleProperties.isUnifiedResources()) {
            // Load from new platform_resources table
            log.info("Loading resources from new platform_resources table");
            List<PlatformResource> resources = platformResourceRepository.findAllFromNewTable();
            for (PlatformResource resource : resources) {
                newResourceCache.put(resource.getCode(), resource);
            }

            // Also load from old tables for compatibility fallback
            loadFromOldTables(newFeatureCache, newProductCache);
        } else {
            // Load from old tables (Feature + Product)
            log.info("Loading resources from old tables (Feature + Product)");
            loadFromOldTables(newResourceCache, newFeatureCache, newProductCache);
        }

        // Atomic swap
        resourceCache = newResourceCache;
        featureEntityCache = newFeatureCache;
        productCache = newProductCache;

        log.info("Resource cache refreshed: {} resources ({} features, {} products)",
                resourceCache.size(), featureEntityCache.size(), productCache.size());
    }

    private void loadFromOldTables(Map<String, PlatformResource> resourceCache,
                                    Map<String, FeatureEntity> featureCache,
                                    Map<String, PlatformProduct> productCache) {
        // Load features from existing Feature table
        List<FeatureEntity> features = featureMapper.selectList(null);
        for (FeatureEntity feature : features) {
            PlatformResource resource = buildResourceFromFeature(feature);
            resourceCache.put(resource.getCode(), resource);
            featureCache.put(feature.getCode(), feature);
        }

        // Load products from existing PlatformProduct table
        List<PlatformProduct> products = productMapper.selectList(null);
        for (PlatformProduct product : products) {
            PlatformResource resource = buildResourceFromProduct(product);
            resourceCache.put(resource.getCode(), resource);
            productCache.put(product.getCode(), product);
        }
    }

    private void loadFromOldTables(Map<String, FeatureEntity> featureCache,
                                    Map<String, PlatformProduct> productCache) {
        // Load features from existing Feature table
        List<FeatureEntity> features = featureMapper.selectList(null);
        for (FeatureEntity feature : features) {
            featureCache.put(feature.getCode(), feature);
        }

        // Load products from existing PlatformProduct table
        List<PlatformProduct> products = productMapper.selectList(null);
        for (PlatformProduct product : products) {
            productCache.put(product.getCode(), product);
        }
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
        return featureToggleProperties.isUnifiedResources();
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
        resource.setCategory(feature.getGroup());  // Feature uses 'group' instead of 'category'
        resource.setDescription(feature.getDescription());
        resource.setIcon(null);  // Features don't have icons in old table
        resource.setStatus("ENABLED");  // Feature doesn't have status field, default to ENABLED
        resource.setSortOrder(0);  // Feature doesn't have sortOrder field, default to 0
        resource.setDeleted(false);  // Feature doesn't have deleted field, default to false
        resource.setCreatedAt(feature.getCreatedAt());
        resource.setUpdatedAt(feature.getUpdatedAt());

        // Store feature type and value type as metadata
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("featureType", feature.getType());
        metadata.put("valueType", feature.getValueType());
        metadata.put("defaultValue", feature.getDefaultValue());
        metadata.put("group", feature.getGroup());
        try {
            resource.setMetadata(objectMapper.writeValueAsString(metadata));
        } catch (Exception e) {
            log.warn("Failed to serialize metadata for feature {}", feature.getCode(), e);
            resource.setMetadata("{}");
        }

        return resource;
    }

    private PlatformResource buildResourceFromProduct(PlatformProduct product) {
        PlatformResource resource = new PlatformResource();
        resource.setCode(product.getCode());
        resource.setType(ResourceType.FUNCTION_PRODUCT.getCode());
        resource.setName(product.getName());
        resource.setCategory(product.getCategory());
        resource.setDescription(product.getDescription());
        resource.setIcon(null);  // Product doesn't have icon field in current schema
        resource.setStatus(product.getStatus() == 1 ? "ENABLED" : "DISABLED");
        resource.setSortOrder(product.getSortOrder() != null ? product.getSortOrder() : 0);
        resource.setDeleted(product.getDeleted() != null && product.getDeleted() == 1);
        resource.setCreatedAt(product.getCreatedAt());
        resource.setUpdatedAt(product.getUpdatedAt());

        // Store product configuration as metadata
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("triggerType", product.getTriggerType());
        metadata.put("ruleChainConfig", product.getRuleChainConfig());
        metadata.put("defaultConfig", product.getDefaultConfig());
        metadata.put("basicConfig", product.getBasicConfig());
        try {
            resource.setMetadata(objectMapper.writeValueAsString(metadata));
        } catch (Exception e) {
            log.warn("Failed to serialize metadata for product {}", product.getCode(), e);
            resource.setMetadata("{}");
        }

        return resource;
    }
}

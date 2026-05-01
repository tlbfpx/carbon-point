package com.carbonpoint.system.service;

import com.carbonpoint.system.entity.FeatureEntity;
import com.carbonpoint.system.entity.PlatformProduct;
import com.carbonpoint.system.entity.PlatformResource;

import java.util.List;

/**
 * Unified resource registry service.
 * <p>
 * Phase 1: Read-only, reads from existing tables (Feature, Product).
 * Phase 2: Will read from new platform_resources table.
 * <p>
 * This is a non-intrusive addition - existing functionality is not affected.
 */
public interface ResourceRegistry {

    /**
     * Get all platform resources (including products and features).
     */
    List<PlatformResource> getAllResources();

    /**
     * Get resource by code.
     */
    PlatformResource getResourceByCode(String code);

    /**
     * Get all function products (as resources).
     */
    List<PlatformResource> getFunctionProducts();

    /**
     * Get all features (as resources).
     */
    List<PlatformResource> getFeatures();

    /**
     * Refresh the resource cache.
     */
    void refresh();

    /**
     * Check if unified resources feature is enabled.
     */
    boolean isFeatureEnabled();

    // ========== Legacy compatibility ==========

    /**
     * Get FeatureEntity from resource code (compatibility).
     */
    FeatureEntity getFeatureEntityByCode(String code);

    /**
     * Get PlatformProduct from resource code (compatibility).
     */
    PlatformProduct getProductByCode(String code);
}

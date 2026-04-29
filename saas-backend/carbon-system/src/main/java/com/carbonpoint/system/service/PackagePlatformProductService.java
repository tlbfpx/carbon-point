package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.req.PackageFeaturesUpdateReq;
import com.carbonpoint.system.dto.res.PackageDetailRes;

/**
 * Service for managing the relationship between permission packages and platform products.
 * This includes product assignments, feature configurations, and package-product relationships.
 */
public interface PackagePlatformProductService {

    /**
     * Get package detail including all associated products and their feature configurations.
     * This is used for displaying the complete package configuration to platform admins.
     *
     * @param packageId the package ID
     * @return the detailed package information with products and features
     */
    PackageDetailRes getPackageDetail(Long packageId);

    /**
     * Update all product feature configurations for a package in one batch operation.
     * This replaces all existing package-product-feature configurations with the new ones.
     * Used by the frontend product-driven configuration UI.
     *
     * @param packageId the package ID
     * @param req the update request containing products and their feature configurations
     */
    void updatePackageFeatures(Long packageId, PackageFeaturesUpdateReq req);
}

package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.req.PackageCreateReq;
import com.carbonpoint.system.dto.req.PackageFeaturesUpdateReq;
import com.carbonpoint.system.dto.req.PackageUpdateReq;
import com.carbonpoint.system.dto.req.TenantPackageChangeReq;
import com.carbonpoint.system.dto.res.PackageDetailRes;
import com.carbonpoint.system.dto.res.PackageRes;
import com.carbonpoint.system.dto.res.TenantPackageRes;
import com.carbonpoint.system.entity.PackageResource;

import java.util.List;

public interface PackageService {

    List<PackageRes> list();

    PackageRes getById(Long id);

    PackageRes create(PackageCreateReq req);

    PackageRes update(Long id, PackageUpdateReq req);

    void delete(Long id);

    List<String> getPermissionsByPackageId(Long packageId);

    void updatePermissions(Long packageId, List<String> permissionCodes);

    TenantPackageRes getTenantPackage(Long tenantId);

    void changeTenantPackage(Long tenantId, TenantPackageChangeReq req, Long operatorId);

    // ── Package-Product management ───────────────────────────────────────────

    /**
     * Get package detail including all associated products and their feature configurations.
     */
    PackageDetailRes getPackageDetail(Long id);

    /**
     * Update all product feature configurations for a package in one go (batch operation).
     * This is used by the frontend product-driven configuration UI.
     */
    void updatePackageFeatures(Long packageId, PackageFeaturesUpdateReq req);

    // ── Package-Resource management ───────────────────────────────────────────

    /**
     * Attach a resource to a package with optional configuration.
     * If the resource is already attached, it will be updated.
     *
     * @param packageId   Package ID
     * @param resourceCode Resource code
     * @param config      Optional configuration object (will be serialized to JSON)
     * @param required    Whether this resource is required
     */
    void attachResourceToPackage(Long packageId, String resourceCode, Object config, Boolean required);

    /**
     * Detach a resource from a package.
     *
     * @param packageId   Package ID
     * @param resourceCode Resource code
     */
    void detachResourceFromPackage(Long packageId, String resourceCode);

    /**
     * Get all resources attached to a package.
     *
     * @param packageId Package ID
     * @return List of package resources
     */
    List<PackageResource> getPackageResources(Long packageId);
}

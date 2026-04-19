package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.req.PackageCreateReq;
import com.carbonpoint.system.dto.req.PackageProductFeatureUpdateReq;
import com.carbonpoint.system.dto.req.PackageProductUpdateReq;
import com.carbonpoint.system.dto.req.PackageUpdateReq;
import com.carbonpoint.system.dto.req.TenantPackageChangeReq;
import com.carbonpoint.system.dto.res.PackageDetailRes;
import com.carbonpoint.system.dto.res.PackageFeatureRes;
import com.carbonpoint.system.dto.res.PackageRes;
import com.carbonpoint.system.dto.res.TenantPackageRes;

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
     * Update the product associations and feature configurations for a package.
     * This performs a full replacement of existing associations.
     */
    void updatePackageProducts(Long packageId, PackageProductUpdateReq req);

    /**
     * Get feature configurations for a specific product within a package.
     */
    List<PackageFeatureRes> getPackageProductFeatures(Long packageId, String productId);

    /**
     * Update feature configurations for a specific product within a package.
     */
    void updatePackageProductFeatures(Long packageId, String productId, PackageProductFeatureUpdateReq req);
}

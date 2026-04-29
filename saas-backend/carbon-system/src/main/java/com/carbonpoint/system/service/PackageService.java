package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.req.PackageCreateReq;
import com.carbonpoint.system.dto.req.PackageFeaturesUpdateReq;
import com.carbonpoint.system.dto.req.PackageUpdateReq;
import com.carbonpoint.system.dto.req.TenantPackageChangeReq;
import com.carbonpoint.system.dto.res.PackageDetailRes;
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
     * Update all product feature configurations for a package in one go (batch operation).
     * This is used by the frontend product-driven configuration UI.
     */
    void updatePackageFeatures(Long packageId, PackageFeaturesUpdateReq req);
}

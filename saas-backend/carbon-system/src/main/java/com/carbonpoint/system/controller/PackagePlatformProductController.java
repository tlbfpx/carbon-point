package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.req.PackageFeaturesUpdateReq;
import com.carbonpoint.system.dto.res.PackageDetailRes;
import com.carbonpoint.system.service.PackagePlatformProductService;
import com.carbonpoint.system.security.PlatformAdminOnly;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for managing package-platform-product relationships.
 * All endpoints require platform admin authentication.
 */
@RestController
@RequestMapping("/platform/packages/{packageId}/products")
@RequiredArgsConstructor
public class PackagePlatformProductController {

    private final PackagePlatformProductService packagePlatformProductService;

    /**
     * Get package detail including all associated products and their feature configurations.
     * This is used for displaying the complete package configuration to platform admins.
     *
     * @param packageId the package ID
     * @return the detailed package information with products and features
     */
    @GetMapping("/detail")
    @PlatformAdminOnly
    public Result<PackageDetailRes> getPackageDetail(@PathVariable Long packageId) {
        return Result.success(packagePlatformProductService.getPackageDetail(packageId));
    }

    /**
     * Update all product feature configurations for a package in one batch operation.
     * This replaces all existing package-product-feature configurations with the new ones.
     *
     * @param packageId the package ID
     * @param req the update request containing products and their feature configurations
     * @return success result
     */
    @PutMapping("/features")
    @PlatformAdminOnly
    public Result<Void> updatePackageFeatures(
            @PathVariable Long packageId,
            @RequestBody PackageFeaturesUpdateReq req) {
        packagePlatformProductService.updatePackageFeatures(packageId, req);
        return Result.success();
    }
}

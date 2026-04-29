package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.req.PackageCreateReq;
import com.carbonpoint.system.dto.req.PackageFeaturesUpdateReq;
import com.carbonpoint.system.dto.req.PackagePermissionsUpdateReq;
import com.carbonpoint.system.dto.req.PackageUpdateReq;
import com.carbonpoint.system.dto.res.PackageDetailRes;
import com.carbonpoint.system.dto.res.PackageRes;
import com.carbonpoint.system.security.PlatformAdminOnly;
import com.carbonpoint.system.service.PackageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Platform-level package management controller.
 * All endpoints require platform admin authentication via @PlatformAdminOnly.
 * Permission codes in @RequirePerm serve as documentation and future RBAC hooks.
 */
@RestController
@RequestMapping("/platform/packages")
@RequiredArgsConstructor
public class PackageController {

    private final PackageService packageService;

    @GetMapping
    @PlatformAdminOnly
    public Result<List<PackageRes>> list() {
        return Result.success(packageService.list());
    }

    @GetMapping("/{id}")
    @PlatformAdminOnly
    public Result<PackageRes> getById(@PathVariable Long id) {
        return Result.success(packageService.getById(id));
    }

    @PostMapping
    @PlatformAdminOnly
    public Result<PackageRes> create(@RequestBody PackageCreateReq req) {
        return Result.success(packageService.create(req));
    }

    @PutMapping("/{id}")
    @PlatformAdminOnly
    public Result<PackageRes> update(@PathVariable Long id, @RequestBody PackageUpdateReq req) {
        return Result.success(packageService.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PlatformAdminOnly
    public Result<Void> delete(@PathVariable Long id) {
        packageService.delete(id);
        return Result.success();
    }

    @PutMapping("/{id}/permissions")
    @PlatformAdminOnly
    public Result<Void> updatePermissions(
            @PathVariable Long id,
            @RequestBody PackagePermissionsUpdateReq req) {
        packageService.updatePermissions(id, req.getPermissionCodes());
        return Result.success();
    }

    @GetMapping("/{id}/permissions")
    @PlatformAdminOnly
    public Result<List<String>> getPermissions(@PathVariable Long id) {
        return Result.success(packageService.getPermissionsByPackageId(id));
    }

    // ── Package-Product management ───────────────────────────────────────────────

    /**
     * GET /platform/packages/{id}/detail
     * Returns package detail including associated products and their feature configurations.
     */
    @GetMapping("/{id}/detail")
    @PlatformAdminOnly
    public Result<PackageDetailRes> getPackageDetail(@PathVariable Long id) {
        return Result.success(packageService.getPackageDetail(id));
    }

    /**
     * PUT /platform/packages/{id}/features
     * Batch update all product feature configurations for a package.
     * This is used by the frontend product-driven configuration UI.
     */
    @PutMapping("/{id}/features")
    @PlatformAdminOnly
    public Result<Void> updatePackageFeatures(
            @PathVariable Long id,
            @RequestBody PackageFeaturesUpdateReq req) {
        packageService.updatePackageFeatures(id, req);
        return Result.success();
    }
}

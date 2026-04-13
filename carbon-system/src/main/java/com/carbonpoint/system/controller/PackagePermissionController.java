package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.security.PlatformAdminOnly;
import com.carbonpoint.system.service.PackageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Platform-level package permission management controller.
 */
@RestController
@RequestMapping("/platform/packages/{id}/permissions")
@RequiredArgsConstructor
public class PackagePermissionController {

    private final PackageService packageService;

    @GetMapping
    @PlatformAdminOnly
    public Result<List<String>> getPermissions(@PathVariable("id") Long packageId) {
        return Result.success(packageService.getPermissionsByPackageId(packageId));
    }

    @PutMapping
    @PlatformAdminOnly
    public Result<Void> updatePermissions(
            @PathVariable("id") Long packageId,
            @RequestBody List<String> permissionCodes) {
        packageService.updatePermissions(packageId, permissionCodes);
        return Result.success();
    }
}

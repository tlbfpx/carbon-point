package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.security.PlatformAdminContext;
import com.carbonpoint.system.dto.req.TenantPackageChangeReq;
import com.carbonpoint.system.dto.res.TenantPackageRes;
import com.carbonpoint.system.security.PlatformAdminOnly;
import com.carbonpoint.system.service.PackageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * Platform-level tenant package management controller.
 */
@RestController
@RequestMapping("/platform/tenants/{id}/package")
@RequiredArgsConstructor
public class TenantPackageController {

    private final PackageService packageService;

    @GetMapping
    @PlatformAdminOnly
    public Result<TenantPackageRes> getTenantPackage(@PathVariable("id") Long tenantId) {
        return Result.success(packageService.getTenantPackage(tenantId));
    }

    @PutMapping
    @PlatformAdminOnly
    public Result<Void> changeTenantPackage(
            @PathVariable("id") Long tenantId,
            @RequestBody TenantPackageChangeReq req) {
        Long operatorId = getCurrentAdminId();
        packageService.changeTenantPackage(tenantId, req, operatorId);
        return Result.success();
    }

    private Long getCurrentAdminId() {
        var info = PlatformAdminContext.get();
        return info != null ? info.getAdminId() : null;
    }
}

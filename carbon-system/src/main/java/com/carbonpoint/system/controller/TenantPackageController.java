package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.security.PlatformAdminContext;
import com.carbonpoint.common.security.PlatformAdminInfo;
import com.carbonpoint.system.dto.req.TenantPackageChangeReq;
import com.carbonpoint.system.dto.res.TenantPackageRes;
import com.carbonpoint.system.security.PlatformAdminOnly;
import com.carbonpoint.system.service.PackageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/platform/tenants")
@RequiredArgsConstructor
public class TenantPackageController {

    private final PackageService packageService;

    @GetMapping("/{tenantId}/package")
    @PlatformAdminOnly
    public Result<TenantPackageRes> getTenantPackage(@PathVariable Long tenantId) {
        return Result.success(packageService.getTenantPackage(tenantId));
    }

    @PutMapping("/{tenantId}/package")
    @PlatformAdminOnly
    public Result<Void> changeTenantPackage(
            @PathVariable Long tenantId,
            @RequestBody TenantPackageChangeReq req) {
        packageService.changeTenantPackage(tenantId, req, getCurrentAdminId());
        return Result.success();
    }

    private Long getCurrentAdminId() {
        PlatformAdminInfo info = PlatformAdminContext.get();
        return info != null ? info.getAdminId() : null;
    }
}

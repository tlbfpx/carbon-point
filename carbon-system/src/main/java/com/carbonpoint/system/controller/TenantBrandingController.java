package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.req.TenantBrandingUpdateReq;
import com.carbonpoint.system.dto.res.TenantBrandingRes;
import com.carbonpoint.system.security.RequirePerm;
import com.carbonpoint.system.service.TenantBrandingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/tenant/branding")
@RequiredArgsConstructor
public class TenantBrandingController {

    private final TenantBrandingService tenantBrandingService;

    /**
     * 获取当前租户的品牌配置
     */
    @GetMapping
    public Result<TenantBrandingRes> getCurrent() {
        return Result.success(tenantBrandingService.getCurrent());
    }

    /**
     * 更新当前租户的品牌配置
     */
    @PutMapping
    @RequirePerm("enterprise:branding:manage")
    public Result<TenantBrandingRes> update(@RequestBody TenantBrandingUpdateReq req) {
        return Result.success(tenantBrandingService.update(req));
    }

    /**
     * 上传企业logo
     */
    @PostMapping("/logo")
    @RequirePerm("enterprise:branding:manage")
    public Result<String> uploadLogo(@RequestParam("file") MultipartFile file) {
        return Result.success(tenantBrandingService.uploadLogo(file));
    }

    /**
     * 删除企业logo
     */
    @DeleteMapping("/logo")
    @RequirePerm("enterprise:branding:manage")
    public Result<Void> deleteLogo() {
        tenantBrandingService.deleteLogo();
        return Result.success();
    }

    /**
     * 根据租户ID获取品牌配置（公开接口）
     */
    @GetMapping("/public/tenant/{tenantId}")
    public Result<TenantBrandingRes> getByTenantId(@PathVariable Long tenantId) {
        return Result.success(tenantBrandingService.getByTenantId(tenantId));
    }

    /**
     * 根据租户域名获取品牌配置（公开接口）
     */
    @GetMapping("/public/domain/{domain}")
    public Result<TenantBrandingRes> getByTenantDomain(@PathVariable String domain) {
        return Result.success(tenantBrandingService.getByTenantDomain(domain));
    }
}

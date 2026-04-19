package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.security.JwtUserPrincipal;
import com.carbonpoint.system.dto.res.TenantProductRes;
import com.carbonpoint.system.security.PlatformAdminOnly;
import com.carbonpoint.system.service.TenantProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Tenant Products API.
 * Provides endpoints for tenants to discover which products are available
 * to them based on their package, and for platform admins to query any tenant's products.
 */
@RestController
@RequiredArgsConstructor
public class TenantProductController {

    private final TenantProductService tenantProductService;

    /**
     * Get the current tenant's available products.
     * GET /api/tenant/products
     */
    @GetMapping("/api/tenant/products")
    public Result<List<TenantProductRes>> getTenantProducts(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return Result.success(tenantProductService.getTenantProducts(principal.getTenantId()));
    }

    /**
     * Platform admin: Get any tenant's available products.
     * GET /platform/tenants/{id}/products
     */
    @GetMapping("/platform/tenants/{id}/products")
    @PlatformAdminOnly
    public Result<List<TenantProductRes>> getTenantProductsForPlatform(@PathVariable Long id) {
        return Result.success(tenantProductService.getTenantProducts(id));
    }
}

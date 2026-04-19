package com.carbonpoint.system.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.security.PlatformAdminContext;
import com.carbonpoint.system.aop.PlatformOperationLog;
import com.carbonpoint.system.dto.TenantRequest;
import com.carbonpoint.system.dto.TenantVO;
import com.carbonpoint.system.service.PlatformTenantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * Platform tenant management controller.
 * Allows platform admins to view/manage all tenants across the platform.
 * Endpoints: GET/POST/PUT /platform/tenants
 */
@RestController
@RequestMapping("/platform/tenants")
@RequiredArgsConstructor
public class PlatformTenantController {

    private final PlatformTenantService tenantService;

    /**
     * List all tenants (platform-wide view, no tenant filtering).
     */
    @GetMapping
    public Result<IPage<TenantVO>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status) {
        int effectiveSize = (size != null && size > 0) ? size : 10;
        IPage<TenantVO> result = tenantService.listTenants(page, effectiveSize, keyword, status);
        return Result.success(result);
    }

    /**
     * Get tenant detail by ID (bypasses tenant interceptor).
     */
    @GetMapping("/{id}")
    @PlatformOperationLog(operationType = "VIEW_TENANT", operationObject = "查看企业详情: #{#id}")
    public Result<TenantVO> getById(@PathVariable Long id) {
        return Result.success(tenantService.getTenantByIdForPlatform(id));
    }

    /**
     * Create a new tenant (platform admin creates enterprise).
     */
    @PostMapping
    @PlatformOperationLog(operationType = "CREATE_TENANT", operationObject = "创建企业: #{#request.name}")
    public Result<TenantVO> create(@Valid @RequestBody TenantRequest request) {
        Long operatorId = getCurrentAdminId();
        return Result.success(tenantService.createTenant(request, operatorId));
    }

    /**
     * Suspend (disable) a tenant.
     */
    @PutMapping("/{id}/suspend")
    @PlatformOperationLog(operationType = "SUSPEND_TENANT", operationObject = "停用企业: #{#id}")
    public Result<Void> suspend(@PathVariable Long id) {
        Long operatorId = getCurrentAdminId();
        tenantService.suspendTenant(id, operatorId);
        return Result.success();
    }

    /**
     * Activate a suspended tenant.
     */
    @PutMapping("/{id}/activate")
    @PlatformOperationLog(operationType = "ACTIVATE_TENANT", operationObject = "开通企业: #{#id}")
    public Result<Void> activate(@PathVariable Long id) {
        Long operatorId = getCurrentAdminId();
        tenantService.activateTenant(id, operatorId);
        return Result.success();
    }

    private Long getCurrentAdminId() {
        var info = PlatformAdminContext.get();
        return info != null ? info.getAdminId() : null;
    }
}

package com.carbonpoint.system.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.carbonpoint.system.dto.TenantRequest;
import com.carbonpoint.system.dto.TenantVO;

/**
 * Platform-level tenant management service.
 * Platform admin can view/manage all tenants across the platform.
 */
public interface PlatformTenantService {

    /**
     * List all tenants with pagination.
     */
    IPage<TenantVO> listTenants(int page, int pageSize, String keyword, String status);

    /**
     * Get tenant detail for platform admin (bypasses tenant interceptor).
     */
    TenantVO getTenantByIdForPlatform(Long tenantId);

    /**
     * Suspend (disable) a tenant.
     */
    void suspendTenant(Long tenantId, Long operatorId);

    /**
     * Activate a tenant.
     */
    void activateTenant(Long tenantId, Long operatorId);

    /**
     * Create a tenant (called by platform admin).
     */
    TenantVO createTenant(TenantRequest request, Long operatorId);
}

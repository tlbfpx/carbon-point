package com.carbonpoint.system.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.carbonpoint.system.dto.EnterpriseUserVO;
import com.carbonpoint.system.dto.TenantRequest;
import com.carbonpoint.system.dto.TenantVO;

import java.util.List;

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

    /**
     * List all users for a specific tenant (platform admin view).
     */
    List<EnterpriseUserVO> listUsersForTenant(Long tenantId);

    /**
     * Assign super_admin role to a user within a tenant.
     */
    void assignSuperAdmin(Long tenantId, Long userId);

    /**
     * Delete a tenant (soft delete).
     */
    void deleteTenant(Long tenantId, Long operatorId);
}

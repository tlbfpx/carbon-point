package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.req.*;
import com.carbonpoint.system.dto.res.*;

import java.util.List;

public interface RoleService {
    RoleDetailRes create(RoleCreateReq req);
    RoleDetailRes update(Long id, RoleUpdateReq req);
    void delete(Long id);
    RoleDetailRes getById(Long id);
    List<RoleDetailRes> list(Long tenantId);
    void assignPermissions(Long roleId, List<String> permissionCodes);
    void assignUsers(Long roleId, List<Long> userIds);

    /**
     * Initialize super_admin role for a newly created tenant.
     * Creates a super_admin role with all permissions from the package,
     * and optionally assigns the initial admin user to this role.
     */
    void initSuperAdminRole(Long tenantId, Long packageId, Long adminUserId);

    /**
     * Get permissions that the current user's super_admin role has.
     * Used by enterprise admins to populate the available-permission tree
     * when editing operator/custom roles.
     */
    List<String> getAvailablePermissions();

    /**
     * Update role permissions with package boundary validation.
     * Throws BusinessException if newPermissions is not a subset of super_admin permissions,
     * or if the role is of type 'super_admin'.
     */
    void updateRolePermissions(Long roleId, List<String> permissionCodes);
}

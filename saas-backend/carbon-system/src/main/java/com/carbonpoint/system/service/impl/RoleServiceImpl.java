package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.system.dto.req.RoleCreateReq;
import com.carbonpoint.system.dto.req.RoleUpdateReq;
import com.carbonpoint.system.dto.res.RoleDetailRes;
import com.carbonpoint.system.entity.*;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.security.CurrentUser;
import com.carbonpoint.system.security.PermissionService;
import com.carbonpoint.system.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final RoleMapper roleMapper;
    private final RolePermissionMapper rolePermissionMapper;
    private final UserRoleMapper userRoleMapper;
    private final UserMapper userMapper;
    private final PermissionService permissionService;
    private final CurrentUser currentUser;
    private final PackagePermissionMapper packagePermissionMapper;

    private static final String ROLE_TYPE_SUPER_ADMIN = "super_admin";
    private static final String ROLE_TYPE_OPERATOR = "operator";
    private static final String ROLE_TYPE_CUSTOM = "custom";

    @Override
    @Transactional
    public RoleDetailRes create(RoleCreateReq req) {
        Long tenantId = TenantContext.getTenantId();

        // Check name uniqueness
        LambdaQueryWrapper<Role> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Role::getTenantId, tenantId).eq(Role::getName, req.getName());
        if (roleMapper.selectCount(wrapper) > 0) {
            throw new BusinessException(ErrorCode.ROLE_NAME_DUPLICATE);
        }

        String roleType = req.getRoleType();
        // Enterprise-side role creation only allows operator or custom
        if (ROLE_TYPE_SUPER_ADMIN.equals(roleType)) {
            throw new BusinessException(ErrorCode.ROLE_SUPER_ADMIN_IMMUTABLE);
        }
        // Default to custom for enterprise-created roles
        if (roleType == null || roleType.isBlank()) {
            roleType = ROLE_TYPE_CUSTOM;
        }

        Role role = new Role();
        role.setTenantId(tenantId);
        role.setName(req.getName());
        role.setIsPreset(false);
        role.setRoleType(roleType);
        role.setIsEditable(true);
        roleMapper.insert(role);

        if (req.getPermissionCodes() != null && !req.getPermissionCodes().isEmpty()) {
            // Validate: non-super_admin role permissions must be within tenant's package scope
            validatePermissionSubset(tenantId, req.getPermissionCodes());
            List<RolePermission> perms = req.getPermissionCodes().stream()
                    .map(code -> {
                        RolePermission rp = new RolePermission();
                        rp.setRoleId(role.getId());
                        rp.setPermissionCode(code);
                        return rp;
                    }).toList();
            rolePermissionMapper.batchInsertRolePerms(perms);
        }

        return getById(role.getId());
    }

    @Override
    @Transactional
    public RoleDetailRes update(Long id, RoleUpdateReq req) {
        Role role = roleMapper.selectById(id);
        if (role == null) throw new BusinessException(ErrorCode.NOT_FOUND);

        // Check editability: use isEditable field (primary) or fall back to isPreset (legacy)
        if (!Boolean.TRUE.equals(role.getIsEditable())
                && (role.getIsPreset() == null || role.getIsPreset())) {
            throw new BusinessException(ErrorCode.ROLE_SUPER_ADMIN_IMMUTABLE);
        }

        if (req.getName() != null) {
            // Check name uniqueness
            LambdaQueryWrapper<Role> w = new LambdaQueryWrapper<>();
            w.eq(Role::getTenantId, role.getTenantId()).eq(Role::getName, req.getName()).ne(Role::getId, id);
            if (roleMapper.selectCount(w) > 0) {
                throw new BusinessException(ErrorCode.ROLE_NAME_DUPLICATE);
            }
            role.setName(req.getName());
        }

        roleMapper.updateById(role);

        // Update permissions
        if (req.getPermissionCodes() != null) {
            updateRolePermissions(id, req.getPermissionCodes());
        }

        return getById(id);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Role role = roleMapper.selectById(id);
        if (role == null) throw new BusinessException(ErrorCode.NOT_FOUND);

        // Check editability: preset/immutable roles cannot be deleted
        if (!Boolean.TRUE.equals(role.getIsEditable())
                && (role.getIsPreset() == null || role.getIsPreset())) {
            throw new BusinessException(ErrorCode.ROLE_SUPER_ADMIN_IMMUTABLE);
        }

        // Super admin protection: at least one super admin must remain
        if (ROLE_TYPE_SUPER_ADMIN.equals(role.getRoleType())) {
            LambdaQueryWrapper<Role> w = new LambdaQueryWrapper<>();
            w.eq(Role::getTenantId, role.getTenantId())
                    .eq(Role::getRoleType, ROLE_TYPE_SUPER_ADMIN)
                    .ne(Role::getId, id);
            if (roleMapper.selectCount(w) == 0) {
                // Check if any users would lose their last super admin role
                List<Long> userIds = userRoleMapper.selectUserIdsByRoleId(id);

                if (!userIds.isEmpty()) {
                    // Batch-fetch all user-role mappings for all affected users
                    List<UserRole> allMappings = userRoleMapper.selectByUserIds(userIds);

                    // Build per-user role list map
                    Map<Long, List<Long>> userToRoles = allMappings.stream()
                            .collect(Collectors.groupingBy(
                                    UserRole::getUserId,
                                    Collectors.mapping(UserRole::getRoleId, Collectors.toList())));

                    // Batch-fetch all other roles
                    Set<Long> allOtherRoleIds = allMappings.stream()
                            .map(UserRole::getRoleId)
                            .filter(rid -> !rid.equals(id))
                            .collect(Collectors.toSet());

                    Map<Long, Role> otherRolesMap = Map.of();
                    if (!allOtherRoleIds.isEmpty()) {
                        List<Role> otherRoles = roleMapper.selectBatchIds(List.copyOf(allOtherRoleIds));
                        otherRolesMap = otherRoles.stream()
                                .collect(Collectors.toMap(Role::getId, r -> r));
                    }

                    for (Long userId : userIds) {
                        List<Long> otherRoles = userToRoles.getOrDefault(userId, List.of());
                        otherRoles.remove(id);
                        if (otherRoles.isEmpty()) {
                            throw new BusinessException(ErrorCode.ROLE_LAST_SUPER_ADMIN);
                        }
                        boolean hasOtherSuperAdmin = otherRoles.stream()
                                .map(otherRolesMap::get)
                                .filter(Objects::nonNull)
                                .anyMatch(r -> ROLE_TYPE_SUPER_ADMIN.equals(r.getRoleType()));
                        if (!hasOtherSuperAdmin) {
                            throw new BusinessException(ErrorCode.ROLE_LAST_SUPER_ADMIN);
                        }
                    }
                }
            }
        }

        rolePermissionMapper.deleteByRoleId(id);
        roleMapper.deleteById(id);
    }

    @Override
    public RoleDetailRes getById(Long id) {
        Role role = roleMapper.selectById(id);
        if (role == null) throw new BusinessException(ErrorCode.NOT_FOUND);

        List<String> permCodes = rolePermissionMapper.selectPermissionCodesByRoleId(id);

        return RoleDetailRes.builder()
                .id(role.getId())
                .tenantId(role.getTenantId())
                .name(role.getName())
                .isPreset(role.getIsPreset())
                .roleType(role.getRoleType())
                .isEditable(role.getIsEditable())
                .permissionCodes(permCodes)
                .createdAt(role.getCreatedAt())
                .build();
    }

    @Override
    public List<RoleDetailRes> list(Long tenantId) {
        if (tenantId == null) tenantId = TenantContext.getTenantId();
        LambdaQueryWrapper<Role> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Role::getTenantId, tenantId)
                // Order: super_admin first, then operator, then custom, then by createdAt
                .last("ORDER BY FIELD(role_type, 'super_admin', 'operator', 'custom'), created_at ASC");
        List<Role> roles = roleMapper.selectList(wrapper);

        // Batch-fetch all permissions in a single query to avoid N+1
        Map<Long, List<String>> permMap;
        if (!roles.isEmpty()) {
            List<Long> roleIds = roles.stream().map(Role::getId).toList();
            permMap = rolePermissionMapper.selectByRoleIds(roleIds).stream()
                    .collect(Collectors.groupingBy(
                            RolePermission::getRoleId,
                            Collectors.mapping(RolePermission::getPermissionCode, Collectors.toList())
                    ));
        } else {
            permMap = Map.of();
        }

        final var resolvedPermMap = permMap;
        return roles.stream().map(r -> RoleDetailRes.builder()
                .id(r.getId())
                .tenantId(r.getTenantId())
                .name(r.getName())
                .isPreset(r.getIsPreset())
                .roleType(r.getRoleType())
                .isEditable(r.getIsEditable())
                .permissionCodes(resolvedPermMap.getOrDefault(r.getId(), List.of()))
                .createdAt(r.getCreatedAt())
                .build()).toList();
    }

    @Override
    @Transactional
    public void assignPermissions(Long roleId, List<String> permissionCodes) {
        // Delegate to updateRolePermissions which has the proper validation
        updateRolePermissions(roleId, permissionCodes);
    }

    @Override
    @Transactional
    public void assignUsers(Long roleId, List<Long> userIds) {
        // Fetch the role to check its type
        Role role = roleMapper.selectById(roleId);
        if (role == null) throw new BusinessException(ErrorCode.NOT_FOUND);

        // Block assigning super_admin role from enterprise-side
        if (ROLE_TYPE_SUPER_ADMIN.equals(role.getRoleType())) {
            throw new BusinessException(ErrorCode.ROLE_SUPER_ADMIN_ASSIGN_FORBIDDEN);
        }

        // Remove existing assignments
        LambdaQueryWrapper<UserRole> w = new LambdaQueryWrapper<>();
        w.eq(UserRole::getRoleId, roleId);
        userRoleMapper.delete(w);

        if (!userIds.isEmpty()) {
            Long tenantId = role.getTenantId();

            // Batch-fetch all users to validate tenant membership
            List<User> users = userMapper.selectBatchIds(userIds);
            for (User user : users) {
                if (!tenantId.equals(user.getTenantId())) {
                    throw new BusinessException(ErrorCode.USER_NOT_IN_TENANT,
                            "用户 %s 不属于该租户".formatted(user.getPhone()));
                }
            }

            // Batch-insert new assignments
            List<UserRole> urList = userIds.stream()
                    .map(userId -> {
                        UserRole ur = new UserRole();
                        ur.setUserId(userId);
                        ur.setRoleId(roleId);
                        return ur;
                    }).toList();
            userRoleMapper.batchInsert(urList);

            // Batch-refresh permission cache
            permissionService.refreshUsersCache(userIds);
        }
    }

    @Override
    @Transactional
    public void initSuperAdminRole(Long tenantId, Long packageId, Long adminUserId) {
        // 1. Get all permission codes from the package
        List<String> packagePermissions = packagePermissionMapper.selectCodesByPackageId(packageId);
        if (packagePermissions == null) {
            packagePermissions = new ArrayList<>();
        }

        // 2. Create super_admin role
        Role superAdminRole = new Role();
        superAdminRole.setTenantId(tenantId);
        superAdminRole.setName("超级管理员");
        superAdminRole.setIsPreset(true);
        superAdminRole.setRoleType(ROLE_TYPE_SUPER_ADMIN);
        superAdminRole.setIsEditable(false);
        roleMapper.insert(superAdminRole);

        // 3. Copy all package permissions to the super_admin role
        if (!packagePermissions.isEmpty()) {
            List<RolePermission> perms = packagePermissions.stream()
                    .map(code -> {
                        RolePermission rp = new RolePermission();
                        rp.setRoleId(superAdminRole.getId());
                        rp.setPermissionCode(code);
                        return rp;
                    }).toList();
            rolePermissionMapper.batchInsertRolePerms(perms);
        }

        // 4. If initial admin user is specified, assign them to super_admin role
        if (adminUserId != null) {
            UserRole ur = new UserRole();
            ur.setUserId(adminUserId);
            ur.setRoleId(superAdminRole.getId());
            userRoleMapper.insert(ur);
        }
    }

    @Override
    public List<String> getAvailablePermissions() {
        Long tenantId = TenantContext.getTenantId();
        return getSuperAdminPermissions(tenantId);
    }

    @Override
    @Transactional
    public void updateRolePermissions(Long roleId, List<String> permissionCodes) {
        Role role = roleMapper.selectById(roleId);
        if (role == null) throw new BusinessException(ErrorCode.NOT_FOUND);

        // super_admin role cannot have its permissions modified via enterprise-side API
        if (ROLE_TYPE_SUPER_ADMIN.equals(role.getRoleType())) {
            throw new BusinessException(ErrorCode.ROLE_SUPER_ADMIN_IMMUTABLE);
        }

        Long tenantId = role.getTenantId();

        // Validate: non-super_admin role permissions must be within tenant's package scope
        if (permissionCodes != null && !permissionCodes.isEmpty()) {
            validatePermissionSubset(tenantId, permissionCodes);
        }

        // Clear existing permissions
        rolePermissionMapper.deleteByRoleId(roleId);

        // Insert new permissions
        if (permissionCodes != null && !permissionCodes.isEmpty()) {
            List<RolePermission> perms = permissionCodes.stream()
                    .map(code -> {
                        RolePermission rp = new RolePermission();
                        rp.setRoleId(roleId);
                        rp.setPermissionCode(code);
                        return rp;
                    }).toList();
            rolePermissionMapper.batchInsertRolePerms(perms);
        }

        // Refresh permission cache for all affected users
        List<Long> userIds = userRoleMapper.selectUserIdsByRoleId(roleId);
        permissionService.refreshUsersCache(userIds);
    }

    /**
     * Get super_admin role's permission codes for a tenant.
     */
    private List<String> getSuperAdminPermissions(Long tenantId) {
        LambdaQueryWrapper<Role> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Role::getTenantId, tenantId)
                .eq(Role::getRoleType, ROLE_TYPE_SUPER_ADMIN);
        Role superAdmin = roleMapper.selectOne(wrapper);
        if (superAdmin == null) {
            return new ArrayList<>();
        }
        return rolePermissionMapper.selectPermissionCodesByRoleId(superAdmin.getId());
    }

    /**
     * Validate that requested permissions are a subset of the super_admin's permissions.
     */
    private void validatePermissionSubset(Long tenantId, List<String> requestedPermissions) {
        List<String> superAdminPerms = getSuperAdminPermissions(tenantId);
        Set<String> allowedSet = new HashSet<>(superAdminPerms);

        List<String> exceeded = new ArrayList<>();
        for (String code : requestedPermissions) {
            if (!allowedSet.contains(code)) {
                exceeded.add(code);
            }
        }

        if (!exceeded.isEmpty()) {
            throw new BusinessException(ErrorCode.ROLE_PERMISSION_EXCEED_PACKAGE,
                    "以下权限超出套餐范围: " + String.join(", ", exceeded));
        }
    }
}

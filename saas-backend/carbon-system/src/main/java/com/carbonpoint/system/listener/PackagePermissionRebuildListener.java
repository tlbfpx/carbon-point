package com.carbonpoint.system.listener;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.system.entity.Role;
import com.carbonpoint.system.entity.RolePermission;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.event.PackagePermissionUpdatedEvent;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.security.PermissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Async listener that rebuilds tenant roles after package permissions are updated.
 * Runs AFTER_COMMIT to ensure the new permissions are visible in the database.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PackagePermissionRebuildListener {

    private final RoleMapper roleMapper;
    private final RolePermissionMapper rolePermissionMapper;
    private final TenantMapper tenantMapper;
    private final PackagePermissionMapper packagePermissionMapper;
    private final PermissionService permissionService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPackagePermissionUpdated(PackagePermissionUpdatedEvent event) {
        log.info("Async rebuild started for packageId={}", event.getPackageId());
        rebuildAllTenantsRolesByPackage(event.getPackageId());
        log.info("Async rebuild completed for packageId={}", event.getPackageId());
    }

    private void rebuildAllTenantsRolesByPackage(Long packageId) {
        // Get all tenants using this package
        LambdaQueryWrapper<Tenant> w = new LambdaQueryWrapper<>();
        w.eq(Tenant::getPackageId, packageId);
        List<Tenant> tenants = tenantMapper.selectList(w);

        Set<String> newPackagePerms = new HashSet<>(
                packagePermissionMapper.selectCodesByPackageId(packageId));

        for (Tenant tenant : tenants) {
            rebuildTenantRoles(tenant.getId(), newPackagePerms);
            log.info("Rebuilt tenant roles after package permission update: tenantId={}", tenant.getId());
        }
    }

    private void rebuildTenantRoles(Long tenantId, Set<String> newPackagePerms) {
        // Rebuild super_admin role: replace with new package permissions
        List<Role> superAdminRoles = roleMapper.selectByTenantIdForPlatform(tenantId).stream()
                .filter(r -> "super_admin".equals(r.getRoleType()))
                .toList();
        for (Role superAdminRole : superAdminRoles) {
            rolePermissionMapper.deleteByRoleId(superAdminRole.getId());
            if (!newPackagePerms.isEmpty()) {
                List<RolePermission> perms = newPackagePerms.stream()
                        .map(code -> {
                            RolePermission rp = new RolePermission();
                            rp.setRoleId(superAdminRole.getId());
                            rp.setPermissionCode(code);
                            return rp;
                        })
                        .collect(Collectors.toList());
                rolePermissionMapper.batchInsertRolePerms(perms);
            }
            refreshUsersInRole(superAdminRole.getId());
        }

        // Rebuild operator/custom roles: intersect with new package permissions
        List<Role> otherRoles = roleMapper.selectByTenantIdForPlatform(tenantId).stream()
                .filter(r -> !"super_admin".equals(r.getRoleType()))
                .toList();
        for (Role role : otherRoles) {
            List<String> currentPerms = rolePermissionMapper.selectPermissionCodesByRoleId(role.getId());
            List<String> intersectedPerms = currentPerms.stream()
                    .filter(newPackagePerms::contains)
                    .toList();
            if (intersectedPerms.size() != currentPerms.size()) {
                rolePermissionMapper.deleteByRoleId(role.getId());
                if (!intersectedPerms.isEmpty()) {
                    List<RolePermission> perms = intersectedPerms.stream()
                            .map(code -> {
                                RolePermission rp = new RolePermission();
                                rp.setRoleId(role.getId());
                                rp.setPermissionCode(code);
                                return rp;
                            })
                            .collect(Collectors.toList());
                    rolePermissionMapper.batchInsertRolePerms(perms);
                }
                refreshUsersInRole(role.getId());
            }
        }
    }

    private void refreshUsersInRole(Long roleId) {
        List<Long> userIds = rolePermissionMapper.selectUserIdsByRoleId(roleId);
        for (Long userId : userIds) {
            permissionService.refreshUserCache(userId);
        }
    }
}

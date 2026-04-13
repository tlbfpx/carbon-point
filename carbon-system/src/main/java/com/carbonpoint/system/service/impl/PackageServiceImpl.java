package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.system.dto.req.PackageCreateReq;
import com.carbonpoint.system.dto.req.PackageUpdateReq;
import com.carbonpoint.system.dto.req.TenantPackageChangeReq;
import com.carbonpoint.system.dto.res.PackageRes;
import com.carbonpoint.system.dto.res.TenantPackageRes;
import com.carbonpoint.system.entity.*;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.security.PermissionService;
import com.carbonpoint.system.service.PackageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PackageServiceImpl implements PackageService {

    private final PermissionPackageMapper packageMapper;
    private final PackagePermissionMapper packagePermissionMapper;
    private final PackageChangeLogMapper changeLogMapper;
    private final TenantMapper tenantMapper;
    private final RoleMapper roleMapper;
    private final RolePermissionMapper rolePermissionMapper;
    private final UserRoleMapper userRoleMapper;
    private final PermissionService permissionService;

    @Override
    public List<PackageRes> list() {
        List<PermissionPackage> packages = packageMapper.selectList(null);
        return packages.stream().map(this::toRes).toList();
    }

    @Override
    public PackageRes getById(Long id) {
        PermissionPackage pkg = packageMapper.selectById(id);
        if (pkg == null) {
            throw new BusinessException(ErrorCode.PACKAGE_NOT_FOUND);
        }
        return toRes(pkg);
    }

    @Override
    @Transactional
    public PackageRes create(PackageCreateReq req) {
        // Check code uniqueness
        LambdaQueryWrapper<PermissionPackage> w = new LambdaQueryWrapper<>();
        w.eq(PermissionPackage::getCode, req.getCode());
        if (packageMapper.selectCount(w) > 0) {
            throw new BusinessException(ErrorCode.PACKAGE_CODE_DUPLICATE);
        }

        PermissionPackage pkg = new PermissionPackage();
        pkg.setCode(req.getCode());
        pkg.setName(req.getName());
        pkg.setDescription(req.getDescription());
        pkg.setStatus(true);
        packageMapper.insert(pkg);

        if (req.getPermissionCodes() != null && !req.getPermissionCodes().isEmpty()) {
            for (String code : req.getPermissionCodes()) {
                PackagePermission pp = new PackagePermission();
                pp.setPackageId(pkg.getId());
                pp.setPermissionCode(code);
                packagePermissionMapper.insert(pp);
            }
        }

        log.info("Package created: id={}, code={}, name={}", pkg.getId(), pkg.getCode(), pkg.getName());
        return toRes(packageMapper.selectById(pkg.getId()));
    }

    @Override
    @Transactional
    public PackageRes update(Long id, PackageUpdateReq req) {
        PermissionPackage pkg = packageMapper.selectById(id);
        if (pkg == null) {
            throw new BusinessException(ErrorCode.PACKAGE_NOT_FOUND);
        }

        if (req.getName() != null) {
            pkg.setName(req.getName());
        }
        if (req.getDescription() != null) {
            pkg.setDescription(req.getDescription());
        }
        if (req.getStatus() != null) {
            pkg.setStatus(req.getStatus());
        }

        packageMapper.updateById(pkg);
        log.info("Package updated: id={}", id);
        return toRes(pkg);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        PermissionPackage pkg = packageMapper.selectById(id);
        if (pkg == null) {
            throw new BusinessException(ErrorCode.PACKAGE_NOT_FOUND);
        }

        // Check if any tenant uses this package
        long tenantCount = packageMapper.countTenantsByPackageId(id);
        if (tenantCount > 0) {
            throw new BusinessException(ErrorCode.PACKAGE_HAS_TENANTS);
        }

        // package_permissions will be cascade deleted by FK
        packageMapper.deleteById(id);
        log.info("Package deleted: id={}, code={}", id, pkg.getCode());
    }

    @Override
    public List<String> getPermissionsByPackageId(Long packageId) {
        PermissionPackage pkg = packageMapper.selectById(packageId);
        if (pkg == null) {
            throw new BusinessException(ErrorCode.PACKAGE_NOT_FOUND);
        }
        return packagePermissionMapper.selectCodesByPackageId(packageId);
    }

    @Override
    @Transactional
    public void updatePermissions(Long packageId, List<String> permissionCodes) {
        PermissionPackage pkg = packageMapper.selectById(packageId);
        if (pkg == null) {
            throw new BusinessException(ErrorCode.PACKAGE_NOT_FOUND);
        }

        // Remove existing permissions
        LambdaQueryWrapper<PackagePermission> w = new LambdaQueryWrapper<>();
        w.eq(PackagePermission::getPackageId, packageId);
        packagePermissionMapper.delete(w);

        // Add new permissions
        if (permissionCodes != null && !permissionCodes.isEmpty()) {
            for (String code : permissionCodes) {
                PackagePermission pp = new PackagePermission();
                pp.setPackageId(packageId);
                pp.setPermissionCode(code);
                packagePermissionMapper.insert(pp);
            }
        }

        // If this package is in use, rebuild all affected tenant roles
        long tenantCount = packageMapper.countTenantsByPackageId(packageId);
        if (tenantCount > 0) {
            rebuildAllTenantsRolesByPackage(packageId);
        }

        log.info("Package permissions updated: packageId={}, newCount={}", packageId,
                permissionCodes != null ? permissionCodes.size() : 0);
    }

    @Override
    public TenantPackageRes getTenantPackage(Long tenantId) {
        Tenant tenant = tenantMapper.selectByIdForPlatform(tenantId);
        if (tenant == null) {
            throw new BusinessException(ErrorCode.TENANT_NOT_FOUND);
        }

        TenantPackageRes res = new TenantPackageRes();
        res.setTenantId(tenantId);

        if (tenant.getPackageId() != null) {
            PermissionPackage pkg = packageMapper.selectById(tenant.getPackageId());
            if (pkg != null) {
                res.setPackageId(pkg.getId());
                res.setPackageName(pkg.getName());
                res.setPackageCode(pkg.getCode());
                res.setPackageDescription(pkg.getDescription());
                res.setPackageStatus(pkg.getStatus());
                res.setPermissionCodes(packagePermissionMapper.selectCodesByPackageId(pkg.getId()));
            }
        }

        // Get latest change log
        List<PackageChangeLog> logs = changeLogMapper.selectByTenantId(tenantId);
        if (!logs.isEmpty()) {
            PackageChangeLog latest = logs.get(0);
            res.setOperatorId(latest.getOperatorId());
            res.setOperatorType(latest.getOperatorType());
            res.setReason(latest.getReason());
            res.setChangedAt(latest.getCreatedAt());
        }

        return res;
    }

    @Override
    @Transactional
    public void changeTenantPackage(Long tenantId, TenantPackageChangeReq req, Long operatorId) {
        Tenant tenant = tenantMapper.selectByIdForPlatform(tenantId);
        if (tenant == null) {
            throw new BusinessException(ErrorCode.TENANT_NOT_FOUND);
        }

        PermissionPackage newPkg = packageMapper.selectById(req.getPackageId());
        if (newPkg == null) {
            throw new BusinessException(ErrorCode.PACKAGE_NOT_FOUND);
        }

        Long oldPackageId = tenant.getPackageId();

        // Get new package permissions
        Set<String> newPackagePerms = new HashSet<>(
                packagePermissionMapper.selectCodesByPackageId(newPkg.getId()));

        // 1. Update super_admin role: replace with new package permissions
        List<Role> superAdminRoles = roleMapper.selectByTenantIdForPlatform(tenantId).stream()
                .filter(r -> "super_admin".equals(r.getRoleType()))
                .toList();
        for (Role superAdminRole : superAdminRoles) {
            rolePermissionMapper.deleteByRoleId(superAdminRole.getId());
            for (String perm : newPackagePerms) {
                RolePermission rp = new RolePermission();
                rp.setRoleId(superAdminRole.getId());
                rp.setPermissionCode(perm);
                rolePermissionMapper.insert(rp);
            }
            // Refresh cache for all users with super_admin role
            List<Long> userIds = userRoleMapper.selectUserIdsByRoleId(superAdminRole.getId());
            for (Long userId : userIds) {
                permissionService.refreshUserCache(userId);
            }
        }

        // 2. Update operator/custom roles: intersect with new package permissions
        List<Role> otherRoles = roleMapper.selectByTenantIdForPlatform(tenantId).stream()
                .filter(r -> !"super_admin".equals(r.getRoleType()))
                .toList();
        for (Role role : otherRoles) {
            List<String> currentPerms = rolePermissionMapper.selectPermissionCodesByRoleId(role.getId());
            List<String> intersectedPerms = currentPerms.stream()
                    .filter(newPackagePerms::contains)
                    .toList();
            // Only update if permissions changed
            if (intersectedPerms.size() != currentPerms.size()) {
                rolePermissionMapper.deleteByRoleId(role.getId());
                for (String perm : intersectedPerms) {
                    RolePermission rp = new RolePermission();
                    rp.setRoleId(role.getId());
                    rp.setPermissionCode(perm);
                    rolePermissionMapper.insert(rp);
                }
                // Refresh cache
                List<Long> userIds = userRoleMapper.selectUserIdsByRoleId(role.getId());
                for (Long userId : userIds) {
                    permissionService.refreshUserCache(userId);
                }
            }
        }

        // 3. Update tenant's package_id
        tenant.setPackageId(newPkg.getId());
        tenant.setUpdatedAt(java.time.LocalDateTime.now());
        tenantMapper.updateById(tenant);

        // 4. Log the change
        PackageChangeLog changeLog = new PackageChangeLog();
        changeLog.setTenantId(tenantId);
        changeLog.setOldPackageId(oldPackageId);
        changeLog.setNewPackageId(newPkg.getId());
        changeLog.setOperatorId(operatorId);
        changeLog.setOperatorType("platform_admin");
        changeLog.setReason(req.getReason());
        changeLogMapper.insert(changeLog);

        log.info("Tenant package changed: tenantId={}, oldPackageId={}, newPackageId={}, operatorId={}",
                tenantId, oldPackageId, newPkg.getId(), operatorId);
    }

    private PackageRes toRes(PermissionPackage pkg) {
        List<String> codes = packagePermissionMapper.selectCodesByPackageId(pkg.getId());
        return PackageRes.builder()
                .id(pkg.getId())
                .code(pkg.getCode())
                .name(pkg.getName())
                .description(pkg.getDescription())
                .status(pkg.getStatus())
                .permissionCount(codes.size())
                .tenantCount(packageMapper.countTenantsByPackageId(pkg.getId()))
                .createdAt(pkg.getCreatedAt())
                .updatedAt(pkg.getUpdatedAt())
                .permissionCodes(codes)
                .build();
    }

    private void rebuildAllTenantsRolesByPackage(Long packageId) {
        // Get all tenants using this package
        LambdaQueryWrapper<Tenant> w = new LambdaQueryWrapper<>();
        w.eq(Tenant::getPackageId, packageId);
        List<Tenant> tenants = tenantMapper.selectList(w);

        Set<String> newPackagePerms = new HashSet<>(
                packagePermissionMapper.selectCodesByPackageId(packageId));

        for (Tenant tenant : tenants) {
            // Rebuild super_admin role
            List<Role> superAdminRoles = roleMapper.selectByTenantIdForPlatform(tenant.getId()).stream()
                    .filter(r -> "super_admin".equals(r.getRoleType()))
                    .toList();
            for (Role superAdminRole : superAdminRoles) {
                rolePermissionMapper.deleteByRoleId(superAdminRole.getId());
                for (String perm : newPackagePerms) {
                    RolePermission rp = new RolePermission();
                    rp.setRoleId(superAdminRole.getId());
                    rp.setPermissionCode(perm);
                    rolePermissionMapper.insert(rp);
                }
                List<Long> userIds = userRoleMapper.selectUserIdsByRoleId(superAdminRole.getId());
                for (Long userId : userIds) {
                    permissionService.refreshUserCache(userId);
                }
            }

            // Rebuild operator/custom roles: intersect with new package
            List<Role> otherRoles = roleMapper.selectByTenantIdForPlatform(tenant.getId()).stream()
                    .filter(r -> !"super_admin".equals(r.getRoleType()))
                    .toList();
            for (Role role : otherRoles) {
                List<String> currentPerms = rolePermissionMapper.selectPermissionCodesByRoleId(role.getId());
                List<String> intersectedPerms = currentPerms.stream()
                        .filter(newPackagePerms::contains)
                        .toList();
                if (intersectedPerms.size() != currentPerms.size()) {
                    rolePermissionMapper.deleteByRoleId(role.getId());
                    for (String perm : intersectedPerms) {
                        RolePermission rp = new RolePermission();
                        rp.setRoleId(role.getId());
                        rp.setPermissionCode(perm);
                        rolePermissionMapper.insert(rp);
                    }
                    List<Long> userIds = userRoleMapper.selectUserIdsByRoleId(role.getId());
                    for (Long userId : userIds) {
                        permissionService.refreshUserCache(userId);
                    }
                }
            }

            log.info("Rebuilt tenant roles after package permission update: tenantId={}", tenant.getId());
        }
    }
}

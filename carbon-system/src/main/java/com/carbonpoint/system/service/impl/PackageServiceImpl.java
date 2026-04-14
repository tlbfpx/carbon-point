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
import com.carbonpoint.system.event.PackagePermissionUpdatedEvent;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.security.PermissionService;
import com.carbonpoint.system.service.PackageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
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
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public List<PackageRes> list() {
        List<PermissionPackage> packages = packageMapper.selectList(null);
        return toResList(packages);
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
            List<PackagePermission> perms = req.getPermissionCodes().stream()
                    .map(code -> {
                        PackagePermission pp = new PackagePermission();
                        pp.setPackageId(pkg.getId());
                        pp.setPermissionCode(code);
                        return pp;
                    })
                    .collect(Collectors.toList());
            packagePermissionMapper.batchInsert(perms);
        }

        log.info("Package created: id={}, code={}, name={}", pkg.getId(), pkg.getCode(), pkg.getName());
        return toRes(pkg);
    }

    @Override
    @Transactional
    public PackageRes update(Long id, PackageUpdateReq req) {
        PermissionPackage pkg = packageMapper.selectById(id);
        if (pkg == null) {
            throw new BusinessException(ErrorCode.PACKAGE_NOT_FOUND);
        }

        // Check code uniqueness if code is being changed
        if (req.getCode() != null && !req.getCode().equals(pkg.getCode())) {
            LambdaQueryWrapper<PermissionPackage> w = new LambdaQueryWrapper<>();
            w.eq(PermissionPackage::getCode, req.getCode());
            if (packageMapper.selectCount(w) > 0) {
                throw new BusinessException(ErrorCode.PACKAGE_CODE_DUPLICATE);
            }
            pkg.setCode(req.getCode());
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

        // Add new permissions using batch insert
        if (permissionCodes != null && !permissionCodes.isEmpty()) {
            List<PackagePermission> perms = permissionCodes.stream()
                    .map(code -> {
                        PackagePermission pp = new PackagePermission();
                        pp.setPackageId(packageId);
                        pp.setPermissionCode(code);
                        return pp;
                    })
                    .collect(Collectors.toList());
            packagePermissionMapper.batchInsert(perms);
        }

        // Publish event for async tenant role rebuild (runs AFTER_COMMIT)
        eventPublisher.publishEvent(new PackagePermissionUpdatedEvent(packageId));

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

    /**
     * Batch-convert packages to PackageRes, fetching permissions and tenant counts
     * in single queries to avoid N+1.
     */
    private List<PackageRes> toResList(List<PermissionPackage> packages) {
        if (packages.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> packageIds = packages.stream()
                .map(PermissionPackage::getId)
                .collect(Collectors.toList());

        // Single query: fetch all permissions for all packages
        List<PackagePermission> allPerms = packagePermissionMapper.selectByPackageIds(packageIds);
        Map<Long, List<String>> permsByPackage = allPerms.stream()
                .collect(Collectors.groupingBy(
                        PackagePermission::getPackageId,
                        Collectors.mapping(PackagePermission::getPermissionCode, Collectors.toList())));

        // Single query: fetch tenant counts for all packages
        List<Map<String, Object>> tenantCounts = packageMapper.countTenantsByPackageIds(packageIds);
        Map<Long, Long> tenantCountByPackage = new HashMap<>();
        for (Map<String, Object> row : tenantCounts) {
            tenantCountByPackage.put(
                    ((Number) row.get("package_id")).longValue(),
                    ((Number) row.get("cnt")).longValue());
        }

        return packages.stream()
                .map(pkg -> {
                    List<String> codes = permsByPackage.getOrDefault(pkg.getId(), Collections.emptyList());
                    return PackageRes.builder()
                            .id(pkg.getId())
                            .code(pkg.getCode())
                            .name(pkg.getName())
                            .description(pkg.getDescription())
                            .status(pkg.getStatus())
                            .permissionCount(codes.size())
                            .tenantCount(tenantCountByPackage.getOrDefault(pkg.getId(), 0L))
                            .createdAt(pkg.getCreatedAt())
                            .updatedAt(pkg.getUpdatedAt())
                            .permissionCodes(codes)
                            .build();
                })
                .toList();
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
}

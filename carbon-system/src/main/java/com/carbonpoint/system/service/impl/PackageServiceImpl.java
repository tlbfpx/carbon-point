package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.system.dto.req.PackageCreateReq;
import com.carbonpoint.system.dto.req.PackageProductFeatureUpdateReq;
import com.carbonpoint.system.dto.req.PackageProductUpdateReq;
import com.carbonpoint.system.dto.req.PackageUpdateReq;
import com.carbonpoint.system.dto.req.TenantPackageChangeReq;
import com.carbonpoint.system.dto.res.PackageDetailRes;
import com.carbonpoint.system.dto.res.PackageFeatureRes;
import com.carbonpoint.system.dto.res.PackageProductRes;
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
    private final PackageProductMapper packageProductMapper;
    private final PackageProductFeatureMapper packageProductFeatureMapper;
    private final ProductMapper productMapper;
    private final ProductFeatureMapper productFeatureMapper;
    private final PackagePermissionMapper packagePermissionMapper;
    private final PackageChangeLogMapper changeLogMapper;
    private final TenantMapper tenantMapper;
    private final RoleMapper roleMapper;
    private final RolePermissionMapper rolePermissionMapper;
    private final UserRoleMapper userRoleMapper;
    private final PermissionService permissionService;
    private final ApplicationEventPublisher eventPublisher;
    private final FeatureMapper featureMapper;

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
        List<Role> allTenantRoles = roleMapper.selectByTenantIdForPlatform(tenantId);
        List<Role> superAdminRoles = allTenantRoles.stream()
                .filter(r -> "super_admin".equals(r.getRoleType()))
                .toList();

        // Collect all user IDs that need cache refresh
        Set<Long> usersToRefresh = new HashSet<>();

        if (!superAdminRoles.isEmpty()) {
            List<Long> superAdminRoleIds = superAdminRoles.stream().map(Role::getId).toList();

            // Batch delete old permissions
            rolePermissionMapper.deleteByRoleIds(superAdminRoleIds);

            // Batch insert new permissions
            if (!newPackagePerms.isEmpty()) {
                List<RolePermission> perms = newPackagePerms.stream()
                        .flatMap(code -> superAdminRoles.stream()
                                .map(role -> {
                                    RolePermission rp = new RolePermission();
                                    rp.setRoleId(role.getId());
                                    rp.setPermissionCode(code);
                                    return rp;
                                }))
                        .toList();
                rolePermissionMapper.batchInsertRolePerms(perms);
            }

            // Collect users to refresh (batch query)
            List<Long> superAdminUserIds = userRoleMapper.selectUserIdsByRoleIds(superAdminRoleIds);
            usersToRefresh.addAll(superAdminUserIds);
        }

        // 2. Update operator/custom roles: intersect with new package permissions
        List<Role> otherRoles = allTenantRoles.stream()
                .filter(r -> !"super_admin".equals(r.getRoleType()))
                .toList();

        if (!otherRoles.isEmpty()) {
            List<Long> otherRoleIds = otherRoles.stream().map(Role::getId).toList();
            // Batch query current permissions
            List<RolePermission> allCurrentPerms = rolePermissionMapper.selectByRoleIds(otherRoleIds);

            // Group by role and calculate intersections
            Map<Long, List<String>> permsByRole = allCurrentPerms.stream()
                    .collect(Collectors.groupingBy(RolePermission::getRoleId,
                            Collectors.mapping(RolePermission::getPermissionCode, Collectors.toList())));

            List<Role> rolesWithChangedPerms = new ArrayList<>();
            List<RolePermission> newPermsToInsert = new ArrayList<>();

            for (Role role : otherRoles) {
                List<String> currentPerms = permsByRole.getOrDefault(role.getId(), List.of());
                List<String> intersectedPerms = currentPerms.stream()
                        .filter(newPackagePerms::contains)
                        .toList();
                // Only update if permissions changed
                if (intersectedPerms.size() != currentPerms.size()) {
                    rolesWithChangedPerms.add(role);
                    newPermsToInsert.addAll(intersectedPerms.stream()
                            .map(code -> {
                                RolePermission rp = new RolePermission();
                                rp.setRoleId(role.getId());
                                rp.setPermissionCode(code);
                                return rp;
                            })
                            .toList());
                }
            }

            if (!rolesWithChangedPerms.isEmpty()) {
                List<Long> changedRoleIds = rolesWithChangedPerms.stream().map(Role::getId).toList();
                // Batch delete
                rolePermissionMapper.deleteByRoleIds(changedRoleIds);
                // Batch insert
                if (!newPermsToInsert.isEmpty()) {
                    rolePermissionMapper.batchInsertRolePerms(newPermsToInsert);
                }
                // Collect users to refresh
                List<Long> changedUserIds = userRoleMapper.selectUserIdsByRoleIds(changedRoleIds);
                usersToRefresh.addAll(changedUserIds);
            }
        }

        // Refresh cache for all affected users at once (using Redis pipeline)
        if (!usersToRefresh.isEmpty()) {
            permissionService.refreshUsersCache(new ArrayList<>(usersToRefresh));
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

    // ── Package-Product management ───────────────────────────────────────────────

    @Override
    public PackageDetailRes getPackageDetail(Long id) {
        PermissionPackage pkg = packageMapper.selectById(id);
        if (pkg == null) {
            throw new BusinessException(ErrorCode.PACKAGE_NOT_FOUND);
        }

        // Fetch associated products
        List<PackageProductEntity> packageProducts = packageProductMapper.selectByPackageId(id);
        List<PackageProductRes> productResList = new ArrayList<>();

        for (PackageProductEntity pp : packageProducts) {
            ProductEntity product = productMapper.selectById(String.valueOf(pp.getProductId()));
            if (product == null) {
                continue;
            }

            // Fetch features for this product in the package
            List<PackageProductFeatureEntity> ppfList = packageProductFeatureMapper
                    .selectByPackageIdAndProductId(id, pp.getProductId());
            List<PackageFeatureRes> featureResList = buildFeatureResList(pp.getProductId(), ppfList);

            productResList.add(PackageProductRes.builder()
                    .productId(product.getId())
                    .productCode(product.getCode())
                    .productName(product.getName())
                    .productCategory(product.getCategory())
                    .productStatus(product.getStatus())
                    .sortOrder(pp.getSortOrder())
                    .features(featureResList)
                    .createTime(pp.getCreateTime())
                    .build());
        }

        return PackageDetailRes.builder()
                .id(pkg.getId())
                .code(pkg.getCode())
                .name(pkg.getName())
                .description(pkg.getDescription())
                .status(pkg.getStatus())
                .maxUsers(pkg.getMaxUsers())
                .createdAt(pkg.getCreatedAt())
                .updatedAt(pkg.getUpdatedAt())
                .products(productResList)
                .tenantCount(packageMapper.countTenantsByPackageId(id))
                .build();
    }

    @Override
    @Transactional
    public void updatePackageProducts(Long packageId, PackageProductUpdateReq req) {
        PermissionPackage pkg = packageMapper.selectById(packageId);
        if (pkg == null) {
            throw new BusinessException(ErrorCode.PACKAGE_NOT_FOUND);
        }

        if (req.getProducts() == null || req.getProducts().isEmpty()) {
            // Remove all associations
            packageProductFeatureMapper.deleteByPackageId(packageId);
            packageProductMapper.deleteByPackageId(packageId);
            log.info("All products removed from package: packageId={}", packageId);
            return;
        }

        // 1. Remove existing features for this package (they will be re-inserted)
        packageProductFeatureMapper.deleteByPackageId(packageId);

        // 2. Remove existing product associations (they will be re-inserted)
        packageProductMapper.deleteByPackageId(packageId);

        // 3. Re-insert product associations and features
        List<PackageProductEntity> packageProducts = new ArrayList<>();
        for (PackageProductUpdateReq.ProductItem item : req.getProducts()) {
            PackageProductEntity pp = new PackageProductEntity();
            pp.setPackageId(packageId);
            pp.setProductId(item.getProductId());
            pp.setSortOrder(item.getSortOrder() != null ? item.getSortOrder() : 0);
            packageProducts.add(pp);

            // Insert features if provided
            if (item.getFeatures() != null && !item.getFeatures().isEmpty()) {
                List<PackageProductFeatureEntity> features = new ArrayList<>();
                for (PackageProductUpdateReq.FeatureItem fi : item.getFeatures()) {
                    PackageProductFeatureEntity ppf = new PackageProductFeatureEntity();
                    ppf.setPackageId(packageId);
                    ppf.setProductId(item.getProductId());
                    ppf.setFeatureId(fi.getFeatureId());
                    ppf.setConfigValue(fi.getConfigValue());
                    ppf.setIsEnabled(fi.getIsEnabled() != null ? fi.getIsEnabled() : true);
                    // Determine if customized: compare with product default
                    ppf.setIsCustomized(determineIfCustomized(item.getProductId(), fi.getFeatureId(), fi.getConfigValue()));
                    features.add(ppf);
                }
                packageProductFeatureMapper.batchInsert(features);
            }
        }

        // Batch insert package-product associations
        for (PackageProductEntity pp : packageProducts) {
            packageProductMapper.insert(pp);
        }

        log.info("Package products updated: packageId={}, productCount={}", packageId, packageProducts.size());
    }

    @Override
    public List<PackageFeatureRes> getPackageProductFeatures(Long packageId, Long productId) {
        PermissionPackage pkg = packageMapper.selectById(packageId);
        if (pkg == null) {
            throw new BusinessException(ErrorCode.PACKAGE_NOT_FOUND);
        }

        List<PackageProductFeatureEntity> ppfList = packageProductFeatureMapper
                .selectByPackageIdAndProductId(packageId, productId);
        return buildFeatureResList(productId, ppfList);
    }

    @Override
    @Transactional
    public void updatePackageProductFeatures(Long packageId, Long productId, PackageProductFeatureUpdateReq req) {
        PermissionPackage pkg = packageMapper.selectById(packageId);
        if (pkg == null) {
            throw new BusinessException(ErrorCode.PACKAGE_NOT_FOUND);
        }

        // Remove existing features for this package-product
        packageProductFeatureMapper.deleteByPackageIdAndProductId(packageId, productId);

        // Ensure package-product association exists
        PackageProductEntity existingPp = packageProductMapper.selectByPackageIdAndProductId(packageId, productId);
        if (existingPp == null) {
            PackageProductEntity pp = new PackageProductEntity();
            pp.setPackageId(packageId);
            pp.setProductId(productId);
            pp.setSortOrder(0);
            packageProductMapper.insert(pp);
        }

        // Insert new features
        if (req.getFeatures() != null && !req.getFeatures().isEmpty()) {
            List<PackageProductFeatureEntity> features = new ArrayList<>();
            for (PackageProductFeatureUpdateReq.FeatureItem fi : req.getFeatures()) {
                PackageProductFeatureEntity ppf = new PackageProductFeatureEntity();
                ppf.setPackageId(packageId);
                ppf.setProductId(productId);
                ppf.setFeatureId(fi.getFeatureId());
                ppf.setConfigValue(fi.getConfigValue());
                ppf.setIsEnabled(fi.getIsEnabled() != null ? fi.getIsEnabled() : true);
                ppf.setIsCustomized(determineIfCustomized(productId, fi.getFeatureId(), fi.getConfigValue()));
                features.add(ppf);
            }
            packageProductFeatureMapper.batchInsert(features);
        }

        log.info("Package product features updated: packageId={}, productId={}, featureCount={}",
                packageId, productId, req.getFeatures() != null ? req.getFeatures().size() : 0);
    }

    /**
     * Build feature response list by enriching with product defaults and system defaults.
     */
    private List<PackageFeatureRes> buildFeatureResList(Long productId, List<PackageProductFeatureEntity> ppfList) {
        if (ppfList.isEmpty()) {
            return Collections.emptyList();
        }

        // Batch fetch product features to get defaults
        List<ProductFeatureEntity> productFeatures = productFeatureMapper.selectByProductId(String.valueOf(productId));
        Map<String, ProductFeatureEntity> productFeatureMap = productFeatures.stream()
                .collect(Collectors.toMap(ProductFeatureEntity::getFeatureId, pf -> pf));

        // Batch fetch features to get system defaults
        List<String> featureIds = ppfList.stream()
                .map(PackageProductFeatureEntity::getFeatureId)
                .collect(Collectors.toList());
        List<FeatureEntity> systemFeatures = featureIds.isEmpty() ? Collections.emptyList()
                : featureIds.stream()
                        .map(id -> {
                            LambdaQueryWrapper<FeatureEntity> w = new LambdaQueryWrapper<>();
                            w.eq(FeatureEntity::getId, id);
                            return featureMapper.selectOne(w);
                        })
                        .filter(Objects::nonNull)
                        .toList();
        Map<String, FeatureEntity> featureMap = systemFeatures.stream()
                .collect(Collectors.toMap(FeatureEntity::getId, f -> f));

        return ppfList.stream()
                .map(ppf -> {
                    ProductFeatureEntity pf = productFeatureMap.get(ppf.getFeatureId());
                    FeatureEntity sf = featureMap.get(ppf.getFeatureId());
                    return PackageFeatureRes.builder()
                            .featureId(ppf.getFeatureId())
                            .featureCode(sf != null ? sf.getCode() : null)
                            .featureName(sf != null ? sf.getName() : null)
                            .featureType(sf != null ? sf.getType() : null)
                            .valueType(sf != null ? sf.getValueType() : null)
                            .configValue(ppf.getConfigValue())
                            .isEnabled(ppf.getIsEnabled())
                            .isCustomized(ppf.getIsCustomized())
                            .productDefaultValue(pf != null ? pf.getConfigValue() : null)
                            .systemDefaultValue(sf != null ? sf.getDefaultValue() : null)
                            .createTime(ppf.getCreateTime())
                            .updateTime(ppf.getUpdateTime())
                            .build();
                })
                .toList();
    }

    /**
     * Determine if the config value has been customized (differs from product default).
     */
    private Boolean determineIfCustomized(Long productId, String featureId, String configValue) {
        ProductFeatureEntity pf = productFeatureMapper.selectByProductIdAndFeatureId(String.valueOf(productId), featureId);
        if (pf == null || pf.getConfigValue() == null) {
            return false;
        }
        return !pf.getConfigValue().equals(configValue);
    }
}

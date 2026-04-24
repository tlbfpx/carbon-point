package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.system.dto.TenantRequest;
import com.carbonpoint.system.dto.TenantVO;
import com.carbonpoint.system.mapper.PermissionPackageMapper;
import com.carbonpoint.system.mapper.TenantMapper;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.service.PlatformTenantService;
import com.carbonpoint.system.service.RoleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.time.format.DateTimeFormatter;

/**
 * Platform-level tenant management service.
 * All methods access the tenants table directly (bypasses tenant interceptor
 * because "tenants" is in CustomTenantLineHandler.IGNORE_TABLES).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PlatformTenantServiceImpl implements PlatformTenantService {

    private final TenantMapper tenantMapper;
    private final RoleService roleService;
    private final PermissionPackageMapper permissionPackageMapper;

    @Override
    public IPage<TenantVO> listTenants(int page, int pageSize, String keyword, String status) {
        // Use @InterceptorIgnore-aware mapper to bypass TenantLineInnerInterceptor.
        // The standard selectPage() would inject WHERE tenant_id = ? which fails
        // because the tenants table itself has no tenant_id column.
        long offset = (long) (page - 1) * pageSize;
        List<Tenant> records = tenantMapper.selectPageForPlatform(keyword, offset, pageSize);
        long total = tenantMapper.countForPlatform(keyword);

        Page<TenantVO> result = new Page<>(page, pageSize, total);
        result.setRecords(records.stream().map(this::toVO).toList());
        return result;
    }

    @Override
    public TenantVO getTenantByIdForPlatform(Long tenantId) {
        Tenant tenant = tenantMapper.selectById(tenantId);
        if (tenant == null) {
            throw new BusinessException(ErrorCode.TENANT_NOT_FOUND);
        }
        TenantVO vo = toVO(tenant);
        // TODO: Populate currentUsers from users table count (Phase 3)
        vo.setCurrentUsers(0);
        return vo;
    }

    @Override
    @Transactional
    public void suspendTenant(Long tenantId, Long operatorId) {
        Tenant tenant = tenantMapper.selectById(tenantId);
        if (tenant == null) {
            throw new BusinessException(ErrorCode.TENANT_NOT_FOUND);
        }

        tenant.setStatus("suspended");
        tenant.setUpdatedAt(LocalDateTime.now());
        tenantMapper.updateById(tenant);

        log.info("Tenant suspended: id={}, by={}", tenantId, operatorId);
    }

    @Override
    @Transactional
    public void activateTenant(Long tenantId, Long operatorId) {
        Tenant tenant = tenantMapper.selectById(tenantId);
        if (tenant == null) {
            throw new BusinessException(ErrorCode.TENANT_NOT_FOUND);
        }

        tenant.setStatus("active");
        tenant.setUpdatedAt(LocalDateTime.now());
        tenantMapper.updateById(tenant);

        log.info("Tenant activated: id={}, by={}", tenantId, operatorId);
    }

    @Override
    @Transactional
    public TenantVO createTenant(TenantRequest request, Long operatorId) {
        // Check for duplicate name
        long count = tenantMapper.selectCount(
                new LambdaQueryWrapper<Tenant>()
                        .eq(Tenant::getName, request.getName())
        );
        if (count > 0) {
            throw new BusinessException(ErrorCode.TENANT_NAME_DUPLICATE);
        }

        // Resolve packageId: use explicit packageId if provided,
        // otherwise look up by packageType (legacy support via package code matching)
        Long packageId = request.getPackageId();
        if (packageId == null && request.getPackageType() != null) {
            // Try to find a package whose code matches the packageType (e.g. "free", "pro", "enterprise")
            String packageType = request.getPackageType().toLowerCase();
            var pkg = permissionPackageMapper.selectList(
                    new LambdaQueryWrapper<com.carbonpoint.system.entity.PermissionPackage>()
                            .eq(com.carbonpoint.system.entity.PermissionPackage::getCode, packageType)
                            .eq(com.carbonpoint.system.entity.PermissionPackage::getStatus, true)
            );
            if (!pkg.isEmpty()) {
                packageId = pkg.get(0).getId();
            }
        }

        Tenant tenant = new Tenant();
        tenant.setName(request.getName());
        tenant.setLogoUrl(request.getLogoUrl());
        tenant.setPackageId(packageId);
        tenant.setPackageType(request.getPackageType() != null ? request.getPackageType() : "free");
        tenant.setMaxUsers(request.getMaxUsers() != null ? request.getMaxUsers() : 100);
        tenant.setStatus("active");
        tenant.setCreatedAt(LocalDateTime.now());
        tenant.setUpdatedAt(LocalDateTime.now());

        // Parse expire_time if provided
        if (request.getExpireTime() != null && !request.getExpireTime().isBlank()) {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            tenant.setExpireTime(LocalDateTime.parse(request.getExpireTime(), formatter));
        }

        tenantMapper.insert(tenant);

        // Initialize super_admin role for the new tenant
        if (packageId != null) {
            roleService.initSuperAdminRole(tenant.getId(), packageId, null);
        }

        log.info("Tenant created: id={}, name={}, packageId={}, by={}",
                tenant.getId(), tenant.getName(), packageId, operatorId);

        return toVO(tenant);
    }

    private TenantVO toVO(Tenant tenant) {
        return TenantVO.builder()
                .id(tenant.getId())
                .name(tenant.getName())
                .logoUrl(tenant.getLogoUrl())
                .packageType(tenant.getPackageType())
                .packageId(tenant.getPackageId())
                .maxUsers(tenant.getMaxUsers())
                .status(tenant.getStatus())
                .expireTime(tenant.getExpireTime())
                .createdAt(tenant.getCreatedAt())
                .build();
    }
}

package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.security.AppPasswordEncoder;
import com.carbonpoint.system.dto.req.*;
import com.carbonpoint.system.dto.res.*;
import com.carbonpoint.system.entity.*;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.service.TenantService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TenantServiceImpl implements TenantService {

    private final TenantMapper tenantMapper;
    private final RoleMapper roleMapper;
    private final RolePermissionMapper rolePermissionMapper;
    private final UserMapper userMapper;

    @Override
    @Transactional
    public TenantDetailRes create(TenantCreateReq req) {
        Tenant tenant = new Tenant();
        tenant.setName(req.getName());
        tenant.setLogoUrl(req.getLogoUrl());
        tenant.setPackageType(req.getPackageType() != null ? req.getPackageType() : "free");
        tenant.setMaxUsers(req.getMaxUsers() != null ? req.getMaxUsers() : 50);
        tenant.setExpireTime(req.getExpireTime());
        tenant.setStatus("active");
        tenantMapper.insert(tenant);

        Long tenantId = tenant.getId();
        initializePresetRoles(tenantId);

        return getById(tenantId);
    }

    private void initializePresetRoles(Long tenantId) {
        Map<String, List<String>> presetRolePermissions = new LinkedHashMap<>();
        presetRolePermissions.put("超级管理员", List.of(
                "enterprise:dashboard:view",
                "enterprise:member:list", "enterprise:member:create", "enterprise:member:import",
                "enterprise:member:invite", "enterprise:member:edit", "enterprise:member:disable",
                "enterprise:rule:view", "enterprise:rule:create", "enterprise:rule:edit",
                "enterprise:rule:delete", "enterprise:rule:toggle",
                "enterprise:product:list", "enterprise:product:create", "enterprise:product:edit",
                "enterprise:product:delete", "enterprise:product:toggle", "enterprise:product:stock",
                "enterprise:order:list", "enterprise:order:fulfill", "enterprise:order:cancel",
                "enterprise:point:query", "enterprise:point:add", "enterprise:point:deduct", "enterprise:point:export",
                "enterprise:report:view", "enterprise:report:export",
                "enterprise:branding:manage",
                "enterprise:role:list", "enterprise:role:create", "enterprise:role:edit", "enterprise:role:delete"
        ));
        presetRolePermissions.put("运营管理员", List.of(
                "enterprise:dashboard:view",
                "enterprise:member:list", "enterprise:member:create", "enterprise:member:import",
                "enterprise:member:invite", "enterprise:member:edit", "enterprise:member:disable",
                "enterprise:rule:view", "enterprise:rule:create", "enterprise:rule:edit",
                "enterprise:rule:delete", "enterprise:rule:toggle",
                "enterprise:point:query", "enterprise:point:add", "enterprise:point:deduct",
                "enterprise:report:view", "enterprise:report:export"
        ));
        presetRolePermissions.put("客服", List.of(
                "enterprise:dashboard:view",
                "enterprise:member:list", "enterprise:member:edit",
                "enterprise:order:list", "enterprise:order:fulfill", "enterprise:order:cancel",
                "enterprise:point:query"
        ));
        presetRolePermissions.put("商品管理员", List.of(
                "enterprise:product:list", "enterprise:product:create", "enterprise:product:edit",
                "enterprise:product:delete", "enterprise:product:toggle", "enterprise:product:stock",
                "enterprise:order:list", "enterprise:order:fulfill", "enterprise:order:cancel"
        ));
        presetRolePermissions.put("只读", List.of(
                "enterprise:dashboard:view",
                "enterprise:member:list",
                "enterprise:rule:view",
                "enterprise:product:list",
                "enterprise:order:list",
                "enterprise:point:query",
                "enterprise:report:view"
        ));

        for (Map.Entry<String, List<String>> entry : presetRolePermissions.entrySet()) {
            Role role = new Role();
            role.setTenantId(tenantId);
            role.setName(entry.getKey());
            role.setIsPreset(true);
            roleMapper.insert(role);

            Long roleId = role.getId();
            for (String permCode : entry.getValue()) {
                RolePermission rp = new RolePermission();
                rp.setRoleId(roleId);
                rp.setPermissionCode(permCode);
                rolePermissionMapper.insert(rp);
            }
        }
    }

    @Override
    @Transactional
    public TenantDetailRes update(Long id, TenantUpdateReq req) {
        Tenant tenant = tenantMapper.selectByIdForPlatform(id);
        if (tenant == null) {
            throw new BusinessException(ErrorCode.TENANT_NOT_FOUND);
        }
        if (req.getName() != null) tenant.setName(req.getName());
        if (req.getLogoUrl() != null) tenant.setLogoUrl(req.getLogoUrl());
        if (req.getPackageType() != null) tenant.setPackageType(req.getPackageType());
        if (req.getMaxUsers() != null) tenant.setMaxUsers(req.getMaxUsers());
        if (req.getExpireTime() != null) tenant.setExpireTime(req.getExpireTime());
        tenantMapper.updateById(tenant);
        return getById(id);
    }

    @Override
    @Transactional
    public void suspend(Long id) {
        Tenant tenant = tenantMapper.selectByIdForPlatform(id);
        if (tenant == null) {
            throw new BusinessException(ErrorCode.TENANT_NOT_FOUND);
        }
        tenant.setStatus("suspended");
        tenantMapper.updateById(tenant);

        // Batch update all users to inactive status
        LambdaUpdateWrapper<User> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.eq(User::getTenantId, id).set(User::getStatus, "inactive");
        userMapper.update(null, updateWrapper);
    }

    @Override
    @Transactional
    public void activate(Long id) {
        Tenant tenant = tenantMapper.selectByIdForPlatform(id);
        if (tenant == null) {
            throw new BusinessException(ErrorCode.TENANT_NOT_FOUND);
        }
        tenant.setStatus("active");
        tenantMapper.updateById(tenant);

        // Batch update all users to active status
        LambdaUpdateWrapper<User> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.eq(User::getTenantId, id).set(User::getStatus, "active");
        userMapper.update(null, updateWrapper);
    }

    @Override
    public TenantDetailRes getById(Long id) {
        Tenant tenant = tenantMapper.selectByIdForPlatform(id);
        if (tenant == null) {
            throw new BusinessException(ErrorCode.TENANT_NOT_FOUND);
        }
        long userCount = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getTenantId, id));

        return TenantDetailRes.builder()
                .id(tenant.getId())
                .name(tenant.getName())
                .logoUrl(tenant.getLogoUrl())
                .packageType(tenant.getPackageType())
                .maxUsers(tenant.getMaxUsers())
                .status(tenant.getStatus())
                .expireTime(tenant.getExpireTime())
                .userCount((int) userCount)
                .createdAt(tenant.getCreatedAt())
                .build();
    }

    @Override
    public PageRes<TenantDetailRes> list(PageReq req) {
        long page = req.getPage();
        long pageSize = req.getPageSize();
        long offset = (page - 1) * pageSize;

        long total = tenantMapper.countForPlatform(req.getKeyword());
        List<Tenant> tenants = tenantMapper.selectPageForPlatform(req.getKeyword(), offset, pageSize);

        // Fetch all user counts in a single query to avoid N+1
        Map<Long, Integer> userCountMap = tenantMapper.countUsersByTenantId().stream()
                .collect(Collectors.toMap(
                        m -> ((Number) m.get("tenant_id")).longValue(),
                        m -> ((Number) m.get("cnt")).intValue()));

        List<TenantDetailRes> records = tenants.stream().map(t ->
                TenantDetailRes.builder()
                        .id(t.getId())
                        .name(t.getName())
                        .logoUrl(t.getLogoUrl())
                        .packageType(t.getPackageType())
                        .maxUsers(t.getMaxUsers())
                        .status(t.getStatus())
                        .expireTime(t.getExpireTime())
                        .userCount(userCountMap.getOrDefault(t.getId(), 0))
                        .createdAt(t.getCreatedAt())
                        .build()).toList();

        return PageRes.<TenantDetailRes>builder()
                .total(total)
                .records(records)
                .build();
    }
}

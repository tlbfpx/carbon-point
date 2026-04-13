package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.security.AppPasswordEncoder;
import com.carbonpoint.system.dto.req.*;
import com.carbonpoint.system.dto.res.*;
import com.carbonpoint.system.entity.*;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.service.TenantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class TenantServiceImpl implements TenantService {

    @Autowired
    private TenantMapper tenantMapper;

    @Autowired
    private RoleMapper roleMapper;

    @Autowired
    private RolePermissionMapper rolePermissionMapper;

    @Autowired
    private UserMapper userMapper;

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
                "enterprise:report:view", "enterprise:report:export"
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
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getTenantId, id);
        List<User> users = userMapper.selectList(wrapper);
        for (User user : users) {
            user.setStatus("disabled");
            userMapper.updateById(user);
        }
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
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getTenantId, id);
        List<User> users = userMapper.selectList(wrapper);
        for (User user : users) {
            user.setStatus("active");
            userMapper.updateById(user);
        }
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

        List<TenantDetailRes> records = tenants.stream().map(t -> {
            long userCount = userMapper.selectCount(
                    new LambdaQueryWrapper<User>().eq(User::getTenantId, t.getId()));
            return TenantDetailRes.builder()
                    .id(t.getId())
                    .name(t.getName())
                    .logoUrl(t.getLogoUrl())
                    .packageType(t.getPackageType())
                    .maxUsers(t.getMaxUsers())
                    .status(t.getStatus())
                    .expireTime(t.getExpireTime())
                    .userCount((int) userCount)
                    .createdAt(t.getCreatedAt())
                    .build();
        }).toList();

        return PageRes.<TenantDetailRes>builder()
                .total(total)
                .records(records)
                .build();
    }
}

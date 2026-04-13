package com.carbonpoint.system.service.impl;

import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.system.dto.res.RoleDetailRes;
import com.carbonpoint.system.entity.*;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.security.CurrentUser;
import com.carbonpoint.system.security.PermissionService;
import com.carbonpoint.system.service.UserRoleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserRoleServiceImpl implements UserRoleService {

    @Autowired
    private UserRoleMapper userRoleMapper;

    @Autowired
    private RoleMapper roleMapper;

    @Autowired
    private RolePermissionMapper rolePermissionMapper;

    @Autowired
    private PermissionService permissionService;

    @Autowired
    private CurrentUser currentUser;

    @Override
    public List<RoleDetailRes> getUserRoles(Long userId) {
        List<Long> roleIds = userRoleMapper.selectRoleIdsByUserId(userId);
        return roleIds.stream().map(roleId -> {
            Role role = roleMapper.selectById(roleId);
            List<String> permCodes = rolePermissionMapper.selectPermissionCodesByRoleId(roleId);
            return RoleDetailRes.builder()
                    .id(role.getId())
                    .tenantId(role.getTenantId())
                    .name(role.getName())
                    .isPreset(role.getIsPreset())
                    .permissionCodes(permCodes)
                    .createdAt(role.getCreatedAt())
                    .build();
        }).toList();
    }

    @Override
    @Transactional
    public void assignRoles(Long userId, List<Long> roleIds) {
        // Delete existing
        userRoleMapper.deleteByUserId(userId);
        // Insert new
        for (Long roleId : roleIds) {
            UserRole ur = new UserRole();
            ur.setUserId(userId);
            ur.setRoleId(roleId);
            userRoleMapper.insert(ur);
        }
        // Refresh permission cache
        permissionService.refreshUserCache(userId);
    }
}

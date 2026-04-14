package com.carbonpoint.system.service.impl;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.system.dto.res.RoleDetailRes;
import com.carbonpoint.system.entity.*;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.security.CurrentUser;
import com.carbonpoint.system.security.PermissionService;
import com.carbonpoint.system.service.UserRoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserRoleServiceImpl implements UserRoleService {

    private final UserRoleMapper userRoleMapper;
    private final RoleMapper roleMapper;
    private final RolePermissionMapper rolePermissionMapper;
    private final PermissionService permissionService;
    private final CurrentUser currentUser;
    private final UserMapper userMapper;

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
        // Validate all roles belong to the same tenant as the user
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        Long userTenantId = user.getTenantId();

        for (Long roleId : roleIds) {
            Role role = roleMapper.selectById(roleId);
            if (role == null) {
                throw new BusinessException(ErrorCode.NOT_FOUND);
            }
            if (!userTenantId.equals(role.getTenantId())) {
                throw new BusinessException(ErrorCode.ROLE_NOT_IN_TENANT,
                        "角色 %s 不属于用户所在租户".formatted(role.getName()));
            }
        }

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

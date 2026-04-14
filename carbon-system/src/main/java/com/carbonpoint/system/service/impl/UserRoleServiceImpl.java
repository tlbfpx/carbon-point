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
import java.util.Map;
import java.util.stream.Collectors;

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
        if (roleIds.isEmpty()) {
            return List.of();
        }

        // Batch-fetch all roles and permissions to avoid N+1
        List<Role> roles = roleMapper.selectBatchIds(roleIds);
        Map<Long, List<String>> permMap = rolePermissionMapper.selectByRoleIds(roleIds).stream()
                .collect(Collectors.groupingBy(
                        RolePermission::getRoleId,
                        Collectors.mapping(RolePermission::getPermissionCode,
                                Collectors.toList())));

        return roles.stream().map(role -> RoleDetailRes.builder()
                .id(role.getId())
                .tenantId(role.getTenantId())
                .name(role.getName())
                .isPreset(role.getIsPreset())
                .permissionCodes(permMap.getOrDefault(role.getId(), List.of()))
                .createdAt(role.getCreatedAt())
                .build()).toList();
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

        // Batch-fetch all roles to avoid N+1
        List<Role> roles = roleMapper.selectBatchIds(roleIds);
        if (roles.size() != roleIds.size()) {
            throw new BusinessException(ErrorCode.NOT_FOUND);
        }
        for (Role role : roles) {
            if (!userTenantId.equals(role.getTenantId())) {
                throw new BusinessException(ErrorCode.ROLE_NOT_IN_TENANT,
                        "角色 %s 不属于用户所在租户".formatted(role.getName()));
            }
        }

        // Delete existing
        userRoleMapper.deleteByUserId(userId);
        // Batch-insert new
        if (!roleIds.isEmpty()) {
            List<UserRole> urList = roleIds.stream()
                    .map(roleId -> {
                        UserRole ur = new UserRole();
                        ur.setUserId(userId);
                        ur.setRoleId(roleId);
                        return ur;
                    }).toList();
            userRoleMapper.batchInsert(urList);
        }
        // Refresh permission cache
        permissionService.refreshUserCache(userId);
    }
}

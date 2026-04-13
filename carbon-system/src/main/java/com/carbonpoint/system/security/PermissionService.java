package com.carbonpoint.system.security;

import com.carbonpoint.system.entity.Role;
import com.carbonpoint.system.mapper.PermissionMapper;
import com.carbonpoint.system.mapper.RoleMapper;
import com.carbonpoint.system.mapper.RolePermissionMapper;
import com.carbonpoint.system.mapper.UserRoleMapper;
import org.redisson.api.RSet;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;

/**
 * Permission query service with Redis caching.
 */
@Service
@RequiredArgsConstructor
public class PermissionService {

    private static final String PERMISSION_CACHE_KEY = "user:permissions:";
    private static final long CACHE_TTL_SECONDS = 3600;

    private final PermissionMapper permissionMapper;
    private final UserRoleMapper userRoleMapper;
    private final RolePermissionMapper rolePermissionMapper;
    private final RoleMapper roleMapper;
    private final RedissonClient redissonClient;

    /**
     * Get all permission codes for a user (union of all roles).
     * Results are cached in Redis.
     */
    public List<String> getUserPermissions(Long userId) {
        String cacheKey = PERMISSION_CACHE_KEY + userId;

        RSet<String> cached = redissonClient.getSet(cacheKey);
        if (cached != null && !cached.isEmpty()) {
            return new ArrayList<>(cached);
        }

        // Multi-role union
        Set<String> permissions = new HashSet<>(permissionMapper.selectPermissionCodesByUserId(userId));
        List<String> result = new ArrayList<>(permissions);

        // Cache the result
        if (cached != null) {
            cached.addAll(result);
            cached.expire(CACHE_TTL_SECONDS, TimeUnit.SECONDS);
        }

        return result;
    }

    /**
     * Refresh permission cache for a user.
     */
    public void refreshUserCache(Long userId) {
        redissonClient.getSet(PERMISSION_CACHE_KEY + userId).delete();
    }

    /**
     * Refresh permission cache for all users in a tenant.
     */
    public void refreshTenantCache(Long tenantId) {
        List<Role> roles = roleMapper.selectByTenantIdForPlatform(tenantId);
        if (roles != null) {
            Set<Long> processedUserIds = new HashSet<>();
            for (Role role : roles) {
                List<Long> userIds = userRoleMapper.selectUserIdsByRoleId(role.getId());
                if (userIds != null) {
                    for (Long userId : userIds) {
                        if (!processedUserIds.contains(userId)) {
                            refreshUserCache(userId);
                            processedUserIds.add(userId);
                        }
                    }
                }
            }
        }
    }
}

package com.carbonpoint.system.security;

import com.carbonpoint.common.security.PlatformAdminContext;
import com.carbonpoint.common.security.PlatformAdminInfo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Permission query service for platform admins.
 * Maps platform admin roles to permission codes.
 * Permissions are configured per-role rather than per-user for platform admins (MVP scope).
 */
@Slf4j
@Service
public class PlatformPermissionService {

    private static final List<String> ALL_PERMISSIONS = List.of(
            "platform:dashboard:view",
            "platform:enterprise:list",
            "platform:enterprise:manage",
            "platform:system:view",
            "platform:system:manage",
            "platform:system:user:list",
            "platform:system:user:manage",
            "platform:system:role:list",
            "platform:system:role:manage",
            "platform:system:log:query",
            "platform:system:dict:view",
            "platform:system:dict:manage",
            "platform:config:view",
            "platform:config:manage",
            "platform:admin:list",
            "platform:admin:manage",
            "platform:product:list",
            "platform:product:manage",
            "platform:feature:list",
            "platform:feature:manage",
            "platform:package:list",
            "platform:package:manage",
            "platform:report:view"
    );

    private static final Map<String, List<String>> ROLE_PERMISSIONS = Map.of(
            "super_admin", ALL_PERMISSIONS,
            "admin", List.of(
                    "platform:dashboard:view",
                    "platform:enterprise:list",
                    "platform:enterprise:manage",
                    "platform:system:view",
                    "platform:config:view",
                    "platform:config:manage",
                    "platform:admin:list",
                    "platform:admin:manage",
                    "platform:product:list",
                    "platform:product:manage",
                    "platform:feature:list",
                    "platform:feature:manage",
                    "platform:package:list",
                    "platform:package:manage",
                    "platform:report:view"
            ),
            "operator", List.of(
                    "platform:dashboard:view",
                    "platform:enterprise:list",
                    "platform:package:list",
                    "platform:product:list",
                    "platform:report:view"
            ),
            "viewer", List.of(
                    "platform:dashboard:view",
                    "platform:enterprise:list",
                    "platform:package:list",
                    "platform:report:view"
            )
    );

    /**
     * Get all permission codes for the current platform admin from PlatformAdminContext.
     */
    public List<String> getCurrentAdminPermissions() {
        PlatformAdminInfo admin = PlatformAdminContext.get();
        if (admin == null) {
            return List.of();
        }
        return getPermissionsByRole(admin.getRole());
    }

    /**
     * Get permission codes by role name.
     */
    public List<String> getPermissionsByRole(String role) {
        return ROLE_PERMISSIONS.getOrDefault(role, List.of());
    }
}

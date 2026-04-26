package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.security.PlatformAdminContext;
import com.carbonpoint.system.dto.res.PermissionTreeRes;
import com.carbonpoint.system.security.PlatformPermissionService;
import com.carbonpoint.system.service.PermissionQueryService;
import lombok.Data;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Platform admin permissions controller.
 * Endpoints for platform-level permission queries.
 * All endpoints require platform admin authentication (handled by PlatformAuthenticationFilter).
 */
@RestController
@RequestMapping("/platform/permissions")
public class PlatformPermissionController {

    private final PlatformPermissionService permissionService;
    private final PermissionQueryService permissionQueryService;

    public PlatformPermissionController(PlatformPermissionService permissionService, PermissionQueryService permissionQueryService) {
        this.permissionService = permissionService;
        this.permissionQueryService = permissionQueryService;
    }

    @Data
    public static class PermissionInfo {
        private String code;
        private String name;
        private String description;

        public PermissionInfo(String code, String name, String description) {
            this.code = code;
            this.name = name;
            this.description = description;
        }
    }

    /**
     * Get permission tree for platform admin (only platform:* permissions).
     */
    @GetMapping("/tree")
    public Result<List<PermissionTreeRes>> getPermissionTree() {
        try {
            List<PermissionTreeRes> allPermissions = permissionQueryService.getPermissionTree();
            // Filter to only platform permissions
            List<PermissionTreeRes> platformPermissions = allPermissions.stream()
                    .filter(node -> node.getKey() != null && node.getKey().startsWith("platform:"))
                    .collect(Collectors.toList());

            // Also filter children
            for (PermissionTreeRes node : platformPermissions) {
                if (node.getChildren() != null) {
                    List<PermissionTreeRes> filteredChildren = node.getChildren().stream()
                            .filter(child -> child.getKey() != null && child.getKey().startsWith("platform:"))
                            .collect(Collectors.toList());
                    node.setChildren(filteredChildren);
                }
            }

            return Result.success(platformPermissions);
        } catch (Exception e) {
            e.printStackTrace();
            return Result.error("SYSTEM001", "构建权限树失败: " + e.getMessage());
        }
    }

    /**
     * Get current platform admin's permissions based on their role.
     * This endpoint requires authentication - PlatformAuthenticationFilter sets PlatformAdminContext.
     */
    @GetMapping("/my")
    public Result<List<String>> getMyPermissions() {
        var admin = PlatformAdminContext.get();
        if (admin == null) {
            return Result.error(ErrorCode.UNAUTHORIZED.getCode(), "Unauthorized");
        }
        List<String> permissions = permissionService.getCurrentAdminPermissions();
        return Result.success(permissions);
    }

    /**
     * Get all available platform permissions (for permissions management page).
     * This endpoint requires authentication - PlatformAuthenticationFilter sets PlatformAdminContext.
     */
    @GetMapping("/all")
    public Result<List<PermissionInfo>> getAllPermissions() {
        var admin = PlatformAdminContext.get();
        if (admin == null) {
            return Result.error(ErrorCode.UNAUTHORIZED.getCode(), "Unauthorized");
        }

        // Get all permissions from database and filter platform ones
        List<PermissionTreeRes> tree = permissionQueryService.getPermissionTree();
        List<PermissionInfo> allPermissions = new ArrayList<>();

        for (PermissionTreeRes module : tree) {
            if (module.getChildren() != null) {
                for (PermissionTreeRes perm : module.getChildren()) {
                    if (perm.getCode() != null && perm.getCode().startsWith("platform:")) {
                        allPermissions.add(new PermissionInfo(perm.getCode(), perm.getName(), perm.getName()));
                    }
                }
            }
        }

        return Result.success(allPermissions);
    }
}

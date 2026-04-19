package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.security.PlatformAdminContext;
import com.carbonpoint.system.security.PlatformPermissionService;
import lombok.Data;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Platform admin permissions controller.
 * Endpoints for platform-level permission queries.
 * All endpoints require platform admin authentication (handled by PlatformAuthenticationFilter).
 */
@RestController
@RequestMapping("/platform/permissions")
public class PlatformPermissionController {

    private final PlatformPermissionService permissionService;

    public PlatformPermissionController(PlatformPermissionService permissionService) {
        this.permissionService = permissionService;
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
        List<PermissionInfo> allPermissions = List.of(
            new PermissionInfo("platform:dashboard:view", "查看平台看板", "平台看板访问权限"),
            new PermissionInfo("platform:enterprise:list", "查看企业列表", "查看所有企业信息"),
            new PermissionInfo("platform:enterprise:manage", "管理企业", "创建、编辑、停用企业"),
            new PermissionInfo("platform:system:view", "查看系统管理", "访问系统管理模块"),
            new PermissionInfo("platform:system:manage", "管理系统管理", "管理系统配置和参数"),
            new PermissionInfo("platform:config:view", "查看平台配置", "查看平台配置信息"),
            new PermissionInfo("platform:config:manage", "管理平台配置", "修改平台配置"),
            new PermissionInfo("platform:admin:list", "查看管理员列表", "查看平台管理员"),
            new PermissionInfo("platform:admin:manage", "管理管理员", "创建、编辑、禁用管理员"),
            new PermissionInfo("platform:package:view", "查看套餐列表", "查看权限套餐"),
            new PermissionInfo("platform:package:manage", "管理套餐", "创建、编辑、删除套餐")
        );
        return Result.success(allPermissions);
    }
}

package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.res.PermissionTreeRes;
import com.carbonpoint.system.security.CurrentUser;
import com.carbonpoint.system.service.PermissionQueryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/permissions")
public class PermissionController {

    @Autowired
    private PermissionQueryService permissionQueryService;

    @Autowired
    private CurrentUser currentUser;

    @GetMapping("/tree")
    public Result<List<PermissionTreeRes>> getTree() {
        return Result.success(permissionQueryService.getPermissionTree());
    }

    @GetMapping("/my")
    public Result<List<String>> getMyPermissions() {
        currentUser.initFromSecurityContext();
        return Result.success(permissionQueryService.getMyPermissions(currentUser.getUserId()));
    }
}

/**
 * System permissions controller for enterprise admin.
 * Provides permission tree data for role management.
 */
@RestController
@RequestMapping("/api/system/permissions")
class SystemPermissionController {

    @Autowired
    private PermissionQueryService permissionQueryService;

    @GetMapping
    public Result<List<PermissionTreeRes>> getPermissions() {
        return Result.success(permissionQueryService.getPermissionTree());
    }
}

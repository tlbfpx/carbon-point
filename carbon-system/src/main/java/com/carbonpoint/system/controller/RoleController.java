package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.req.*;
import com.carbonpoint.system.dto.res.*;
import com.carbonpoint.system.service.RoleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

    @Autowired
    private RoleService roleService;

    @GetMapping
    public Result<List<RoleDetailRes>> list() {
        return Result.success(roleService.list(null));
    }

    @GetMapping("/{id}")
    public Result<RoleDetailRes> getById(@PathVariable Long id) {
        return Result.success(roleService.getById(id));
    }

    @PostMapping
    public Result<RoleDetailRes> create(@RequestBody RoleCreateReq req) {
        return Result.success(roleService.create(req));
    }

    @PutMapping("/{id}")
    public Result<RoleDetailRes> update(@PathVariable Long id, @RequestBody RoleUpdateReq req) {
        return Result.success(roleService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        roleService.delete(id);
        return Result.success();
    }

    @PutMapping("/{id}/permissions")
    public Result<Void> assignPermissions(@PathVariable Long id, @RequestBody List<String> permissionCodes) {
        roleService.assignPermissions(id, permissionCodes);
        return Result.success();
    }

    @PutMapping("/{id}/users")
    public Result<Void> assignUsers(@PathVariable Long id, @RequestBody List<Long> userIds) {
        roleService.assignUsers(id, userIds);
        return Result.success();
    }

    /**
     * Get permissions that the current user's super_admin role has.
     * Used for populating the permission tree when editing operator/custom roles.
     */
    @GetMapping("/available")
    public Result<List<String>> getAvailablePermissions() {
        return Result.success(roleService.getAvailablePermissions());
    }
}

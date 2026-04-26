package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.req.PlatformRoleUpdatePermissionsReq;
import com.carbonpoint.system.entity.PlatformRoleEntity;
import com.carbonpoint.system.service.PlatformRoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/platform/roles")
@RequiredArgsConstructor
public class PlatformRoleController {

    private final PlatformRoleService roleService;

    @GetMapping
    public Result<List<PlatformRoleEntity>> list() {
        return Result.success(roleService.list());
    }

    @GetMapping("/{id}")
    public Result<PlatformRoleEntity> getById(@PathVariable Long id) {
        PlatformRoleEntity role = roleService.getById(id);
        if (role == null) {
            return Result.error(ErrorCode.NOT_FOUND, "角色不存在");
        }
        return Result.success(role);
    }

    @PostMapping
    public Result<PlatformRoleEntity> create(@RequestBody PlatformRoleEntity entity) {
        return Result.success(roleService.create(entity));
    }

    @PutMapping("/{id}")
    public Result<PlatformRoleEntity> update(@PathVariable Long id, @RequestBody PlatformRoleEntity entity) {
        return Result.success(roleService.update(id, entity));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        roleService.delete(id);
        return Result.success();
    }

    @GetMapping("/{id}/permissions")
    public Result<List<String>> getPermissions(@PathVariable Long id) {
        return Result.success(roleService.getPermissionsById(id));
    }

    @PutMapping("/{id}/permissions")
    public Result<Void> updatePermissions(@PathVariable Long id, @RequestBody PlatformRoleUpdatePermissionsReq req) {
        roleService.updatePermissions(id, req.getPermissionCodes());
        return Result.success();
    }
}

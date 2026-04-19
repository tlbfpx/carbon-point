package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.req.UserAssignRolesReq;
import com.carbonpoint.system.dto.res.RoleDetailRes;
import com.carbonpoint.system.service.UserRoleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user-roles")
public class UserRoleController {

    @Autowired
    private UserRoleService userRoleService;

    @GetMapping("/{userId}")
    public Result<List<RoleDetailRes>> getUserRoles(@PathVariable Long userId) {
        return Result.success(userRoleService.getUserRoles(userId));
    }

    @PutMapping("/{userId}")
    public Result<Void> assignRoles(@PathVariable Long userId, @RequestBody UserAssignRolesReq req) {
        userRoleService.assignRoles(userId, req.getRoleIds());
        return Result.success();
    }
}

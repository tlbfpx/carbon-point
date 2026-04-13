package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.req.*;
import com.carbonpoint.system.dto.res.*;
import com.carbonpoint.system.security.CurrentUser;
import com.carbonpoint.system.security.RequirePerm;
import com.carbonpoint.system.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private CurrentUser currentUser;

    private void initCurrentUser() {
        currentUser.initFromSecurityContext();
    }

    @GetMapping
    public Result<PageRes<UserDetailRes>> list(PageReq req) {
        return Result.success(userService.list(req));
    }

    @GetMapping("/{id}")
    public Result<UserDetailRes> getById(@PathVariable Long id) {
        return Result.success(userService.getById(id));
    }

    @PutMapping("/profile")
    public Result<UserDetailRes> updateProfile(@RequestBody ProfileUpdateReq req) {
        initCurrentUser();
        return Result.success(userService.updateProfile(currentUser.getUserId(), req));
    }

    @PutMapping("/{id}/enable")
    public Result<Void> enable(@PathVariable Long id) {
        userService.enable(id);
        return Result.success();
    }

    @PutMapping("/{id}/disable")
    public Result<Void> disable(@PathVariable Long id) {
        userService.disable(id);
        return Result.success();
    }

    @PostMapping("/import")
    public Result<BatchImportRes> batchImport(@RequestParam("file") MultipartFile file) {
        return Result.success(userService.batchImport(file));
    }

    @PostMapping
    @RequirePerm("user:create")
    public Result<UserDetailRes> create(@RequestBody UserCreateReq req) {
        return Result.success(userService.createUser(req));
    }
}

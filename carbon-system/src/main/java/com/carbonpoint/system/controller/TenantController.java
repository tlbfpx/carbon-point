package com.carbonpoint.system.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.req.*;
import com.carbonpoint.system.dto.res.*;
import com.carbonpoint.system.service.TenantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tenant")
public class TenantController {

    @Autowired
    private TenantService tenantService;

    @PostMapping
    public Result<TenantDetailRes> create(@RequestBody TenantCreateReq req) {
        return Result.success(tenantService.create(req));
    }

    @PutMapping("/{id}")
    public Result<TenantDetailRes> update(@PathVariable Long id, @RequestBody TenantUpdateReq req) {
        return Result.success(tenantService.update(id, req));
    }

    @PutMapping("/{id}/suspend")
    public Result<Void> suspend(@PathVariable Long id) {
        tenantService.suspend(id);
        return Result.success();
    }

    @PutMapping("/{id}/activate")
    public Result<Void> activate(@PathVariable Long id) {
        tenantService.activate(id);
        return Result.success();
    }

    @GetMapping("/{id}")
    public Result<TenantDetailRes> getById(@PathVariable Long id) {
        return Result.success(tenantService.getById(id));
    }

    @GetMapping
    public Result<PageRes<TenantDetailRes>> list(PageReq req) {
        return Result.success(tenantService.list(req));
    }
}

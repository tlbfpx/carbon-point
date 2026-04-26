package com.carbonpoint.system.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.entity.PlatformMallProductEntity;
import com.carbonpoint.system.mapper.PlatformMallProductMapper;
import com.carbonpoint.system.security.PlatformAdminOnly;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

/**
 * 平台商品池管理控制器。
 * 平台管理员维护全局虚拟商品供企业选购上架。
 */
@RestController
@RequestMapping("/api/platform/products/pool")
@RequiredArgsConstructor
public class PlatformMallProductController {

    private final PlatformMallProductMapper platformMallProductMapper;

    @GetMapping
    @PlatformAdminOnly
    public Result<Page<PlatformMallProductEntity>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Integer status) {
        Page<PlatformMallProductEntity> p = new Page<>(page, Math.min(size, 100));
        LambdaQueryWrapper<PlatformMallProductEntity> qw = new LambdaQueryWrapper<>();
        if (type != null && !type.isBlank()) {
            qw.eq(PlatformMallProductEntity::getType, type);
        }
        if (status != null) {
            qw.eq(PlatformMallProductEntity::getStatus, status);
        }
        qw.orderByDesc(PlatformMallProductEntity::getCreatedAt);
        return Result.success(platformMallProductMapper.selectPage(p, qw));
    }

    @GetMapping("/{id}")
    @PlatformAdminOnly
    public Result<PlatformMallProductEntity> getById(@PathVariable Long id) {
        return Result.success(platformMallProductMapper.selectById(id));
    }

    @PostMapping
    @PlatformAdminOnly
    public Result<PlatformMallProductEntity> create(@RequestBody PlatformMallProductEntity entity) {
        entity.setId(null);
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        if (entity.getStatus() == null) {
            entity.setStatus(1);
        }
        platformMallProductMapper.insert(entity);
        return Result.success(entity);
    }

    @PutMapping("/{id}")
    @PlatformAdminOnly
    public Result<PlatformMallProductEntity> update(@PathVariable Long id,
                                                     @RequestBody PlatformMallProductEntity entity) {
        PlatformMallProductEntity existing = platformMallProductMapper.selectById(id);
        if (existing == null) {
            return Result.error("SYSTEM005", "商品不存在");
        }
        if (entity.getName() != null) existing.setName(entity.getName());
        if (entity.getType() != null) existing.setType(entity.getType());
        if (entity.getPriceCents() != null) existing.setPriceCents(entity.getPriceCents());
        if (entity.getDescription() != null) existing.setDescription(entity.getDescription());
        if (entity.getImageUrl() != null) existing.setImageUrl(entity.getImageUrl());
        if (entity.getFulfillmentConfig() != null) existing.setFulfillmentConfig(entity.getFulfillmentConfig());
        if (entity.getStatus() != null) existing.setStatus(entity.getStatus());
        existing.setUpdatedAt(LocalDateTime.now());
        platformMallProductMapper.updateById(existing);
        return Result.success(existing);
    }

    @DeleteMapping("/{id}")
    @PlatformAdminOnly
    public Result<Void> delete(@PathVariable Long id) {
        platformMallProductMapper.deleteById(id);
        return Result.success();
    }
}

package com.carbonpoint.walking.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.walking.entity.FunConversionRuleEntity;
import com.carbonpoint.walking.entity.WalkingTierRuleEntity;
import com.carbonpoint.walking.mapper.FunConversionRuleMapper;
import com.carbonpoint.walking.mapper.WalkingTierRuleMapper;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Enterprise admin CRUD controller for walking tier rules and fun conversion rules.
 */
@RestController
@RequestMapping("/api/enterprise/walking")
@RequiredArgsConstructor
public class WalkingConfigController {

    private final WalkingTierRuleMapper walkingTierRuleMapper;
    private final FunConversionRuleMapper funConversionRuleMapper;

    // ── Walking Tier Rules ────────────────────────────────────────────────────

    @GetMapping("/tiers")
    public Result<List<WalkingTierRuleEntity>> listTiers() {
        Long tenantId = TenantContext.getTenantId();
        LambdaQueryWrapper<WalkingTierRuleEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(WalkingTierRuleEntity::getTenantId, tenantId)
                .orderByAsc(WalkingTierRuleEntity::getSortOrder);
        return Result.success(walkingTierRuleMapper.selectList(wrapper));
    }

    @PostMapping("/tiers")
    public Result<WalkingTierRuleEntity> createTier(@Valid @RequestBody TierRuleRequest request) {
        Long tenantId = TenantContext.getTenantId();

        WalkingTierRuleEntity entity = new WalkingTierRuleEntity();
        entity.setTenantId(tenantId);
        entity.setMinSteps(request.getMinSteps());
        entity.setMaxSteps(request.getMaxSteps());
        entity.setPoints(request.getPoints());
        entity.setSortOrder(request.getSortOrder());
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());

        walkingTierRuleMapper.insert(entity);
        return Result.success(entity);
    }

    @PutMapping("/tiers/{id}")
    public Result<Void> updateTier(@PathVariable Long id, @Valid @RequestBody TierRuleRequest request) {
        Long tenantId = TenantContext.getTenantId();
        WalkingTierRuleEntity entity = walkingTierRuleMapper.selectById(id);

        if (entity == null || !entity.getTenantId().equals(tenantId)) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "阶梯规则不存在");
        }

        entity.setMinSteps(request.getMinSteps());
        entity.setMaxSteps(request.getMaxSteps());
        entity.setPoints(request.getPoints());
        entity.setSortOrder(request.getSortOrder());
        entity.setUpdatedAt(LocalDateTime.now());

        walkingTierRuleMapper.updateById(entity);
        return Result.success();
    }

    @DeleteMapping("/tiers/{id}")
    public Result<Void> deleteTier(@PathVariable Long id) {
        Long tenantId = TenantContext.getTenantId();
        WalkingTierRuleEntity entity = walkingTierRuleMapper.selectById(id);

        if (entity == null || !entity.getTenantId().equals(tenantId)) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "阶梯规则不存在");
        }

        walkingTierRuleMapper.deleteById(id);
        return Result.success();
    }

    // ── Fun Conversion Rules ──────────────────────────────────────────────────

    @GetMapping("/conversions")
    public Result<List<FunConversionRuleEntity>> listConversions() {
        Long tenantId = TenantContext.getTenantId();
        LambdaQueryWrapper<FunConversionRuleEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FunConversionRuleEntity::getTenantId, tenantId)
                .orderByAsc(FunConversionRuleEntity::getSortOrder);
        return Result.success(funConversionRuleMapper.selectList(wrapper));
    }

    @PostMapping("/conversions")
    public Result<FunConversionRuleEntity> createConversion(@Valid @RequestBody FunConversionRequest request) {
        Long tenantId = TenantContext.getTenantId();

        FunConversionRuleEntity entity = new FunConversionRuleEntity();
        entity.setTenantId(tenantId);
        entity.setItemName(request.getItemName());
        entity.setUnit(request.getUnit());
        entity.setCaloriesPerUnit(request.getCaloriesPerUnit());
        entity.setIcon(request.getIcon());
        entity.setSortOrder(request.getSortOrder());
        entity.setCreatedAt(LocalDateTime.now());

        funConversionRuleMapper.insert(entity);
        return Result.success(entity);
    }

    @PutMapping("/conversions/{id}")
    public Result<Void> updateConversion(@PathVariable Long id, @Valid @RequestBody FunConversionRequest request) {
        Long tenantId = TenantContext.getTenantId();
        FunConversionRuleEntity entity = funConversionRuleMapper.selectById(id);

        if (entity == null || !entity.getTenantId().equals(tenantId)) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "换算规则不存在");
        }

        entity.setItemName(request.getItemName());
        entity.setUnit(request.getUnit());
        entity.setCaloriesPerUnit(request.getCaloriesPerUnit());
        entity.setIcon(request.getIcon());
        entity.setSortOrder(request.getSortOrder());

        funConversionRuleMapper.updateById(entity);
        return Result.success();
    }

    @DeleteMapping("/conversions/{id}")
    public Result<Void> deleteConversion(@PathVariable Long id) {
        Long tenantId = TenantContext.getTenantId();
        FunConversionRuleEntity entity = funConversionRuleMapper.selectById(id);

        if (entity == null || !entity.getTenantId().equals(tenantId)) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "换算规则不存在");
        }

        funConversionRuleMapper.deleteById(id);
        return Result.success();
    }

    // ── Request DTOs ──────────────────────────────────────────────────────────

    @Data
    public static class TierRuleRequest {
        private Integer minSteps;
        private Integer maxSteps;
        private Integer points;
        private Integer sortOrder;
    }

    @Data
    public static class FunConversionRequest {
        private String itemName;
        private String unit;
        private Double caloriesPerUnit;
        private String icon;
        private Integer sortOrder;
    }
}

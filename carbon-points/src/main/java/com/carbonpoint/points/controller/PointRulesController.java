package com.carbonpoint.points.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.system.security.RequirePerm;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.points.dto.PointRuleCreateDTO;
import com.carbonpoint.points.dto.PointRuleDTO;
import com.carbonpoint.points.dto.PointRuleUpdateDTO;
import com.carbonpoint.points.entity.PointRule;
import com.carbonpoint.points.service.PointRuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/point-rules")
@RequiredArgsConstructor
public class PointRulesController {

    private final PointRuleService pointRuleService;

    @PostMapping
    @RequirePerm("enterprise:rule:create")
    public Result<PointRuleDTO> createRule(@Valid @RequestBody PointRuleCreateDTO dto) {
        return Result.success(pointRuleService.createRule(dto));
    }

    @PutMapping
    @RequirePerm("enterprise:rule:edit")
    public Result<PointRuleDTO> updateRule(@Valid @RequestBody PointRuleUpdateDTO dto) {
        return Result.success(pointRuleService.updateRule(dto));
    }

    @DeleteMapping("/{id}")
    @RequirePerm("enterprise:rule:delete")
    public Result<Void> deleteRule(@PathVariable Long id) {
        pointRuleService.deleteRule(id);
        return Result.success();
    }

    @GetMapping("/{id}")
    @RequirePerm("enterprise:rule:view")
    public Result<PointRuleDTO> getRule(@PathVariable Long id) {
        return Result.success(pointRuleService.getRule(id));
    }

    @GetMapping("/list")
    @RequirePerm("enterprise:rule:view")
    public Result<Page<PointRuleDTO>> listRules(
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Result.success(pointRuleService.listRules(type, page, size));
    }

    @GetMapping("/enabled")
    public Result<List<PointRule>> getEnabledRules() {
        Long tenantId = TenantContext.getTenantId();
        return Result.success(pointRuleService.getEnabledRules(tenantId));
    }

    @PostMapping("/validate-overlap")
    @RequirePerm("enterprise:rule:create")
    public Result<Void> validateOverlap(
            @RequestParam String startTime,
            @RequestParam String endTime,
            @RequestParam(required = false) Long excludeRuleId) {
        Long tenantId = TenantContext.getTenantId();
        pointRuleService.validateNoOverlap(tenantId, startTime, endTime, excludeRuleId);
        return Result.success();
    }
}

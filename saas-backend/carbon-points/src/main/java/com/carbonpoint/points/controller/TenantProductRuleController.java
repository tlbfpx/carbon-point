package com.carbonpoint.points.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.points.entity.PointRule;
import com.carbonpoint.points.service.PointRuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tenant/products/{productCode}/rules")
@RequiredArgsConstructor
public class TenantProductRuleController {

    private final PointRuleService pointRuleService;

    @GetMapping
    public Result<List<PointRule>> listRules(@PathVariable String productCode) {
        Long tenantId = TenantContext.getTenantId();
        return Result.success(pointRuleService.listByTenantAndProduct(tenantId, productCode));
    }

    @PutMapping("/{ruleId}/toggle")
    public Result<Void> toggleRule(@PathVariable String productCode, @PathVariable Long ruleId) {
        Long tenantId = TenantContext.getTenantId();
        PointRule rule = pointRuleService.getById(ruleId);
        if (rule == null || !rule.getTenantId().equals(tenantId)) {
            return Result.error("RULE_NOT_FOUND", "规则不存在");
        }
        pointRuleService.toggleEnabled(ruleId);
        return Result.success(null);
    }
}

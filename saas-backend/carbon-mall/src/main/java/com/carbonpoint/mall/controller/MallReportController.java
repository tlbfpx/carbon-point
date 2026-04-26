package com.carbonpoint.mall.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.mall.service.MallReportService;
import com.carbonpoint.system.security.RequirePerm;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 商城报表控制器。
 * 提供积分兑换统计、消费趋势、商品热度等报表数据。
 */
@RestController
@RequestMapping("/api/enterprise/mall/reports")
@RequiredArgsConstructor
public class MallReportController {

    private final MallReportService mallReportService;

    /**
     * 兑换统计概览：总兑换次数、总消耗积分、各状态订单数。
     * GET /api/enterprise/mall/reports/exchange-stats
     */
    @GetMapping("/exchange-stats")
    @RequirePerm("enterprise:report:view")
    public Result<Map<String, Object>> getExchangeStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        Long tenantId = TenantContext.getTenantId();
        return Result.success(mallReportService.getExchangeStats(tenantId, startDate, endDate));
    }

    /**
     * 积分消费趋势：按天/周/月统计消耗积分。
     * GET /api/enterprise/mall/reports/consumption
     */
    @GetMapping("/consumption")
    @RequirePerm("enterprise:report:view")
    public Result<List<Map<String, Object>>> getConsumptionTrend(
            @RequestParam(defaultValue = "daily") String granularity,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        Long tenantId = TenantContext.getTenantId();
        return Result.success(mallReportService.getConsumptionTrend(tenantId, granularity, startDate, endDate));
    }

    /**
     * 商品热度排行：按兑换次数排序。
     * GET /api/enterprise/mall/reports/product-popularity
     */
    @GetMapping("/product-popularity")
    @RequirePerm("enterprise:report:view")
    public Result<List<Map<String, Object>>> getProductPopularity(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        Long tenantId = TenantContext.getTenantId();
        return Result.success(mallReportService.getProductPopularity(tenantId, limit, startDate, endDate));
    }
}

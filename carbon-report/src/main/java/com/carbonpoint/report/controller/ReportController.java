package com.carbonpoint.report.controller;

import com.carbonpoint.system.security.RequirePerm;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.security.JwtUserPrincipal;
import com.carbonpoint.report.dto.EnterpriseDashboardDTO;
import com.carbonpoint.report.dto.PlatformDashboardDTO;
import com.carbonpoint.report.dto.PointTrendDTO;
import com.carbonpoint.report.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletResponse;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/enterprise/dashboard")
    @RequirePerm("enterprise:report:view")
    public Result<EnterpriseDashboardDTO> getEnterpriseDashboard(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return Result.success(reportService.getEnterpriseDashboard(principal.getTenantId()));
    }

    /**
     * Dashboard stats summary.
     * GET /api/reports/report/dashboard/stats
     */
    @GetMapping("/report/dashboard/stats")
    @RequirePerm("enterprise:report:view")
    public Result<Map<String, Object>> getDashboardStats(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return Result.success(reportService.getDashboardStats(principal.getTenantId()));
    }

    /**
     * Check-in trend for the last N days.
     * GET /api/reports/report/dashboard/checkin-trend?tenantId=&days=
     */
    @GetMapping("/report/dashboard/checkin-trend")
    @RequirePerm("enterprise:report:view")
    public Result<List<Map<String, Object>>> getCheckInTrend(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam(defaultValue = "7") int days) {
        return Result.success(reportService.getCheckInTrend(principal.getTenantId(), days));
    }

    /**
     * Points trend (granted vs consumed) for the last N days.
     * GET /api/reports/report/dashboard/points-trend?tenantId=&days=
     */
    @GetMapping("/report/dashboard/points-trend")
    @RequirePerm("enterprise:report:view")
    public Result<List<Map<String, Object>>> getPointsTrend(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam(defaultValue = "7") int days) {
        return Result.success(reportService.getPointsTrend(principal.getTenantId(), days));
    }

    /**
     * Top exchanged products.
     * GET /api/reports/report/dashboard/hot-products?tenantId=&limit=
     */
    @GetMapping("/report/dashboard/hot-products")
    @RequirePerm("enterprise:report:view")
    public Result<List<Map<String, Object>>> getHotProducts(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam(defaultValue = "5") int limit) {
        return Result.success(reportService.getHotProducts(principal.getTenantId(), limit));
    }

    @GetMapping("/platform/dashboard")
    @RequirePerm("platform:report:view")
    public Result<PlatformDashboardDTO> getPlatformDashboard() {
        return Result.success(reportService.getPlatformDashboard());
    }

    @GetMapping("/trend")
    @RequirePerm("enterprise:report:view")
    public Result<PointTrendDTO> getPointTrend(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam(defaultValue = "day") String dimension,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        if (start == null) start = LocalDate.now().minusDays(30);
        if (end == null) end = LocalDate.now();
        Long tenantId = principal.getTenantId();
        return Result.success(reportService.getPointTrend(tenantId, dimension, start, end));
    }

    @GetMapping("/export")
    @RequirePerm("enterprise:report:export")
    public void exportReport(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam String type,
            HttpServletResponse response) {
        Long tenantId = principal.getTenantId();
        reportService.exportReport(tenantId, type, response);
    }
}

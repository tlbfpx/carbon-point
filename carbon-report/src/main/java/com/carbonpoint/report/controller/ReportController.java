package com.carbonpoint.report.controller;

import com.carbonpoint.common.annotation.RequirePerm;
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

package com.carbonpoint.points.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.annotation.RequirePerm;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.security.JwtUserPrincipal;
import com.carbonpoint.points.dto.*;
import com.carbonpoint.points.service.PointAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Points API Controller.
 * Handles point balance, transactions, statistics, and admin operations.
 */
@RestController
@RequestMapping("/api/points")
@RequiredArgsConstructor
public class PointsController {

    private final PointAccountService pointAccountService;

    // --- User-facing endpoints (JWT auth) ---

    /**
     * Get current user's point account info.
     */
    @GetMapping("/account")
    public Result<PointAccountDTO> getMyAccount(@AuthenticationPrincipal JwtUserPrincipal principal) {
        UserPointInfo user = pointAccountService.getUserPoints(principal.getUserId());
        PointAccountDTO dto = new PointAccountDTO();
        dto.setUserId(user.getId());
        dto.setNickname(user.getNickname());
        dto.setLevel(user.getLevel());
        dto.setTotalPoints(user.getTotalPoints());
        dto.setAvailablePoints(user.getAvailablePoints());
        dto.setFrozenPoints(user.getFrozenPoints());
        dto.setConsecutiveDays(user.getConsecutiveDays());
        return Result.success(dto);
    }

    /**
     * Get current user's transaction list.
     */
    @GetMapping("/transactions")
    public Result<Page<PointTransactionDTO>> getMyTransactions(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Result.success(pointAccountService.getTransactionList(principal.getUserId(), page, size));
    }

    // --- Admin endpoints (permission-based) ---

    /**
     * Get balance for a specific user.
     */
    @GetMapping("/balance")
    @RequirePerm("enterprise:point:query")
    public Result<PointBalanceDTO> getBalance(@RequestParam Long userId) {
        return Result.success(pointAccountService.getBalance(userId));
    }

    /**
     * Get point statistics for a specific user.
     */
    @GetMapping("/statistics")
    @RequirePerm("enterprise:point:query")
    public Result<PointStatisticsDTO> getStatistics(@RequestParam Long userId) {
        return Result.success(pointAccountService.getStatistics(userId));
    }

    /**
     * Get transaction list for a specific user (admin view).
     */
    @GetMapping("/admin/transactions")
    @RequirePerm("enterprise:point:query")
    public Result<Page<PointTransactionDTO>> getUserTransactions(
            @RequestParam Long userId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Result.success(pointAccountService.getTransactionList(userId, page, size));
    }

    /**
     * Manually award points to a user.
     */
    @PostMapping("/award")
    @RequirePerm("enterprise:point:add")
    public Result<String> awardPoints(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @Valid @RequestBody ManualPointDTO dto) {
        String remark = dto.getRemark() != null ? dto.getRemark() : "管理员手动发放";
        int newBalance = pointAccountService.awardPoints(
                dto.getUserId(), dto.getAmount(), "manual_add",
                "admin_" + principal.getUserId(),
                remark + " | 操作人: " + principal.getUserId());
        return Result.success("积分发放成功，当前余额: " + newBalance);
    }

    /**
     * Manually deduct points from a user.
     */
    @PostMapping("/deduct")
    @RequirePerm("enterprise:point:deduct")
    public Result<String> deductPoints(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @Valid @RequestBody ManualPointDTO dto) {
        String remark = dto.getRemark() != null ? dto.getRemark() : "管理员手动扣减";
        int newBalance = pointAccountService.deductPoints(
                dto.getUserId(), dto.getAmount(), "manual_deduct",
                "admin_" + principal.getUserId(),
                remark + " | 操作人: " + principal.getUserId(),
                principal.getUserId());
        return Result.success("积分扣减成功，当前余额: " + newBalance);
    }
}

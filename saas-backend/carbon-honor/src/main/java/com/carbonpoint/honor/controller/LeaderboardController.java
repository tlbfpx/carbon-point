package com.carbonpoint.honor.controller;

import com.carbonpoint.common.controller.BaseController;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.honor.dto.LeaderboardContextDTO;
import com.carbonpoint.honor.dto.LeaderboardPageDTO;
import com.carbonpoint.honor.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.carbonpoint.common.security.JwtUserPrincipal;

/**
 * 排行榜 API。
 *
 * <p>GET /api/v1/leaderboard/today     — 今日打卡榜
 * <p>GET /api/v1/leaderboard/week      — 本周打卡榜
 * <p>GET /api/v1/leaderboard/history   — 历史累计榜
 * <p>GET /api/v1/leaderboard/context   — 当前用户排行榜上下文
 */
@RestController
@RequestMapping("/api/v1/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    /**
     * 今日打卡排行榜。
     * 排序：total_points DESC，积分相同按 checkin_time ASC（先打卡排前）。
     */
    @GetMapping("/today")
    public Result<LeaderboardPageDTO> today(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        LeaderboardPageDTO result = leaderboardService.getToday(principal.getUserId(), page, pageSize);
        return Result.success(result);
    }

    /**
     * 本周打卡排行榜。
     */
    @GetMapping("/week")
    public Result<LeaderboardPageDTO> week(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        LeaderboardPageDTO result = leaderboardService.getWeek(principal.getUserId(), page, pageSize);
        return Result.success(result);
    }

    /**
     * 历史累计积分排行榜。
     */
    @GetMapping("/history")
    public Result<LeaderboardPageDTO> history(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        LeaderboardPageDTO result = leaderboardService.getHistory(principal.getUserId(), page, pageSize);
        return Result.success(result);
    }

    /**
     * 排行榜上下文：当前用户排名 + 变化 + 百分位。
     */
    @GetMapping("/context")
    public Result<LeaderboardContextDTO> context(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        LeaderboardContextDTO result = leaderboardService.getContext(principal.getUserId());
        return Result.success(result);
    }
}

package com.carbonpoint.honor.controller;

import com.carbonpoint.common.controller.BaseController;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.security.JwtUserPrincipal;
import com.carbonpoint.honor.dto.UserBadgeDTO;
import com.carbonpoint.honor.service.BadgeService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 徽章 API。
 */
@RestController
@RequestMapping("/api/v1/badges")
@RequiredArgsConstructor
public class BadgeController extends BaseController {

    private final BadgeService badgeService;

    /**
     * 获取当前用户已获得的徽章（最多9个，用于个人主页展示）。
     */
    @GetMapping("/me")
    public Result<List<UserBadgeDTO>> getMyBadges(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return success(badgeService.getUserBadges(principal.getUserId(), 9));
    }

    /**
     * 获取当前用户所有徽章。
     */
    @GetMapping("/me/all")
    public Result<List<UserBadgeDTO>> getAllMyBadges(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return success(badgeService.getAllUserBadges(principal.getUserId()));
    }

    /**
     * 获取指定用户的所有徽章。
     */
    @GetMapping("/user/{userId}")
    public Result<List<UserBadgeDTO>> getUserBadges(@PathVariable Long userId) {
        return success(badgeService.getAllUserBadges(userId));
    }
}

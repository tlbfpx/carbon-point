package com.carbonpoint.walking.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.security.JwtUserPrincipal;
import com.carbonpoint.walking.dto.*;
import com.carbonpoint.walking.service.WalkingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/walking")
@RequiredArgsConstructor
public class WalkingController {

    private final WalkingService walkingService;

    /**
     * Claim points for today's walking steps.
     */
    @PostMapping("/claim")
    public Result<WalkingClaimResponseDTO> claim(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @Valid @RequestBody WalkingClaimRequestDTO request) {
        WalkingClaimResponseDTO result = walkingService.claim(principal.getUserId(), request.getSource());
        return Result.success(result);
    }

    /**
     * Get today's walking status.
     */
    @GetMapping("/today")
    public Result<WalkingTodayDTO> getTodayStatus(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return Result.success(walkingService.getTodayStatus(principal.getUserId()));
    }

    /**
     * Get walking records for the authenticated user.
     */
    @GetMapping("/records")
    public Result<Page<WalkingRecordDTO>> getRecords(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Result.success(walkingService.getRecords(principal.getUserId(), page, size));
    }
}

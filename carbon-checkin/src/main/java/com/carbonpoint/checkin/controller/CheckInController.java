package com.carbonpoint.checkin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.checkin.dto.CheckInRecordDTO;
import com.carbonpoint.checkin.dto.CheckInRequestDTO;
import com.carbonpoint.checkin.dto.CheckInResponseDTO;
import com.carbonpoint.checkin.service.CheckInService;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/checkin")
@RequiredArgsConstructor
public class CheckInController {

    private final CheckInService checkInService;

    /**
     * Perform a check-in. User ID is extracted from the JWT token.
     */
    @PostMapping
    public Result<CheckInResponseDTO> checkIn(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @Valid @RequestBody CheckInRequestDTO request) {
        CheckInResponseDTO result = checkInService.checkIn(principal.getUserId(), request);
        return Result.success(result);
    }

    /**
     * Get today's check-in status.
     */
    @GetMapping("/today")
    public Result<CheckInResponseDTO> getTodayStatus(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return Result.success(checkInService.getTodayStatus(principal.getUserId()));
    }

    /**
     * Get check-in records for the authenticated user.
     */
    @GetMapping("/records")
    public Result<Page<CheckInRecordDTO>> getRecords(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Result.success(checkInService.getRecords(principal.getUserId(), page, size));
    }
}

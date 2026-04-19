package com.carbonpoint.stair.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.stair.dto.CheckInRecordDTO;
import com.carbonpoint.stair.dto.CheckInRequestDTO;
import com.carbonpoint.stair.dto.CheckInResponseDTO;
import com.carbonpoint.stair.dto.TimeSlotDTO;
import com.carbonpoint.stair.service.CheckInService;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    /**
     * Get all time slot rules with their current check-in status.
     * Returns each slot with status: checked_in / available / not_started / ended.
     */
    @GetMapping("/time-slots")
    public Result<List<TimeSlotDTO>> getTimeSlots(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return Result.success(checkInService.getTimeSlots(principal.getUserId()));
    }
}

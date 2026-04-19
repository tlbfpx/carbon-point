package com.carbonpoint.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Walking-specific statistics DTO.
 * Provides step-based analytics for the walking product.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalkingStatsDTO {

    /** Average daily steps across all users in the period */
    private Double averageDailySteps;

    /** Total number of records in the period */
    private Integer totalRecords;

    /** Number of unique users who had step data */
    private Integer uniqueUsers;

    /** Step distribution: key is range label, value is user-day count */
    private Map<String, Integer> stepDistribution;

    /** Claim rate: users who claimed points / users with steps */
    private Double claimRate;

    /** Total points awarded from walking claims */
    private Long totalPointsAwarded;
}

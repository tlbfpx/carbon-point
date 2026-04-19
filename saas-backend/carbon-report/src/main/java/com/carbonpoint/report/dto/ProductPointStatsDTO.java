package com.carbonpoint.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Per-product point statistics DTO.
 * Shows points issued and transaction counts for each product, with daily breakdown.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductPointStatsDTO {

    /** Product code (e.g. stair_climbing, walking) */
    private String productCode;

    /** Product display name */
    private String productName;

    /** Total points issued for this product in the period */
    private Long totalPointsIssued;

    /** Total transaction count for this product in the period */
    private Integer transactionCount;

    /** Daily breakdown of points and counts */
    private List<DailyPointStat> dailyStats;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyPointStat {
        /** Date string (yyyy-MM-dd) */
        private String date;
        /** Points issued on this date */
        private Integer points;
        /** Transaction count on this date */
        private Integer count;
    }
}

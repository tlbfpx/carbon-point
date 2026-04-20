package com.carbonpoint.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Cross-product overview DTO for pie chart visualization.
 * Shows each product's share of total points issued.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrossProductOverviewDTO {

    /** Per-product point slices */
    private List<ProductSlice> slices;

    /** Total points across all products */
    private Long totalPoints;

    /** Per-product participation rate: product_code -> percentage (0-100) */
    private Map<String, Double> participationRates;

    /** Overall participation rate: users with any point activity / total users (0-100) */
    private Double overallParticipationRate;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductSlice {
        /** Product code */
        private String productCode;
        /** Product display name */
        private String productName;
        /** Points for this product */
        private Long points;
        /** Percentage of total (0-100) */
        private Double percentage;
        /** Participation rate: users with this product's activity / total users (0-100) */
        private Double participationRate;
        /** Number of unique users with this product's activity */
        private Integer activeUsers;
    }
}

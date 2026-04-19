package com.carbonpoint.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

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
    }
}

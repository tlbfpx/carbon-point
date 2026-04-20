package com.carbonpoint.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Product trend DTO for stacked area chart visualization.
 * Shows per-product point totals over time with aggregation by dimension.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductTrendDTO {

    /** Dimension: day, week, or month */
    private String dimension;

    /** Time-series data points */
    private List<TrendPoint> points;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendPoint {
        /** Time period label (date string or range) */
        private String period;

        /** Per-product point values for this period */
        private List<ProductValue> productValues;

        /** Total points across all products for this period */
        private Long totalPoints;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductValue {
        /** Product code */
        private String productCode;

        /** Product display name */
        private String productName;

        /** Points for this product in the period */
        private Long points;
    }
}

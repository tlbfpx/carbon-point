package com.carbonpoint.report.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class EnterpriseDashboardDTO {
    private Integer todayCheckinCount;
    private Integer todayPointsIssued;
    private List<DailyTrend> weekTrend;
    private Integer activeUsersWeek;
    private Integer activeUsersMonth;
    private List<ProductExchangeDTO> topProducts;

    /** Multi-product dimension: per-product today stats */
    private Map<String, ProductTodayStats> productTodayStats;

    /** Multi-product dimension: per-product points distribution */
    private List<ProductPointSlice> productPointsDistribution;

    @Data
    public static class DailyTrend {
        private String date;
        private Integer checkinCount;
        private Integer pointsIssued;
    }

    @Data
    public static class ProductExchangeDTO {
        private Long productId;
        private String productName;
        private Integer exchangeCount;
    }

    @Data
    public static class ProductTodayStats {
        /** Product code */
        private String productCode;
        /** Product display name */
        private String productName;
        /** Today's user count for this product */
        private Integer todayUserCount;
        /** Today's points issued for this product */
        private Integer todayPointsIssued;
    }

    @Data
    public static class ProductPointSlice {
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

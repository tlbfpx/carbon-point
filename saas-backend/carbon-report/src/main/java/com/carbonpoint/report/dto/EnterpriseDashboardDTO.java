package com.carbonpoint.report.dto;

import lombok.Data;
import java.util.List;

@Data
public class EnterpriseDashboardDTO {
    private Integer todayCheckinCount;
    private Integer todayPointsIssued;
    private List<DailyTrend> weekTrend;
    private Integer activeUsersWeek;
    private Integer activeUsersMonth;
    private List<ProductExchangeDTO> topProducts;
    
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
}

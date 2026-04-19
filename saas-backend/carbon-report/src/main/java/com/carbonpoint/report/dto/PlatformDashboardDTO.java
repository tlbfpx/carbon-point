package com.carbonpoint.report.dto;

import lombok.Data;
import java.util.List;

@Data
public class PlatformDashboardDTO {
    private Integer totalTenants;
    private Integer activeTenants;
    private Integer totalUsers;
    private Long totalPointsIssued;
    private Long totalPointsExchanged;
    private Integer totalExchangeOrders;
    private List<TenantRankDTO> tenantRanking;
    
    @Data
    public static class TenantRankDTO {
        private Long tenantId;
        private String tenantName;
        private Integer userCount;
        private Long totalPoints;
    }
}

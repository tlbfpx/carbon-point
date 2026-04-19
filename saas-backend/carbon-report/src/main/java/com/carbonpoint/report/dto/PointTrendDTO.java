package com.carbonpoint.report.dto;

import lombok.Data;
import java.util.List;

@Data
public class PointTrendDTO {
    private String dimension;
    private List<TrendPoint> series;
    
    @Data
    public static class TrendPoint {
        private String period;
        private Long issued;
        private Long consumed;
    }
}

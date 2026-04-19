package com.carbonpoint.points.dto;

import lombok.Data;

@Data
public class PointStatisticsDTO {
    private Long userId;
    private Integer totalPoints;
    private Integer availablePoints;
    private Integer frozenPoints;
    private Integer level;
    private String levelName;
    private Integer thisMonthPoints;
    private Integer rank;
    private Integer consecutiveDays;
}

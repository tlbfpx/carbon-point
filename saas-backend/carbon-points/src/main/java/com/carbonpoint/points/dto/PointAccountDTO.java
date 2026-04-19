package com.carbonpoint.points.dto;

import lombok.Data;

@Data
public class PointAccountDTO {
    private Long userId;
    private String nickname;
    private Integer level;
    private Integer totalPoints;
    private Integer availablePoints;
    private Integer frozenPoints;
    private Integer consecutiveDays;
}

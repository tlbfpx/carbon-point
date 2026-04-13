package com.carbonpoint.points.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PointBalanceDTO {
    private Long userId;
    private Integer totalPoints;
    private Integer availablePoints;
    private Integer frozenPoints;
    private Integer level;
    private String levelName;
}

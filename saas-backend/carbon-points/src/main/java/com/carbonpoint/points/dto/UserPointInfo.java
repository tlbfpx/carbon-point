package com.carbonpoint.points.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Read-only view of user point data.
 * Avoids circular dependency between carbon-points and carbon-system.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserPointInfo {
    private Long id;
    private Long tenantId;
    private String nickname;
    private Integer level;
    private Integer totalPoints;
    private Integer availablePoints;
    private Integer frozenPoints;
    private Integer consecutiveDays;
    private LocalDate lastCheckinDate;
}

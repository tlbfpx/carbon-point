package com.carbonpoint.stair.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class CheckInRecordDTO {
    private Long id;
    private Long userId;
    private LocalDate checkinDate;
    private LocalDateTime checkinTime;
    private Integer basePoints;
    private Integer finalPoints;
    private BigDecimal multiplier;
    private BigDecimal levelCoefficient;
    private Integer consecutiveDays;
    private Integer streakBonus;
    private Long ruleId;
}

package com.carbonpoint.checkin.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CheckInResponseDTO {
    private Long recordId;
    private boolean success;
    private String message;
    private Integer basePoints;
    private Integer finalPoints;
    private BigDecimal multiplier;
    private BigDecimal levelCoefficient;
    private Integer streakBonus;
    private Integer totalPoints;
    private Integer consecutiveDays;
    private Integer availablePoints;
    private Integer totalPoints_;
    private Integer level;
    private LocalDateTime checkinTime;
}

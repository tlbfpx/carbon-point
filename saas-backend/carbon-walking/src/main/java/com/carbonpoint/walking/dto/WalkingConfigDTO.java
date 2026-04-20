package com.carbonpoint.walking.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Walking configuration DTO.
 * Contains step-to-points calculation settings.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalkingConfigDTO {

    /**
     * Minimum steps required to earn points.
     */
    @NotNull(message = "步数阈值不能为空")
    @Min(value = 1, message = "步数阈值必须大于0")
    private Integer stepsThreshold;

    /**
     * Points coefficient: points = floor(steps * coefficient).
     */
    @NotNull(message = "积分系数不能为空")
    @Min(value = 1, message = "积分系数必须大于0")
    private Integer pointsCoefficient;  // stored as integer, e.g., 1 for 0.01

    /**
     * Daily points cap for walking.
     */
    @NotNull(message = "每日积分上限不能为空")
    @Min(value = 0, message = "每日积分上限不能为负数")
    private Integer dailyCap;
}

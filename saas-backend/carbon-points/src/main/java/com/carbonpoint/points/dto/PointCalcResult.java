package com.carbonpoint.points.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PointCalcResult {
    /** Random base points from time slot */
    private int basePoints;
    /** After special date multiplier applied */
    private double multiplierRate;
    /** After level coefficient applied */
    private double levelMultiplier;
    /** Final integer points awarded */
    private int finalPoints;
    /** Extra streak bonus awarded */
    private int extraPoints;
    /** Total = finalPoints + extraPoints */
    private int totalPoints;
    /** Whether daily cap was hit */
    private boolean dailyCapHit;
}

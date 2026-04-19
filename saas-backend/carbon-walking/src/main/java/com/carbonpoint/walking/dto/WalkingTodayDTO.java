package com.carbonpoint.walking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WalkingTodayDTO {

    private Integer todaySteps;
    private Integer stepsThreshold;
    private Integer claimablePoints;
    private Boolean claimed;
    private List<WalkingClaimResponseDTO.FunEquivalence> funEquivalences;
}

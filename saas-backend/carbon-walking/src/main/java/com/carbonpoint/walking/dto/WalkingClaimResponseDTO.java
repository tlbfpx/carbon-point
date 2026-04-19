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
public class WalkingClaimResponseDTO {

    private boolean success;
    private String message;
    private Integer steps;
    private Integer pointsAwarded;
    private List<FunEquivalence> funEquivalences;
    private Integer availablePoints;
    private Integer totalPoints;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FunEquivalence {
        private String item;
        private String description;
        private Double quantity;
    }
}

package com.carbonpoint.walking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WalkingRecordDTO {

    private Long id;
    private LocalDate date;
    private Integer steps;
    private Integer pointsEarned;
    private LocalDateTime createdAt;
}

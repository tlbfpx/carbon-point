package com.carbonpoint.walking.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WalkingClaimRequestDTO {

    @NotBlank(message = "数据来源不能为空")
    private String source;
}

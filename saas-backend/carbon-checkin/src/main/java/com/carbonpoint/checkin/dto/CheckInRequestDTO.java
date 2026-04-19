package com.carbonpoint.checkin.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CheckInRequestDTO {
    @NotNull(message = "规则ID不能为空")
    private Long ruleId;
}

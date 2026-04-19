package com.carbonpoint.points.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ManualPointDTO {
    @NotNull(message = "用户ID不能为空")
    private Long userId;

    @NotNull(message = "积分数量不能为空")
    @Min(value = 1, message = "积分数量必须大于0")
    private Integer amount;

    private String remark;
}

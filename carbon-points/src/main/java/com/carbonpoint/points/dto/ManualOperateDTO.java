package com.carbonpoint.points.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ManualOperateDTO {

    @NotNull(message = "用户ID不能为空")
    private Long userId;

    @NotNull(message = "积分数量不能为空")
    private Integer amount;

    private String remark;
}

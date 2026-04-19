package com.carbonpoint.points.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PointRuleCreateDTO {

    @NotBlank(message = "规则名称不能为空")
    private String name;

    @NotBlank(message = "规则类型不能为空")
    private String type;

    @NotBlank(message = "规则配置不能为空")
    private String config;

    private Boolean enabled = true;

    private Integer sortOrder = 0;
}

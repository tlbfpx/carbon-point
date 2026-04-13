package com.carbonpoint.points.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PointRuleUpdateDTO {

    @NotNull(message = "规则ID不能为空")
    private Long id;

    private String name;
    private String config;
    private Boolean enabled;
    private Integer sortOrder;
}

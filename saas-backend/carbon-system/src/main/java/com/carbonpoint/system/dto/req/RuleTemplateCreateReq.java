package com.carbonpoint.system.dto.req;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RuleTemplateCreateReq {
    @NotBlank(message = "规则类型不能为空")
    private String ruleType;
    @NotBlank(message = "名称不能为空")
    private String name;
    @NotBlank(message = "配置不能为空")
    private String config;
    private Boolean enabled = true;
    private Integer sortOrder = 0;
    private String description;
}

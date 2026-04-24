package com.carbonpoint.system.dto.req;

import lombok.Data;

@Data
public class RuleTemplateUpdateReq {
    private String name;
    private String config;
    private Boolean enabled;
    private Integer sortOrder;
    private String description;
}

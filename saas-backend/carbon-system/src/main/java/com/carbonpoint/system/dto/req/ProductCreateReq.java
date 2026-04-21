package com.carbonpoint.system.dto.req;

import lombok.Data;

/**
 * Product creation request DTO.
 */
@Data
public class ProductCreateReq {
    private String code;
    private String name;
    private String category;
    private String description;
    private Integer status;
    private Integer sortOrder;
    private String triggerType;
    private String ruleChainConfig;
    private String defaultConfig;
}

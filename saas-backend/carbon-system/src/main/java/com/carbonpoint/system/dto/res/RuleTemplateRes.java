package com.carbonpoint.system.dto.res;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class RuleTemplateRes {
    private String id;
    private String productId;
    private String ruleType;
    private String name;
    private String config;
    private Integer enabled;
    private Integer sortOrder;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

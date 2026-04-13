package com.carbonpoint.points.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class PointRuleDTO {
    private Long id;
    private Long tenantId;
    private String type;
    private String name;
    private String config;
    private Boolean enabled;
    private Integer sortOrder;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

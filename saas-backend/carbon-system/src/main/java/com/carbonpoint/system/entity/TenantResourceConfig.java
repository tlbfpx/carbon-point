package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * Tenant resource configuration entity (reference for future phases).
 */
@Data
@TableName("tenant_resource_configs")
public class TenantResourceConfig {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tenantId;

    private String resourceCode;

    private Boolean enabled;

    private String config;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}

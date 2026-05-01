package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("tenant_resource_configs")
public class TenantResourceConfig {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tenantId;

    private String resourceCode;

    private Boolean enabled;

    @TableField(typeHandler = org.apache.ibatis.type.JdbcTypeForHandler.class)
    private Object config;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}

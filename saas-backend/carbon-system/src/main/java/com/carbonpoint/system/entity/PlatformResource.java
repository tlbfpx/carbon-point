package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * Unified resource entity (reference for future phases).
 * Currently not used - ResourceRegistry reads from existing Feature/Product tables.
 */
@Data
@TableName("platform_resources")
public class PlatformResource {
    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String code;

    private String type;

    private String name;

    private String category;

    private String description;

    private String metadata;

    private String icon;

    private String status;

    private Integer sortOrder;

    @TableLogic
    private Boolean deleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}

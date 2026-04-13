package com.carbonpoint.common.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

/**
 * Permission entity (common across modules).
 */
@Data
@TableName("permissions")
public class PermissionEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String code;

    private Long parentId;

    private String name;

    private String type;

    private String path;

    private Integer sortOrder;
}

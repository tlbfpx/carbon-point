package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("platform_roles")
public class PlatformRoleEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String code;

    private String name;

    private String description;

    private String permissionCodes;

    private Integer status;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    public static final String STATUS_ACTIVE = "1";
    public static final String STATUS_DISABLED = "0";
}

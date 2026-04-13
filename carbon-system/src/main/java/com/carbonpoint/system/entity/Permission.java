package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

@Data
@TableName("permissions")
public class Permission {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String code;

    private String module;

    private String operation;

    private String description;

    private Integer sortOrder;
}

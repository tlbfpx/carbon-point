package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

@Data
@TableName("permissions")
public class Permission {
    /**
     * Permission code is the primary key (VARCHAR), not auto-increment.
     * The DDL uses code VARCHAR(60) PRIMARY KEY.
     */
    @TableId("code")
    private String code;

    private String module;

    private String operation;

    private String description;

    private Integer sortOrder;

    @TableLogic
    private Integer deleted;
}

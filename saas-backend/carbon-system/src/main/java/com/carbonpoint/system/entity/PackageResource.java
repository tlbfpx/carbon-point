package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("package_resources")
public class PackageResource {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long packageId;

    private String resourceCode;

    private Boolean isRequired;

    @TableField(typeHandler = org.apache.ibatis.type.JdbcTypeForHandler.class)
    private Object config;

    private Integer sortOrder;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}

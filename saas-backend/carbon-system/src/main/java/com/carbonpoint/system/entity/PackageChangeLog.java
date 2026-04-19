package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("package_change_logs")
public class PackageChangeLog {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tenantId;

    private Long oldPackageId;

    private Long newPackageId;

    private Long operatorId;

    private String operatorType;

    private String reason;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}

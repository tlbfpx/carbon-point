package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

@Data
@TableName("package_permissions")
public class PackagePermission {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long packageId;

    private String permissionCode;
}

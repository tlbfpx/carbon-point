package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

@Data
@TableName("package_permissions")
public class PackagePermission {
    private Long packageId;

    private String permissionCode;
}

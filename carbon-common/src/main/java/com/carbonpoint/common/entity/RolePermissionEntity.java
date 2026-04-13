package com.carbonpoint.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * Role-Permission mapping entity.
 */
@Data
@TableName("role_permissions")
public class RolePermissionEntity {
    private Long roleId;
    private String permissionCode;
}

package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("role_permissions")
public class RolePermission {
    private Long roleId;
    private String permissionCode;

    @TableLogic
    private Integer deleted;
}

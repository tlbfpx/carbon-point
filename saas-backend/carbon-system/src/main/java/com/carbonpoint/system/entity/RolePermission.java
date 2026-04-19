package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("role_permissions")
public class RolePermission {
    @TableId
    private Long roleId;

    @TableField("permission_code")
    private String permissionCode;

    @TableLogic
    private Integer deleted;
}

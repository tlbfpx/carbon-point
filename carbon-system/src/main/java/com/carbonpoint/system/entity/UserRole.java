package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("user_roles")
public class UserRole {
    private Long userId;
    private Long roleId;
    @TableField("tenant_id")
    private Long tenantId;
}

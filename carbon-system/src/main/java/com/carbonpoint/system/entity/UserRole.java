package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("user_roles")
public class UserRole {
    @TableId
    private Long userId;
    private Long roleId;
    private Long tenantId;

    @TableLogic
    private Integer deleted;
}

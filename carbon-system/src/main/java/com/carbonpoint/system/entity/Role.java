package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("roles")
public class Role {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tenantId;

    private String name;

    private Boolean isPreset;

    /**
     * super_admin: 平台套餐超管角色（不可编辑/删除）
     * operator: 运营预设角色（可编辑/删除）
     * custom: 自定义角色（可编辑/删除）
     */
    @TableField("role_type")
    private String roleType;

    /**
     * 0=不可编辑/删除（超管角色）
     * 1=可编辑/删除（运营/自定义角色）
     */
    @TableField("is_editable")
    private Boolean isEditable;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableLogic
    private Integer deleted;
}

package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("tenants")
public class Tenant {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private String name;
    @TableField("logo")
    private String logoUrl;

    /**
     * 废弃字段，仅用于迁移兼容。权限边界由 packageId 确定。
     */
    private String packageType;

    /**
     * 绑定的权限套餐ID，关联 permission_packages 表。
     * 决定该企业所有角色的权限上限。
     */
    private Long packageId;
    private Integer maxUsers;
    private String status;
    @TableField("expires_at")
    private LocalDateTime expireTime;
    @com.baomidou.mybatisplus.annotation.TableField(fill = com.baomidou.mybatisplus.annotation.FieldFill.INSERT)
    private LocalDateTime createdAt;

    @com.baomidou.mybatisplus.annotation.TableField(fill = com.baomidou.mybatisplus.annotation.FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    /**
     * 用户等级模式：strict（默认，只升不降）或 flexible（允许每月降级）。
     * 详见 point-engine spec 的"降级规则"章节。
     */
    private String levelMode;

    @TableLogic
    private Integer deleted;

    @Version
    private Long version;
}

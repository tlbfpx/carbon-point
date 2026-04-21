package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Platform admin entity.
 * Note: platform_admins table is excluded from TenantLineInnerInterceptor
 * via CustomTenantLineHandler.ignoreTable().
 */
@Data
@TableName("platform_admins")
public class PlatformAdminEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** Login username, globally unique */
    private String username;

    /**
     * Hashed password.
     * Maps to "password_hash" column in DB.
     */
    @TableField("password_hash")
    private String passwordHash;

    /**
     * Display name shown in UI.
     * Maps to "nickname" column in DB (Phase 2 schema convention).
     */
    @TableField("display_name")
    private String displayName;

    /** super_admin / admin / viewer */
    private String role;

    /** Email address */
    private String email;

    /** active / disabled */
    private String status;

    /** Last successful login timestamp */
    private LocalDateTime lastLoginAt;

    /** Last successful login IP */
    private String lastLoginIp;

    @com.baomidou.mybatisplus.annotation.TableField(fill = com.baomidou.mybatisplus.annotation.FieldFill.INSERT)
    private LocalDateTime createdAt;

    @com.baomidou.mybatisplus.annotation.TableField(fill = com.baomidou.mybatisplus.annotation.FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @TableLogic
    private Integer deleted;

    /** Role constants */
    public static final String ROLE_SUPER_ADMIN = "super_admin";
    public static final String ROLE_ADMIN = "admin";
    public static final String ROLE_VIEWER = "viewer";

    /** Status constants */
    public static final String STATUS_ACTIVE = "active";
    public static final String STATUS_DISABLED = "disabled";
}

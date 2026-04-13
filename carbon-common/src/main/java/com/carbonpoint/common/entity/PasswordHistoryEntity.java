package com.carbonpoint.common.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Password history record.
 * Stores hashed passwords to prevent reuse.
 */
@Data
@TableName("password_history")
public class PasswordHistoryEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** User ID */
    private Long userId;

    /** Password hash (Argon2id or BCrypt) */
    private String passwordHash;

    /** Creation time */
    @com.baomidou.mybatisplus.annotation.TableField(fill = com.baomidou.mybatisplus.annotation.FieldFill.INSERT)
    private LocalDateTime createdAt;
}

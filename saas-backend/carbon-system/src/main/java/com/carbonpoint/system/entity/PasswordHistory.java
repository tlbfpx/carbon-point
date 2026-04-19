package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * 密码历史记录实体。
 * 记录用户历史密码哈希，禁止最近 N 次密码复用。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("password_history")
public class PasswordHistory {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private Long tenantId;

    /**
     * 密码哈希（算法前缀标注类型）。
     */
    private String passwordHash;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}

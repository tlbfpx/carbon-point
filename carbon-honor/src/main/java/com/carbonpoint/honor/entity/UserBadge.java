package com.carbonpoint.honor.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 用户徽章实体（user_badges 表）。
 */
@Data
@TableName("user_badges")
public class UserBadge {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private Long tenantId;

    private String badgeId;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime earnedAt;

    @TableLogic
    private Integer deleted;
}

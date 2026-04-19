package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("notifications")
public class Notification {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 所属租户（平台通知 tenant_id=0） */
    private Long tenantId;

    private Long userId;

    /** 通知类型: level_up / badge_earned / point_expiring / point_expired / streak_bonus / streak_broken / coupon_expiring / order_fulfilled / order_expired / point_manual_add / point_manual_deduct / tenant_suspended / user_disabled / invite_expiring */
    private String type;

    private String title;

    private String content;

    /** 关联业务类型: order / checkin / badge / ... */
    private String referenceType;

    private String referenceId;

    /** 已读标记 */
    private Boolean isRead;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}

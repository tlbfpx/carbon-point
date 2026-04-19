package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("notification_templates")
public class NotificationTemplate {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 通知类型: level_up / badge_earned / point_expiring / ... */
    private String type;

    /** 通知渠道: in_app / sms */
    private String channel;

    /** 标题模板 */
    private String titleTemplate;

    /** 内容模板，变量格式: {var_name} */
    private String contentTemplate;

    /** 是否系统预设（不可删除） */
    private Boolean isPreset;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}

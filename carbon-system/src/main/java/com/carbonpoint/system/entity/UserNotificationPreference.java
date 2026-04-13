package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("user_notification_preferences")
public class UserNotificationPreference {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    /** 通知类型 */
    private String type;

    /** 是否开启: true=接收, false=关闭 */
    private Boolean enabled;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}

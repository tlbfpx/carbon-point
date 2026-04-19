package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("sms_send_logs")
public class SmsSendLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private String phone;

    private String type;

    private String templateType;

    private String content;

    private String result;

    private String errorMsg;

    private Integer retryCount;

    private LocalDateTime nextRetryAt;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}

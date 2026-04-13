package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * 登录安全日志实体。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("login_security_logs")
public class LoginSecurityLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 用户类型: user / platform_admin */
    private String userType;

    private Long userId;

    /** 登录用户名/手机号 */
    private String username;

    /** 登录方式: password / sms / sso */
    private String loginMethod;

    /** 结果: success / wrong_password / captcha_wrong / account_locked */
    private String result;

    private String ipAddress;

    private String userAgent;

    /** 设备指纹 */
    private String deviceFingerprint;

    private String geoCity;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}

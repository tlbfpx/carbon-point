package com.carbonpoint.common.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Login security audit log.
 */
@Data
@TableName("login_security_logs")
public class LoginSecurityLogEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** User type: USER / PLATFORM_ADMIN */
    @TableField("user_type")
    private String userType;

    /** User ID (null for failed login attempts with unknown user) */
    @TableField("user_id")
    private Long userId;

    /** Username used in login attempt */
    private String username;

    /** Login method: PASSWORD / SMS_CODE / EMAIL_CODE */
    @TableField("login_method")
    private String loginMethod;

    /** Unmapped - use 'result' to store failure reason */
    @TableField(exist = false)
    private String failReason;

    /** Client IP address */
    @TableField("ip_address")
    private String ip;

    /** IP-based geolocation */
    private String location;

    /** IP geolocation city */
    @TableField("geo_city")
    private String geoCity;

    /** User-Agent string */
    @TableField("user_agent")
    private String userAgent;

    /** Device fingerprint */
    @TableField("device_fingerprint")
    private String deviceFingerprint;

    /**
     * Login result: SUCCESS / FAILED / LOCKED.
     * Maps to the 'result' column in DB.
     */
    @TableField("result")
    private String status;

    /** Login type: PASSWORD / SMS_CODE / EMAIL_CODE */
    @TableField("login_method")
    private String loginType;

    /** Is new device: true/false */
    @TableField("is_new_device")
    private Boolean isNewDevice;

    /** Is abnormal location: true/false */
    @TableField("is_abnormal_location")
    private Boolean isAbnormalLocation;

    /** Is abnormal time: true/false */
    @TableField("is_abnormal_time")
    private Boolean isAbnormalTime;

    /** Creation time */
    @com.baomidou.mybatisplus.annotation.TableField(value = "created_at", fill = com.baomidou.mybatisplus.annotation.FieldFill.INSERT)
    private LocalDateTime createdAt;
}

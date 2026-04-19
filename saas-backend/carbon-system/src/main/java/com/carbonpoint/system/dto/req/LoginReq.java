package com.carbonpoint.system.dto.req;

import lombok.Data;

@Data
public class LoginReq {
    private String phone;
    private String password;
    /** Captcha UUID (required when account is flagged) */
    private String captchaUuid;
    /** Captcha code (required when account is flagged) */
    private String captchaCode;
    /** Device fingerprint for refresh token security validation */
    private String deviceFingerprint;
}

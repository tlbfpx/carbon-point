package com.carbonpoint.system.security.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Login request DTO.
 */
public record LoginRequest(
        @NotBlank(message = "用户名不能为空") String username,
        @NotBlank(message = "密码不能为空") String password,
        /** Captcha UUID (required when captcha is triggered) */
        String captchaId,
        /** Captcha code (required when captcha is triggered) */
        String captchaCode,
        /** Device fingerprint for security detection */
        String deviceFingerprint,
        /** Tenant code for enterprise users */
        String tenantCode
) {
}

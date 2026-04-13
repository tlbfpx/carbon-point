package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.PlatformAuthResponse;

/**
 * Platform admin authentication service.
 */
public interface PlatformAuthService {

    /**
     * Login with username and password.
     * Returns access token + refresh token on success.
     */
    PlatformAuthResponse login(String username, String password, String deviceFingerprint, String clientIp);

    /**
     * Refresh access token using refresh token.
     */
    PlatformAuthResponse refreshToken(String refreshToken, String deviceFingerprint, String clientIp);

    /**
     * Logout (invalidate token server-side if needed).
     */
    void logout(Long adminId);
}

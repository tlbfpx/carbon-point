package com.carbonpoint.system.security.dto;

/**
 * Login response DTO.
 */
public record LoginResponse(
        String accessToken,
        String refreshToken,
        Long userId,
        String username,
        String displayName,
        Long tenantId,
        String tenantName,
        Integer passwordExpireDays,
        boolean passwordExpireWarning
) {
}

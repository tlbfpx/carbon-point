package com.carbonpoint.system.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Platform auth response containing tokens.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlatformAuthResponse {
    private String accessToken;
    private String refreshToken;
    private Long expiresIn;
    private PlatformAdminVO admin;
}

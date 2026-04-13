package com.carbonpoint.system.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Refresh token request DTO.
 */
@Data
public class RefreshTokenRequest {

    @NotBlank(message = "Refresh Token不能为空")
    private String refreshToken;

    private String deviceFingerprint;
}

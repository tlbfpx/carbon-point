package com.carbonpoint.system.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Platform admin login request DTO.
 */
@Data
public class PlatformLoginRequest {

    @NotBlank(message = "用户名不能为空")
    private String username;

    @NotBlank(message = "密码不能为空")
    private String password;

    private String deviceFingerprint;
}

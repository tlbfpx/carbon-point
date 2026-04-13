package com.carbonpoint.system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * Create/Update platform admin request DTO.
 */
@Data
public class PlatformAdminRequest {

    @NotBlank(message = "用户名不能为空")
    private String username;

    /** Password is required only when creating */
    private String password;

    private String displayName;

    @NotBlank(message = "角色不能为空")
    @Pattern(regexp = "^(super_admin|admin|viewer)$", message = "角色必须是 super_admin, admin 或 viewer")
    private String role;
}

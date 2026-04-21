package com.carbonpoint.system.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * Update platform admin request DTO (for partial updates).
 * Fields are optional, only provided fields will be updated.
 */
@Data
public class PlatformAdminUpdateRequest {

    private String username;

    /** Password is optional for update */
    private String password;

    private String displayName;

    @Email(message = "邮箱格式不正确")
    private String email;

    @Pattern(regexp = "^(super_admin|admin|viewer)$", message = "角色必须是 super_admin, admin 或 viewer")
    private String role;
}

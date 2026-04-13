package com.carbonpoint.common.security;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Platform admin identity extracted from JWT token.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlatformAdminInfo {
    private Long adminId;
    private String username;
    private String role;
}

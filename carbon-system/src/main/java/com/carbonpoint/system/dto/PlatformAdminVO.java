package com.carbonpoint.system.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Platform admin view object.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlatformAdminVO {
    private Long id;
    private String username;
    private String displayName;
    private String role;
    private String status;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
}

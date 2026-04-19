package com.carbonpoint.system.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Tenant view object for platform admin.
 * Field names match Phase 2 tenants table schema.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantVO {
    private Long id;
    private String name;
    private String logoUrl;
    private String packageType;
    private Long packageId;
    private Integer maxUsers;
    private Integer currentUsers;
    private String status;
    private LocalDateTime expireTime;
    private LocalDateTime createdAt;
}

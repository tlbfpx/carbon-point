package com.carbonpoint.system.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Create tenant request DTO (used by platform admin to create enterprise).
 */
@Data
public class TenantRequest {

    @NotBlank(message = "企业名称不能为空")
    private String name;

    private String logoUrl;

    /**
     * Package type is deprecated; use packageId instead.
     */
    private String packageType;

    /**
     * Permission package ID that defines the enterprise's permission boundary.
     */
    private Long packageId;

    private Integer maxUsers;

    private String expireTime; // yyyy-MM-dd HH:mm:ss format
}

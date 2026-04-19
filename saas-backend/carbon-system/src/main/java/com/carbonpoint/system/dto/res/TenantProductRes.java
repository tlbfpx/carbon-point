package com.carbonpoint.system.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Response DTO for tenant's product information.
 * Used by both tenant-side and platform-admin endpoints.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantProductRes {

    /** Platform product ID (UUID) */
    private String productId;

    /** Product code (e.g. stairs_basic, walking_pro) */
    private String productCode;

    /** Product display name */
    private String productName;

    /** Product category (e.g. stairs_climbing, walking) */
    private String category;

    /** Enabled features and their config values for this tenant's package */
    private Map<String, String> featureConfig;
}

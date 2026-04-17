package com.carbonpoint.system.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Feature configuration within a package-product context.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PackageFeatureRes {

    private String featureId;
    private String featureCode;
    private String featureName;
    private String featureType;
    private String valueType;

    /** Config value at package level (overrides product default and system default) */
    private String configValue;

    /** Whether this feature is enabled for the package-product */
    private Boolean isEnabled;

    /** Whether the config value has been customized (differs from product default) */
    private Boolean isCustomized;

    /** Product-level default config value (for comparison) */
    private String productDefaultValue;

    /** System-level default config value */
    private String systemDefaultValue;

    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}

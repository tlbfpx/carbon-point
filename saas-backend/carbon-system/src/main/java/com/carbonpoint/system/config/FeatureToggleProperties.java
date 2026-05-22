package com.carbonpoint.system.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for feature toggles.
 */
@Data
@Component
@ConfigurationProperties(prefix = "feature")
public class FeatureToggleProperties {

    /**
     * Whether to use the new unified resources architecture as primary.
     * When false (default), uses the old tables (Feature + PlatformProduct) as primary.
     * When true, uses the new tables (platform_resources, package_resource, tenant_resource_config) as primary.
     */
    private boolean unifiedResources = false;
}

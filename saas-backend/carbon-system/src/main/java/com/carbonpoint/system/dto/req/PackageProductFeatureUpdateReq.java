package com.carbonpoint.system.dto.req;

import lombok.Data;

import java.util.List;

/**
 * Request DTO for updating features of a specific product within a package.
 */
@Data
public class PackageProductFeatureUpdateReq {

    /** List of feature configurations */
    private List<FeatureItem> features;

    @Data
    public static class FeatureItem {
        /** Feature ID (required) */
        private String featureId;

        /** Config value override */
        private String configValue;

        /** Whether this feature is enabled for the package-product */
        private Boolean isEnabled;
    }
}

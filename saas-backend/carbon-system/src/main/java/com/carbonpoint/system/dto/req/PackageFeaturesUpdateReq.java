package com.carbonpoint.system.dto.req;

import lombok.Data;

import java.util.List;

/**
 * Request DTO for updating all product features for a package in one go.
 */
@Data
public class PackageFeaturesUpdateReq {

    /** List of products and their feature configurations */
    private List<ProductFeatureItem> products;

    @Data
    public static class ProductFeatureItem {
        /** Product code (required) */
        private String productCode;

        /** Feature configurations for this product */
        private List<FeatureItem> features;
    }

    @Data
    public static class FeatureItem {
        /** Feature code (required) */
        private String featureCode;

        /** Config value override */
        private String configValue;

        /** Whether this feature is enabled */
        private Boolean isEnabled;
    }
}

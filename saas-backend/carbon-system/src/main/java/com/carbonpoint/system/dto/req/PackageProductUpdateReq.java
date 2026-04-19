package com.carbonpoint.system.dto.req;

import lombok.Data;

import java.util.List;

/**
 * Request DTO for updating package-product associations.
 */
@Data
public class PackageProductUpdateReq {

    /**
     * List of product entries to associate with the package.
     * Full replacement: existing associations not in this list will be removed.
     */
    private List<ProductItem> products;

    @Data
    public static class ProductItem {
        /** Product ID (required) */
        private Long productId;

        /** Display sort order */
        private Integer sortOrder;

        /** Feature configurations for this product in the package */
        private List<FeatureItem> features;
    }

    @Data
    public static class FeatureItem {
        /** Feature ID (required) */
        private String featureId;

        /** Config value (only for config-type features) */
        private String configValue;

        /** Whether enabled */
        private Boolean isEnabled;
    }
}

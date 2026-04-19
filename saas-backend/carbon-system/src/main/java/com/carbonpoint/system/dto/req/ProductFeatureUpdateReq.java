package com.carbonpoint.system.dto.req;

import lombok.Data;

import java.util.List;

/**
 * Product-Feature update request DTO.
 */
@Data
public class ProductFeatureUpdateReq {
    private List<ProductFeatureItem> features;

    @Data
    public static class ProductFeatureItem {
        private String featureId;
        private String configValue;
        private Boolean isRequired;
        private Boolean isEnabled;
    }
}

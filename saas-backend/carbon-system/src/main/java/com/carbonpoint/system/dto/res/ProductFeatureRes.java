package com.carbonpoint.system.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Product-Feature relation response DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductFeatureRes {
    private String id;
    private String productId;
    private String featureId;
    private String featureCode;
    private String featureName;
    private String featureType;
    private String valueType;
    private String defaultValue;
    private String configValue;
    private Boolean isRequired;
    private Boolean isEnabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

package com.carbonpoint.system.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Package-Product response - includes product info and its feature configurations.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PackageProductRes {

    private String productId;
    private String productCode;
    private String productName;
    private String productCategory;
    private Integer productStatus;
    private Integer sortOrder;

    /** List of features configured for this product in the package */
    private List<PackageFeatureRes> features;

    private LocalDateTime createdAt;
}

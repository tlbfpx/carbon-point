package com.carbonpoint.system.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Package detail response - includes package info and associated products with their features.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PackageDetailRes {

    private Long id;
    private String code;
    private String name;
    private String description;
    private Boolean status;
    private Integer maxUsers;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** List of products associated with this package */
    private List<PackageProductRes> products;

    /** Total count of bound tenants */
    private Long tenantCount;
}

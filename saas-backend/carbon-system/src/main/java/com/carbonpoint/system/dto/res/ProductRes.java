package com.carbonpoint.system.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Product response DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRes {
    private String id;
    private String code;
    private String name;
    private String category;
    private String description;
    private Integer status;
    private Integer sortOrder;
    private Integer featureCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Package-Product-Feature association entity.
 * Stores per-(package, product, feature) configuration that overrides product defaults.
 * Configuration priority: package config > product config > system default value.
 */
@Data
@TableName("package_product_features")
public class PackageProductFeatureEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** Package ID */
    private Long packageId;

    /** Product ID (UUID string matching platform_products.id) */
    private String productId;

    /** Feature ID */
    private String featureId;

    /**
     * Configuration value (overrides product default and system default).
     * Only applicable for config-type features.
     */
    private String configValue;

    /** Whether this feature is enabled for the package-product */
    private Boolean isEnabled;

    /**
     * Whether the config value has been customized (i.e., differs from product default).
     * Used by frontend to show "customized" badge.
     */
    private Boolean isCustomized;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}

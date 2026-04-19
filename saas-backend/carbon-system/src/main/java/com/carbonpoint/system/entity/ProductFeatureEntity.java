package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Product-Feature association entity.
 * Defines which features are available for a product and their default values.
 */
@Data
@TableName("product_features")
public class ProductFeatureEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** Product ID */
    private String productId;

    /** Feature ID */
    private String featureId;

    /**
     * Default configuration value for this feature in the context of this product.
     * Used when package does not override.
     */
    private String configValue;

    /** Whether this feature is required for the product */
    private Boolean isRequired;

    /** Whether this feature is enabled for the product */
    private Boolean isEnabled;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}

package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Package-Product association entity.
 * Links a permission package to products and defines sort order.
 */
@Data
@TableName("package_products")
public class PackageProductEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** Package ID */
    private Long packageId;

    /** Product ID */
    private Long productId;

    /** Display sort order */
    private Integer sortOrder;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}

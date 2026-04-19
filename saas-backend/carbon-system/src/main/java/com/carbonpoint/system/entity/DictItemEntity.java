package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Dictionary item entity for system-level configuration.
 */
@Data
@TableName("dict_items")
public class DictItemEntity {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    /** Dictionary type, e.g., "product_category", "feature_type" */
    @TableField("dict_type")
    private String dictType;

    /** Dictionary code, unique within a type */
    @TableField("dict_code")
    private String dictCode;

    /** Display name */
    @TableField("dict_name")
    private String dictName;

    /** Status: 1=enabled, 0=disabled */
    private Integer status;

    /** Sort order */
    @TableField("sort_order")
    private Integer sortOrder;

    /** Remark / description */
    private String remark;

    @TableField("created_at")
    private LocalDateTime createdAt;

    @TableField("updated_at")
    private LocalDateTime updatedAt;
}

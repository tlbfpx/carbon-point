package com.carbonpoint.walking.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("fun_conversion_rules")
public class FunConversionRuleEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tenantId;

    /** Display name of the fun item (e.g. "banana") */
    private String itemName;

    /** Unit label (e.g. "根", "碗", "公里") */
    private String unit;

    /** Calories consumed per unit of this item */
    private Double caloriesPerUnit;

    /** Icon or emoji for display */
    private String icon;

    /** Sort order for display (ascending) */
    private Integer sortOrder;

    @TableLogic
    @TableField(fill = FieldFill.INSERT)
    private Integer deleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}

package com.carbonpoint.walking.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("walking_tier_rules")
public class WalkingTierRuleEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tenantId;

    /** Minimum steps (inclusive) for this tier */
    private Integer minSteps;

    /** Maximum steps (exclusive) for this tier */
    private Integer maxSteps;

    /** Points awarded for matching this tier */
    private Integer points;

    /** Sort order for tier evaluation (ascending) */
    private Integer sortOrder;

    @TableLogic
    @TableField(fill = FieldFill.INSERT)
    private Integer deleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}

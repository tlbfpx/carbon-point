package com.carbonpoint.points.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * 积分规则实体。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("point_rules")
public class PointRule {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private Long tenantId;

    /** 规则类型: time_slot / streak / special_date / level_coefficient / daily_cap */
    private String type;

    private String name;

    /** JSON 配置 */
    private String config;

    private Boolean enabled;

    /** 执行顺序 */
    private Integer sortOrder;

    private String sourceTemplateId;

    private String productCode;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}

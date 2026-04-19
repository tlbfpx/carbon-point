package com.carbonpoint.honor.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 徽章定义实体（badge_definitions 表）。
 */
@Data
@TableName("badge_definitions")
public class BadgeDefinition {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 徽章唯一标识，如 first_checkin */
    private String badgeId;

    /** 徽章显示名称 */
    private String name;

    /** 徽章描述 */
    private String description;

    /** 徽章图标URL */
    private String icon;

    /** 稀有度: common/rare/epic */
    private String rarity;

    /** 获得条件表达式 */
    private String conditionExpr;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableLogic
    private Integer deleted;
}

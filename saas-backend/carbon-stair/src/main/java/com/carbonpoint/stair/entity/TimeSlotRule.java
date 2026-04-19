package com.carbonpoint.stair.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalTime;

/**
 * 时段规则实体。
 * 定义一个可打卡的时段（如 "上午 08:00-10:00"）。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("time_slot_rules")
public class TimeSlotRule {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 所属租户 */
    private Long tenantId;

    /** 规则名称，如 "上午时段" */
    private String name;

    /** 开始时间（HH:mm:ss） */
    private LocalTime startTime;

    /** 结束时间（HH:mm:ss） */
    private LocalTime endTime;

    /** 是否启用 */
    private Boolean enabled;

    @TableField(fill = FieldFill.INSERT)
    private java.time.LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private java.time.LocalDateTime updatedAt;

    @TableLogic
    private Integer deleted;
}

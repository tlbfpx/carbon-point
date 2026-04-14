package com.carbonpoint.checkin.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

/**
 * 时段打卡状态 DTO。
 * 用于 H5 打卡页面展示每个时段的状态。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TimeSlotDTO {

    /** 时段规则ID（对应 PointRule.id） */
    private Long ruleId;

    /** 时段名称，如 "早间时段" */
    private String name;

    /** 开始时间 */
    private LocalTime startTime;

    /** 结束时间 */
    private LocalTime endTime;

    /**
     * 时段状态：
     * checked_in - 已打卡
     * available  - 可打卡
     * not_started - 未开始（时间未到）
     * ended      - 已结束
     */
    private String status;

    /**
     * 该时段已打卡的记录ID（仅 status=checked_in 时有值）
     */
    private Long recordId;
}

package com.carbonpoint.points.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * 积分账户实体（用户积分主档）。
 * 对应 users 表中的积分相关字段（total_points / available_points / frozen_points）。
 * 本实体用于封装积分账户操作，不直接映射到单一一张表。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PointAccount {

    private Long userId;

    private Long tenantId;

    /** 累计积分 */
    private Integer totalPoints;

    /** 可用积分 */
    private Integer availablePoints;

    /** 冻结积分（兑换中） */
    private Integer frozenPoints;

    /** 当前等级（由 totalPoints 自动计算） */
    private Integer level;

    /** 当前连续打卡天数 */
    private Integer consecutiveDays;

    /** 最后打卡日期 */
    private java.time.LocalDate lastCheckinDate;

    /** 乐观锁版本号 */
    @Version
    private Long version;
}

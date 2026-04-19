package com.carbonpoint.stair.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("check_in_records")
public class CheckInRecordEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private Long tenantId;

    /** Matched time slot rule ID */
    private Long timeSlotRuleId;

    private LocalDate checkinDate;

    /**
     * User's actual check-in time, precise to milliseconds.
     * Maps to the checkin_time DATETIME(3) column.
     */
    @TableField("checkin_time")
    private LocalDateTime checkinTime;

    /** Random base points from time slot */
    private Integer basePoints;

    /** Final points after all rules */
    private Integer finalPoints;

    /** Special date multiplier */
    private BigDecimal multiplier;

    /** Level coefficient */
    private BigDecimal levelCoefficient;

    /** Consecutive days after this check-in */
    private Integer consecutiveDays;

    /** Streak bonus points awarded */
    private Integer streakBonus;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableLogic
    private Integer deleted;

    @Version
    private Long version;
}

package com.carbonpoint.walking.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("step_daily_records")
public class StepDailyRecordEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tenantId;

    private Long userId;

    private LocalDate recordDate;

    private Integer stepCount;

    private Integer pointsAwarded;

    /** Data source: werun / healthkit / health_connect */
    private String source;

    /** Whether the user has claimed points for this record */
    private Boolean claimed;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}

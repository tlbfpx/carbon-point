package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Holiday calendar entity for platform-wide holiday management.
 * Maps to the holiday_calendar table.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("holiday_calendar")
public class HolidayCalendarEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** The date of the holiday */
    private LocalDate holidayDate;

    /** Display name of the holiday (e.g. "春节", "国庆节") */
    private String holidayName;

    /** Type of holiday (e.g. "public", "company", "makeup_workday") */
    private String holidayType;

    /** Year for quick filtering */
    private Integer year;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableLogic
    private Integer deleted;
}

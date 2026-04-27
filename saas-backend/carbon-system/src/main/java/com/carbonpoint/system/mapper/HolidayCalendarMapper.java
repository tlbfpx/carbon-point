package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.system.entity.HolidayCalendarEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * Mapper for holiday_calendar table.
 * Platform-level table — no tenant isolation.
 */
@Mapper
@InterceptorIgnore(tenantLine = "true")
public interface HolidayCalendarMapper extends BaseMapper<HolidayCalendarEntity> {
}

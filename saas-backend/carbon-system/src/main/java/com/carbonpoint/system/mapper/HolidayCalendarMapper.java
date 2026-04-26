package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.system.entity.HolidayCalendarEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * Mapper for holiday_calendar table.
 */
@Mapper
public interface HolidayCalendarMapper extends BaseMapper<HolidayCalendarEntity> {
}

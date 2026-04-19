package com.carbonpoint.checkin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.checkin.entity.TimeSlotRule;
import org.apache.ibatis.annotations.Mapper;

/**
 * Mapper for time_slot_rules table.
 */
@Mapper
public interface TimeSlotRuleMapper extends BaseMapper<TimeSlotRule> {
}

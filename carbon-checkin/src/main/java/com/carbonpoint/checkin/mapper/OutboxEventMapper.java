package com.carbonpoint.checkin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.checkin.entity.OutboxEvent;
import org.apache.ibatis.annotations.Mapper;

/**
 * Outbox event mapper.
 */
@Mapper
public interface OutboxEventMapper extends BaseMapper<OutboxEvent> {
}

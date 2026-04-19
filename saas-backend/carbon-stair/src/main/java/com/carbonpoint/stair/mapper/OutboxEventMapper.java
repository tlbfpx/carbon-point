package com.carbonpoint.stair.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.stair.entity.OutboxEvent;
import org.apache.ibatis.annotations.Mapper;

/**
 * Outbox event mapper.
 */
@Mapper
public interface OutboxEventMapper extends BaseMapper<OutboxEvent> {
}

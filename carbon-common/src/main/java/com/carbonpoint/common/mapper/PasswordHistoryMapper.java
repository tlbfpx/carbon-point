package com.carbonpoint.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.entity.PasswordHistoryEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * Mapper for password_history table.
 */
@Mapper
public interface PasswordHistoryMapper extends BaseMapper<PasswordHistoryEntity> {
}

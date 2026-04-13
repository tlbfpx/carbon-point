package com.carbonpoint.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.entity.PermissionEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * Mapper for permissions table.
 */
@Mapper
public interface CommonPermissionMapper extends BaseMapper<PermissionEntity> {
}

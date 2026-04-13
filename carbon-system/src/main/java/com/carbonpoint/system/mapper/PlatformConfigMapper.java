package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.entity.PlatformConfigEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * Platform config mapper.
 * Ignores tenant line interceptor.
 */
@Mapper
@InterceptorIgnore
public interface PlatformConfigMapper extends BaseMapper<PlatformConfigEntity> {
}

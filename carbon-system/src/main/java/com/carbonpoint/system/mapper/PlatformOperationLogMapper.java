package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.entity.PlatformOperationLogEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * Platform operation log mapper.
 * Ignores tenant line interceptor.
 */
@Mapper
@InterceptorIgnore
public interface PlatformOperationLogMapper extends BaseMapper<PlatformOperationLogEntity> {
}

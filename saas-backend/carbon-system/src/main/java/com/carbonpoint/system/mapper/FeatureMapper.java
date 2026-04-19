package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.entity.FeatureEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * Feature mapper - platform level, ignores tenant interceptor.
 */
@Mapper
@InterceptorIgnore
public interface FeatureMapper extends BaseMapper<FeatureEntity> {
}

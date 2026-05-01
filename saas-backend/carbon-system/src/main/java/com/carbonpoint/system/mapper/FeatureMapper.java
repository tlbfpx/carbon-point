package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.entity.FeatureEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

/**
 * Feature mapper - platform level, ignores tenant interceptor.
 * @deprecated Deprecated for removal in v2.3, use unified resources instead.
 */
@Deprecated
@Mapper
@InterceptorIgnore
public interface FeatureMapper extends BaseMapper<FeatureEntity> {

    @Select("SELECT * FROM features WHERE code = #{code}")
    FeatureEntity selectByCode(String code);
}

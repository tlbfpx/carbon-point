package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.entity.TriggerTypeEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
@InterceptorIgnore
public interface TriggerTypeMapper extends BaseMapper<TriggerTypeEntity> {
}

package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.entity.DictItemEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
@InterceptorIgnore
public interface DictItemMapper extends BaseMapper<DictItemEntity> {
}

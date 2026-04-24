package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.entity.RuleNodeTypeEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
@InterceptorIgnore
public interface RuleNodeTypeMapper extends BaseMapper<RuleNodeTypeEntity> {
}

package com.carbonpoint.points.mapper;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.carbonpoint.points.entity.PointExpirationConfig;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface PointExpirationConfigMapper extends com.baomidou.mybatisplus.core.mapper.BaseMapper<PointExpirationConfig> {

    @InterceptorIgnore(tenantLine = "1")
    @Select("SELECT * FROM point_expiration_configs WHERE tenant_id = #{tenantId}")
    PointExpirationConfig selectByTenantId(@Param("tenantId") Long tenantId);
}

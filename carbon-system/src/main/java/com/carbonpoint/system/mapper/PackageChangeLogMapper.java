package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.system.entity.PackageChangeLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface PackageChangeLogMapper extends BaseMapper<PackageChangeLog> {

    @Select("SELECT * FROM package_change_logs WHERE tenant_id = #{tenantId} ORDER BY created_at DESC")
    List<PackageChangeLog> selectByTenantId(@Param("tenantId") Long tenantId);
}

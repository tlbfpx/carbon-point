package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.entity.Role;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface RoleMapper extends BaseMapper<Role> {

    @InterceptorIgnore
    @Select("SELECT * FROM roles WHERE id = #{id}")
    Role selectByIdForPlatform(@Param("id") Long id);

    @InterceptorIgnore
    @Select("SELECT * FROM roles WHERE tenant_id = #{tenantId} ORDER BY is_preset DESC, created_at ASC")
    List<Role> selectByTenantIdForPlatform(@Param("tenantId") Long tenantId);
}

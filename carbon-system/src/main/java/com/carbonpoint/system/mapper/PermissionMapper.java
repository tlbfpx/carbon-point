package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.system.entity.Permission;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface PermissionMapper extends BaseMapper<Permission> {

    /**
     * Get all permission codes for a user.
     * TenantLineInnerInterceptor is skipped to avoid corrupting the JOIN.
     */
    @InterceptorIgnore(tenantLine = "true")
    @Select("SELECT p.code FROM permissions p " +
            "INNER JOIN role_permissions rp ON rp.permission_code = p.code " +
            "INNER JOIN user_roles ur ON ur.role_id = rp.role_id " +
            "WHERE ur.user_id = #{userId}")
    List<String> selectPermissionCodesByUserId(@Param("userId") Long userId);

    @InterceptorIgnore(tenantLine = "true")
    @Select("SELECT rp.permission_code FROM role_permissions rp WHERE rp.role_id = #{roleId}")
    List<String> selectPermissionCodesByRoleId(Long roleId);
}

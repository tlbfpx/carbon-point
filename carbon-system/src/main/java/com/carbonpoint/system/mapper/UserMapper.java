package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.system.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserMapper extends BaseMapper<User> {

    /**
     * Find user by phone without tenant filtering.
     * Used by AuthService during login where no tenant context is available.
     * Phone numbers are globally unique.
     */
    @InterceptorIgnore(tenantLine = "1")
    @Select("SELECT * FROM users WHERE phone = #{phone} LIMIT 1")
    User selectByPhone(@Param("phone") String phone);

    /**
     * Find user by ID without tenant filtering.
     * Used during registration when binding a user to a tenant via invite code.
     */
    @InterceptorIgnore(tenantLine = "1")
    @Select("SELECT * FROM users WHERE id = #{id}")
    User selectByIdNoTenant(@Param("id") Long id);

    /**
     * Update user tenant_id by user ID without tenant filtering.
     * Used during registration when binding a user to a tenant via invite code.
     */
    @InterceptorIgnore(tenantLine = "1")
    @org.apache.ibatis.annotations.Update("UPDATE users SET tenant_id = #{tenantId} WHERE id = #{userId}")
    void updateTenantIdById(@Param("userId") Long userId, @Param("tenantId") Long tenantId);

    /**
     * Update user password hash by user ID.
     * Used by AuthService during password change.
     */
    @InterceptorIgnore(tenantLine = "1")
    @org.apache.ibatis.annotations.Update("UPDATE users SET password_hash = #{passwordHash} WHERE id = #{userId}")
    void updatePasswordHash(@Param("userId") Long userId, @Param("passwordHash") String passwordHash);
}

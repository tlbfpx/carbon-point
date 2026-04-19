package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.system.entity.TenantInvitation;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface TenantInvitationMapper extends BaseMapper<TenantInvitation> {

    /**
     * Find invitation by code without tenant filtering.
     * Used during registration when no tenant context exists.
     */
    @InterceptorIgnore(tenantLine = "true")
    @Select("SELECT * FROM tenant_invitations WHERE invite_code = #{inviteCode}")
    TenantInvitation selectByInviteCode(@Param("inviteCode") String inviteCode);

    /**
     * Increment used count without tenant filtering.
     * Used during registration when binding a user to a tenant.
     */
    @InterceptorIgnore(tenantLine = "true")
    @Update("UPDATE tenant_invitations SET used_count = used_count + 1 WHERE id = #{id}")
    void incrementUsedCount(@Param("id") Long id);
}

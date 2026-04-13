package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.system.entity.PlatformAdminEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * Platform admin mapper.
 * Ignores tenant line interceptor (platform_admins is in CustomTenantLineHandler.IGNORE_TABLES).
 */
@Mapper
public interface PlatformAdminMapper extends BaseMapper<PlatformAdminEntity> {
}

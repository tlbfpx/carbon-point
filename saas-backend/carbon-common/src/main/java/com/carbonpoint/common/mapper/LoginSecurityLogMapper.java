package com.carbonpoint.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.entity.LoginSecurityLogEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * Mapper for login_security_logs table.
 */
@Mapper
public interface LoginSecurityLogMapper extends BaseMapper<LoginSecurityLogEntity> {
}

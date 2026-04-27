package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.system.entity.PlatformMallProductEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * Mapper for platform_mall_products table.
 * Platform-level table — no tenant isolation.
 */
@Mapper
@InterceptorIgnore(tenantLine = "true")
public interface PlatformMallProductMapper extends BaseMapper<PlatformMallProductEntity> {
}

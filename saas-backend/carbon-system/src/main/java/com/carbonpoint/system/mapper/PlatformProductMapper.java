package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.entity.PlatformProduct;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

/**
 * Platform-level product mapper.
 */
@Mapper
@InterceptorIgnore
public interface PlatformProductMapper extends BaseMapper<PlatformProduct> {

    @Select("SELECT * FROM platform_products WHERE code = #{code} AND deleted = 0")
    PlatformProduct selectByCode(String code);
}

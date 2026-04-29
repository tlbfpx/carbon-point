package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.entity.ProductEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

/**
 * Platform-level product mapper.
 */
@Mapper
@InterceptorIgnore
public interface ProductMapper extends BaseMapper<ProductEntity> {

    @Select("SELECT * FROM platform_products WHERE code = #{code} AND deleted = 0")
    ProductEntity selectByCode(String code);
}

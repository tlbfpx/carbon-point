package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.entity.ProductFeatureEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * Product-Feature association mapper.
 */
@Mapper
@InterceptorIgnore
public interface ProductFeatureMapper extends BaseMapper<ProductFeatureEntity> {

    @Select("SELECT * FROM product_features WHERE product_id = #{productId}")
    List<ProductFeatureEntity> selectByProductId(@Param("productId") String productId);

    @Select("SELECT * FROM product_features WHERE product_id = #{productId} AND feature_id = #{featureId}")
    ProductFeatureEntity selectByProductIdAndFeatureId(@Param("productId") String productId, @Param("featureId") String featureId);

    @Select("SELECT feature_id FROM product_features WHERE product_id = #{productId} AND is_enabled = 1")
    List<String> selectEnabledFeatureIds(@Param("productId") String productId);
}

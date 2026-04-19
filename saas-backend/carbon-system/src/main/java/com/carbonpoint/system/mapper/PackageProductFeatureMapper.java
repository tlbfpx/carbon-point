package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.entity.PackageProductFeatureEntity;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * Package-Product-Feature association mapper.
 */
@Mapper
@InterceptorIgnore
public interface PackageProductFeatureMapper extends BaseMapper<PackageProductFeatureEntity> {

    @Select("SELECT * FROM package_product_features WHERE package_id = #{packageId} AND product_id = #{productId}")
    List<PackageProductFeatureEntity> selectByPackageIdAndProductId(
            @Param("packageId") Long packageId, @Param("productId") Long productId);

    @Select("SELECT * FROM package_product_features WHERE package_id = #{packageId}")
    List<PackageProductFeatureEntity> selectByPackageId(@Param("packageId") Long packageId);

    @Select("SELECT feature_id FROM package_product_features WHERE package_id = #{packageId} AND product_id = #{productId} AND is_enabled = 1")
    List<String> selectEnabledFeatureIds(@Param("packageId") Long packageId, @Param("productId") Long productId);

    @Delete("DELETE FROM package_product_features WHERE package_id = #{packageId} AND product_id = #{productId}")
    int deleteByPackageIdAndProductId(@Param("packageId") Long packageId, @Param("productId") Long productId);

    @Delete("DELETE FROM package_product_features WHERE package_id = #{packageId}")
    int deleteByPackageId(@Param("packageId") Long packageId);

    @Insert("<script>" +
            "INSERT INTO package_product_features (package_id, product_id, feature_id, config_value, is_enabled, is_customized, create_time, update_time) VALUES " +
            "<foreach collection='list' item='item' separator=','>" +
            "(#{item.packageId}, #{item.productId}, #{item.featureId}, #{item.configValue}, #{item.isEnabled}, #{item.isCustomized}, NOW(), NOW())" +
            "</foreach>" +
            "</script>")
    int batchInsert(@Param("list") List<PackageProductFeatureEntity> list);
}

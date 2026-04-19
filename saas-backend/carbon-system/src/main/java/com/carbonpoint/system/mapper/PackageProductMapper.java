package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.entity.PackageProductEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * Package-Product association mapper.
 */
@Mapper
@InterceptorIgnore
public interface PackageProductMapper extends BaseMapper<PackageProductEntity> {

    @Select("SELECT product_id FROM package_products WHERE package_id = #{packageId} ORDER BY sort_order ASC")
    List<String> selectProductIdsByPackageId(@Param("packageId") Long packageId);

    @Select("SELECT * FROM package_products WHERE package_id = #{packageId} ORDER BY sort_order ASC")
    List<PackageProductEntity> selectByPackageId(@Param("packageId") Long packageId);

    @Select("SELECT * FROM package_products WHERE package_id = #{packageId} AND product_id = #{productId}")
    PackageProductEntity selectByPackageIdAndProductId(@Param("packageId") Long packageId, @Param("productId") String productId);

    @Select("DELETE FROM package_products WHERE package_id = #{packageId}")
    int deleteByPackageId(@Param("packageId") Long packageId);
}

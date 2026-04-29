package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.entity.PackagePlatformProduct;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * Package-Product association mapper.
 */
@Mapper
@InterceptorIgnore
public interface PackagePlatformProductMapper extends BaseMapper<PackagePlatformProduct> {

    @Select("SELECT product_id FROM package_products WHERE package_id = #{packageId} ORDER BY sort_order ASC")
    List<String> selectProductIdsByPackageId(@Param("packageId") Long packageId);

    @Select("SELECT * FROM package_products WHERE package_id = #{packageId} ORDER BY sort_order ASC")
    List<PackagePlatformProduct> selectByPackageId(@Param("packageId") Long packageId);

    @Select("SELECT * FROM package_products WHERE package_id = #{packageId} AND product_id = #{productId}")
    PackagePlatformProduct selectByPackageIdAndProductId(@Param("packageId") Long packageId, @Param("productId") String productId);

    @Select("SELECT package_id FROM package_products WHERE product_id = #{productId}")
    List<Long> selectPackageIdsByProductId(@Param("productId") String productId);

    @Delete("DELETE FROM package_products WHERE package_id = #{packageId}")
    int deleteByPackageId(@Param("packageId") Long packageId);
}

package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.system.entity.PackagePermission;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface PackagePermissionMapper extends BaseMapper<PackagePermission> {

    @Select("SELECT permission_code FROM package_permissions WHERE package_id = #{packageId}")
    List<String> selectCodesByPackageId(@Param("packageId") Long packageId);

    @Select("SELECT package_id FROM package_permissions WHERE permission_code = #{permissionCode}")
    List<Long> selectPackageIdsByPermissionCode(@Param("permissionCode") String permissionCode);
}

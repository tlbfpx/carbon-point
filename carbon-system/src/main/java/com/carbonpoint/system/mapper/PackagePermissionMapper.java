package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.entity.PackagePermission;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
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

    @InterceptorIgnore
    @Delete("DELETE FROM package_permissions WHERE package_id = #{packageId}")
    int deleteByPackageId(@Param("packageId") Long packageId);

    @InterceptorIgnore
    @Delete("<script>" +
            "DELETE FROM package_permissions WHERE package_id = #{packageId} AND permission_code IN " +
            "<foreach collection='codes' item='code' open='(' separator=',' close=')'>" +
            "#{code}" +
            "</foreach>" +
            "</script>")
    int deleteByPackageIdAndCodes(@Param("packageId") Long packageId, @Param("codes") List<String> codes);

    @InterceptorIgnore
    @Insert("<script>" +
            "INSERT INTO package_permissions (package_id, permission_code) VALUES " +
            "<foreach collection='list' item='item' separator=','>" +
            "(#{item.packageId}, #{item.permissionCode})" +
            "</foreach>" +
            "</script>")
    int batchInsert(@Param("list") List<PackagePermission> list);

    @Select("<script>SELECT package_id, permission_code FROM package_permissions WHERE package_id IN " +
            "<foreach item='id' collection='packageIds' open='(' separator=',' close=')'>#{id}</foreach>" +
            "</script>")
    List<PackagePermission> selectByPackageIds(@Param("packageIds") List<Long> packageIds);
}

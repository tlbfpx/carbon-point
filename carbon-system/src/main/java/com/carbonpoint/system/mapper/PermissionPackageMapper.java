package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.entity.PermissionPackage;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface PermissionPackageMapper extends BaseMapper<PermissionPackage> {

    @InterceptorIgnore
    @Select("SELECT * FROM permission_packages WHERE status = 1 ORDER BY id ASC")
    List<PermissionPackage> selectAllActive();

    @InterceptorIgnore
    @Select("SELECT pp.code FROM permission_packages pp " +
            "JOIN package_permissions pkgp ON pkgp.package_id = pp.id " +
            "WHERE pp.id = #{packageId}")
    List<String> selectPermissionCodesByPackageId(@Param("packageId") Long packageId);

    @InterceptorIgnore
    @Select("SELECT COUNT(*) FROM tenants WHERE package_id = #{packageId}")
    long countTenantsByPackageId(@Param("packageId") Long packageId);
}

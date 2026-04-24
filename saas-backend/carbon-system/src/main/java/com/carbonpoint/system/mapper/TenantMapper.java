package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.entity.Tenant;
import org.apache.ibatis.annotations.MapKey;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

@Mapper
public interface TenantMapper extends BaseMapper<Tenant> {

    @InterceptorIgnore
    @Select("SELECT * FROM tenants ORDER BY created_at DESC")
    List<Tenant> selectAllForPlatform();

    @InterceptorIgnore
    @Select("SELECT * FROM tenants WHERE id = #{id}")
    Tenant selectByIdForPlatform(Long id);

    @InterceptorIgnore
    @Select("<script>" +
            "SELECT COUNT(*) FROM tenants" +
            "<if test='keyword != null and keyword != \"\"'> WHERE name LIKE CONCAT('%', #{keyword}, '%')</if>" +
            "</script>")
    long countForPlatform(@Param("keyword") String keyword);

    @InterceptorIgnore
    @Select("<script>" +
            "SELECT * FROM tenants" +
            "<if test='keyword != null and keyword != \"\"'> WHERE name LIKE CONCAT('%', #{keyword}, '%')</if>" +
            " ORDER BY created_at DESC LIMIT #{offset}, #{limit}" +
            "</script>")
    List<Tenant> selectPageForPlatform(@Param("keyword") String keyword,
                                       @Param("offset") long offset,
                                       @Param("limit") long limit);

    @InterceptorIgnore
    @Select("SELECT tenant_id, COUNT(*) AS cnt FROM users GROUP BY tenant_id")
    List<Map<String, Object>> countUsersByTenantId();

    @InterceptorIgnore
    @Select("SELECT id FROM tenants WHERE package_id = #{packageId}")
    List<Long> selectIdsByPackageId(@Param("packageId") Long packageId);
}

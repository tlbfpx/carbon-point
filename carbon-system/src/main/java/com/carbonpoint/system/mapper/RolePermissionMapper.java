package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.system.entity.RolePermission;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface RolePermissionMapper extends BaseMapper<RolePermission> {

    @Select("SELECT rp.role_id FROM role_permissions rp INNER JOIN user_roles ur ON ur.role_id = rp.role_id WHERE ur.user_id = #{userId}")
    List<Long> selectRoleIdsByUserId(@Param("userId") Long userId);

    @Delete("DELETE FROM role_permissions WHERE role_id = #{roleId}")
    void deleteByRoleId(@Param("roleId") Long roleId);

    @Select("SELECT rp.user_id FROM role_permissions rp INNER JOIN user_roles ur ON ur.role_id = rp.role_id WHERE rp.role_id = #{roleId}")
    List<Long> selectUserIdsByRoleId(@Param("roleId") Long roleId);

    @Select("SELECT permission_code FROM role_permissions WHERE role_id = #{roleId}")
    List<String> selectPermissionCodesByRoleId(@Param("roleId") Long roleId);

    @Select("<script>SELECT role_id, permission_code FROM role_permissions WHERE role_id IN "
            + "<foreach item='id' collection='roleIds' open='(' separator=',' close=')'>#{id}</foreach></script>")
    List<RolePermission> selectByRoleIds(@Param("roleIds") List<Long> roleIds);

    @Insert("<script>" +
            "INSERT INTO role_permissions (role_id, permission_code) VALUES " +
            "<foreach collection='list' item='item' separator=','>" +
            "(#{item.roleId}, #{item.permissionCode})" +
            "</foreach>" +
            "</script>")
    int batchInsertRolePerms(@Param("list") List<RolePermission> list);
}

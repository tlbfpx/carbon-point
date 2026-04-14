package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.system.entity.UserRole;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface UserRoleMapper extends BaseMapper<UserRole> {

    @Select("SELECT ur.role_id FROM user_roles ur WHERE ur.user_id = #{userId}")
    List<Long> selectRoleIdsByUserId(@Param("userId") Long userId);

    @Delete("DELETE FROM user_roles WHERE user_id = #{userId}")
    void deleteByUserId(@Param("userId") Long userId);

    @Select("SELECT ur.user_id FROM user_roles ur WHERE ur.role_id = #{roleId}")
    List<Long> selectUserIdsByRoleId(@Param("roleId") Long roleId);

    @Select("<script>SELECT ur.user_id FROM user_roles ur WHERE ur.role_id IN "
            + "<foreach item='id' collection='roleIds' open='(' separator=',' close=')'>#{id}</foreach></script>")
    List<Long> selectUserIdsByRoleIds(@Param("roleIds") List<Long> roleIds);

    @Insert("<script>" +
            "INSERT INTO user_roles (user_id, role_id) VALUES " +
            "<foreach collection='list' item='item' separator=','>" +
            "(#{item.userId}, #{item.roleId})" +
            "</foreach>" +
            "</script>")
    int batchInsert(@Param("list") List<UserRole> list);

    @Select("<script>SELECT user_id, role_id FROM user_roles WHERE user_id IN " +
            "<foreach item='id' collection='userIds' open='(' separator=',' close=')'>#{id}</foreach></script>")
    List<UserRole> selectByUserIds(@Param("userIds") List<Long> userIds);
}

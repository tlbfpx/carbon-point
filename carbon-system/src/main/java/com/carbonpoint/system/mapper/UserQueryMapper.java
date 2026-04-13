package com.carbonpoint.system.mapper;

import com.carbonpoint.system.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDate;
import java.util.List;

/**
 * 定时任务专用的用户查询 Mapper。
 */
@Mapper
public interface UserQueryMapper {

    /**
     * Find user by ID (with tenant filter via MyBatis-Plus interceptor).
     */
    @Select("SELECT * FROM users WHERE id = #{id} AND status = 'active' LIMIT 1")
    User selectById(@Param("id") Long id);

    /**
     * 查询租户下所有活跃用户，按 total_points DESC 排序（平分按 checkin_time ASC）。
     * 用于历史排行榜。
     */
    @Select("""
        SELECT u.* FROM users u
        WHERE u.tenant_id = #{tenantId} AND u.status = 'active'
        ORDER BY u.total_points DESC,
                 COALESCE(u.last_checkin_date, '1970-01-01') ASC
        """)
    List<User> selectActiveByTenantOrdered(@Param("tenantId") Long tenantId);

    /**
     * 统计租户下活跃用户数。
     */
    @Select("SELECT COUNT(*) FROM users WHERE tenant_id = #{tenantId} AND status = 'active'")
    Long countActiveByTenant(@Param("tenantId") Long tenantId);

    /**
     * 统计积分大于指定值的活跃用户数（用于计算 percentile）。
     */
    @Select("SELECT COUNT(*) FROM users WHERE tenant_id = #{tenantId} AND status = 'active' AND total_points > #{points}")
    Long countUsersWithMorePoints(@Param("tenantId") Long tenantId, @Param("points") Integer points);

    /**
     * 统计指定部门的用户数。
     */
    @Select("SELECT COUNT(*) FROM users WHERE department_id = #{departmentId}")
    Long countByDepartment(@Param("departmentId") Long departmentId);

    /**
     * 更新用户的部门。
     */
    @Update("UPDATE users SET department_id = #{departmentId}, updated_at = NOW() WHERE id = #{userId}")
    void updateDepartment(@Param("userId") Long userId, @Param("departmentId") Long departmentId);

    /**
     * 查询昨日打卡但今日未打卡的用户（用于发送连续打卡中断通知）。
     * 条件：consecutive_days > 0（之前有连续记录），且 last_checkin_date = yesterday。
     * 同时确保今天没有 check_in_records。
     */
    @Select("""
        SELECT u.id AS userId, u.tenant_id AS tenantId, u.phone,
               u.consecutive_days AS previousStreakDays
        FROM users u
        LEFT JOIN notifications n ON n.user_id = u.id
            AND n.type = 'streak_broken'
            AND DATE(n.created_at) = CURDATE()
        LEFT JOIN check_in_records cr ON cr.user_id = u.id
            AND cr.checkin_date = CURDATE()
        WHERE u.consecutive_days > 0
          AND u.last_checkin_date = #{yesterday}
          AND u.status = 'active'
          AND n.id IS NULL
          AND cr.id IS NULL
        """)
    List<StreakBrokenRecord> findStreakBrokenUsers(@Param("yesterday") LocalDate yesterday);

    record StreakBrokenRecord(
            Long userId,
            Long tenantId,
            String phone,
            Integer previousStreakDays
    ) {}
}

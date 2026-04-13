package com.carbonpoint.points.mapper;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.carbonpoint.system.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.Map;

/**
 * User point operations mapper.
 * Direct SQL queries on users table to avoid circular dependency
 * between carbon-points and carbon-system.
 */
@Mapper
public interface PointsUserMapper {

    /**
     * Get user by ID. Skips tenant line interceptor since the ID uniquely identifies the user.
     */
    @InterceptorIgnore(tenantLine = "1")
    @Select("SELECT id, tenant_id, nickname, level, total_points, available_points, " +
            "frozen_points, consecutive_days, last_checkin_date, version " +
            "FROM users WHERE id = #{userId}")
    User selectById(@Param("userId") Long userId);

    /**
     * Atomically update points. Returns rows affected.
     * Skips tenant line since user ID is the unique identifier.
     */
    @InterceptorIgnore(tenantLine = "1")
    int updatePointsAtomic(@Param("userId") Long userId,
                           @Param("delta") int delta,
                           @Param("frozenDelta") int frozenDelta);

    /**
     * Optimistic lock point deduction.
     * Only updates if the version matches (no concurrent modification).
     * Returns rows affected (1 if success, 0 if version mismatch).
     */
    @InterceptorIgnore(tenantLine = "1")
    @Update("UPDATE users SET available_points = available_points + #{delta}, " +
            "version = version + 1 WHERE id = #{userId} AND version = #{version} AND available_points + #{delta} >= 0")
    int updatePointsWithVersion(@Param("userId") Long userId,
                                @Param("delta") int delta,
                                @Param("version") Long version);

    /**
     * Count how many users in the tenant have strictly more points.
     * Skips tenant line since tenantId is passed explicitly.
     */
    @InterceptorIgnore(tenantLine = "1")
    int countHigherRank(@Param("tenantId") Long tenantId, @Param("totalPoints") int totalPoints);

    /**
     * Update user level.
     * Skips tenant line since user ID is the unique identifier.
     */
    @InterceptorIgnore(tenantLine = "1")
    int updateLevel(@Param("userId") Long userId, @Param("level") int level);

    /**
     * Update consecutive check-in days info.
     * Skips tenant line since user ID is the unique identifier.
     */
    @InterceptorIgnore(tenantLine = "1")
    int updateConsecutiveInfo(@Param("userId") Long userId,
                              @Param("consecutiveDays") int consecutiveDays,
                              @Param("lastCheckinDate") java.time.LocalDate date);

    /**
     * Query all users in flexible-mode tenants who are active and above Lv.1.
     * Used by the monthly level demotion check.
     * Skips tenant line since we explicitly filter by tenant via JOIN.
     */
    @InterceptorIgnore(tenantLine = "1")
    @Select("""
        SELECT u.id AS userId, u.tenant_id AS tenantId, u.level, u.last_checkin_date,
               t.level_mode AS levelMode
        FROM users u
        INNER JOIN tenants t ON u.tenant_id = t.id
        WHERE u.status = 'active'
          AND u.level > 1
          AND t.level_mode = 'flexible'
        """)
    java.util.List<UserLevelCheckRecord> selectUsersForDemotionCheck();

    /**
     * Sum of positive point transactions for a user within a date range.
     * Used to determine monthly point gain for demotion eligibility.
     */
    @InterceptorIgnore(tenantLine = "1")
    @Select("""
        SELECT COALESCE(SUM(amount), 0)
        FROM point_transactions
        WHERE user_id = #{userId}
          AND amount > 0
          AND created_at >= #{startDate}
          AND created_at < #{endDate}
        """)
    int sumPointsInRange(@Param("userId") Long userId,
                          @Param("startDate") java.time.LocalDate startDate,
                          @Param("endDate") java.time.LocalDate endDate);

    record UserLevelCheckRecord(
            Long userId,
            Long tenantId,
            Integer level,
            java.time.LocalDate lastCheckinDate,
            String levelMode
    ) {}
}

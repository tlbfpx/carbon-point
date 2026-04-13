package com.carbonpoint.system.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 定时任务专用的积分查询 Mapper（使用 @Select 避免模块循环依赖）。
 * <p>
 * 所有查询均直接写 SQL，不引用其他模块的实体类。
 * </p>
 */
@Mapper
public interface PointTransactionQueryMapper {

    /**
     * 查询即将过期的积分记录（用于发送过期预警通知）。
     * 条件：expire_time 在 [now, now + days] 之间，且未发送过 point_expiring 通知。
     * 通知状态通过 notifications 表的 reference_id 关联判断。
     *
     * @param beforeDate 过期截止日期
     * @param notifyDays 提前通知天数
     * @return 每用户即将过期的总积分（user_id, tenant_id, phone, expiring_points, expire_time）
     */
    @Select("""
        SELECT u.id AS userId, u.tenant_id AS tenantId, u.phone,
               COALESCE(SUM(pt.amount), 0) AS expiringPoints,
               MAX(pt.expire_time) AS expireTime
        FROM users u
        INNER JOIN point_transactions pt ON u.id = pt.user_id
        LEFT JOIN notifications n ON n.user_id = u.id
            AND n.type = 'point_expiring'
            AND DATE(n.created_at) = CURDATE()
        WHERE pt.expire_time IS NOT NULL
          AND pt.expire_time > NOW()
          AND pt.expire_time <= #{beforeDate}
          AND n.id IS NULL
        GROUP BY u.id, u.tenant_id, u.phone
        HAVING COALESCE(SUM(pt.amount), 0) > 0
        """)
    List<ExpiringPointsRecord> findExpiringPoints(@Param("beforeDate") LocalDateTime beforeDate);

    /**
     * 查询已过期但尚未发送过期通知的积分记录。
     */
    @Select("""
        SELECT u.id AS userId, u.tenant_id AS tenantId, u.phone,
               COALESCE(SUM(pt.amount), 0) AS expiredPoints
        FROM users u
        INNER JOIN point_transactions pt ON u.id = pt.user_id
        LEFT JOIN notifications n ON n.user_id = u.id
            AND n.type = 'point_expired'
            AND n.reference_id = CAST(u.id AS CHAR)
            AND DATE(n.created_at) = CURDATE()
        WHERE pt.expire_time IS NOT NULL
          AND pt.expire_time <= NOW()
          AND n.id IS NULL
        GROUP BY u.id, u.tenant_id, u.phone
        HAVING COALESCE(SUM(pt.amount), 0) > 0
        """)
    List<ExpiredPointsRecord> findExpiredPoints();

    record ExpiringPointsRecord(
            Long userId,
            Long tenantId,
            String phone,
            Integer expiringPoints,
            LocalDateTime expireTime
    ) {}

    record ExpiredPointsRecord(
            Long userId,
            Long tenantId,
            String phone,
            Integer expiredPoints
    ) {}
}

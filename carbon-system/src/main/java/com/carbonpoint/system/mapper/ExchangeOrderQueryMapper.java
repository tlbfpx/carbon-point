package com.carbonpoint.system.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 定时任务专用的订单查询 Mapper（使用 @Select 避免模块循环依赖）。
 */
@Mapper
public interface ExchangeOrderQueryMapper {

    /**
     * 查询即将过期（7天内）但尚未发送过期提醒的优惠券订单。
     * 仅查询 coupon 类型且状态为 fulfilled（已发放）的订单。
     */
    @Select("""
        SELECT eo.id AS orderId, eo.user_id AS userId, eo.tenant_id AS tenantId,
               u.phone, eo.product_name AS productName, eo.expires_at AS expiresAt
        FROM exchange_orders eo
        INNER JOIN users u ON eo.user_id = u.id
        LEFT JOIN notifications n ON n.user_id = eo.user_id
            AND n.type = 'coupon_expiring'
            AND n.reference_id = CAST(eo.id AS CHAR)
            AND n.reference_type = 'order'
            AND DATE(n.created_at) = CURDATE()
        WHERE eo.order_status = 'fulfilled'
          AND eo.product_type = 'coupon'
          AND eo.expires_at IS NOT NULL
          AND eo.expires_at > NOW()
          AND eo.expires_at <= #{beforeDate}
          AND n.id IS NULL
        """)
    List<ExpiringCouponRecord> findExpiringCoupons(@Param("beforeDate") LocalDateTime beforeDate);

    /**
     * 查询已过期的优惠券订单（status 仍为 fulfilled），用于自动更新状态。
     */
    @Select("""
        SELECT id, user_id AS userId, tenant_id AS tenantId,
               points_spent AS frozenPoints
        FROM exchange_orders
        WHERE order_status = 'fulfilled'
          AND product_type = 'coupon'
          AND expires_at IS NOT NULL
          AND expires_at <= NOW()
        """)
    List<ExpiredCouponRecord> findExpiredCoupons();

    /**
     * 查询待处理（pending）且超时的订单。
     */
    @Select("""
        SELECT eo.id AS orderId, eo.user_id AS userId, eo.tenant_id AS tenantId,
               u.phone, eo.points_spent AS frozenPoints
        FROM exchange_orders eo
        INNER JOIN users u ON eo.user_id = u.id
        LEFT JOIN notifications n ON n.user_id = eo.user_id
            AND n.type = 'order_expired'
            AND n.reference_id = CAST(eo.id AS CHAR)
        WHERE eo.order_status = 'pending'
          AND eo.created_at < #{expireBefore}
          AND n.id IS NULL
        """)
    List<ExpiredOrderRecord> findExpiredPendingOrders(@Param("expireBefore") LocalDateTime expireBefore);

    record ExpiringCouponRecord(
            Long orderId,
            Long userId,
            Long tenantId,
            String phone,
            String productName,
            LocalDateTime expiresAt
    ) {}

    record ExpiredCouponRecord(
            Long id,
            Long userId,
            Long tenantId,
            Integer frozenPoints
    ) {}

    record ExpiredOrderRecord(
            Long orderId,
            Long userId,
            Long tenantId,
            String phone,
            Integer frozenPoints
    ) {}
}

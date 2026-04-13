package com.carbonpoint.system.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * 通知触发器 — 供其他业务模块调用的通知入口。
 * <p>
 * 使用示例（在 PointEngineService 中）:
 * <pre>
 * {@code
 * @Autowired
 * private NotificationTrigger notificationTrigger;
 *
 * // 用户打卡后
 * notificationTrigger.onCheckIn(userId, points, consecutiveDays);
 *
 * // 用户等级升级后
 * notificationTrigger.onLevelUp(userId, oldLevel, newLevel, coefficient);
 * }
 * </pre>
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationTrigger {

    private final NotificationService notificationService;

    // ========== 打卡相关事件 ==========

    /**
     * 打卡成功触发连续打卡奖励通知。
     */
    public void onStreakBonus(Long tenantId, Long userId, String phone,
                              int streakDays, int bonusPoints) {
        Map<String, Object> vars = Map.of(
                "streak_days", streakDays,
                "bonus_points", bonusPoints
        );
        notificationService.sendNotification(
                tenantId, userId, phone,
                "streak_bonus", vars,
                "checkin", String.valueOf(userId)
        );
    }

    /**
     * 连续打卡中断提醒。
     */
    public void onStreakBroken(Long tenantId, Long userId, String phone, int previousStreakDays) {
        Map<String, Object> vars = Map.of(
                "streak_days", previousStreakDays
        );
        notificationService.sendNotification(
                tenantId, userId, phone,
                "streak_broken", vars,
                "checkin", String.valueOf(userId)
        );
    }

    // ========== 等级相关事件 ==========

    /**
     * 用户等级升级。
     *
     * @param oldLevel  旧等级
     * @param newLevel  新等级
     * @param coefficient 新等级对应的积分系数
     */
    public void onLevelUp(Long tenantId, Long userId, String phone,
                          int oldLevel, int newLevel, double coefficient) {
        Map<String, Object> vars = Map.of(
                "old_level", oldLevel,
                "new_level", newLevel,
                "level_name", getLevelName(newLevel),
                "coefficient", String.format("%.1f", coefficient)
        );
        notificationService.sendNotification(
                tenantId, userId, phone,
                "level_up", vars,
                "user", String.valueOf(userId)
        );
    }

    /**
     * 用户等级降级（灵活模式下每月触发）。
     *
     * @param oldLevel     旧等级
     * @param newLevel     新等级
     * @param coefficient  新等级对应的积分系数
     */
    public void onLevelDown(Long tenantId, Long userId, String phone,
                            int oldLevel, int newLevel, double coefficient) {
        Map<String, Object> vars = Map.of(
                "old_level", oldLevel,
                "new_level", newLevel,
                "level_name", getLevelName(newLevel),
                "coefficient", String.format("%.1f", coefficient)
        );
        notificationService.sendNotification(
                tenantId, userId, phone,
                "level_down", vars,
                "user", String.valueOf(userId)
        );
    }

    // ========== 徽章相关事件 ==========

    /**
     * 用户获得新徽章。
     */
    public void onBadgeEarned(Long tenantId, Long userId, String phone,
                               String badgeId, String badgeName, String rarity) {
        Map<String, Object> vars = Map.of(
                "badge_name", badgeName,
                "rarity", rarity
        );
        notificationService.sendNotification(
                tenantId, userId, phone,
                "badge_earned", vars,
                "badge", badgeId
        );
    }

    // ========== 积分相关事件 ==========

    /**
     * 积分即将过期预警。
     */
    public void onPointExpiring(Long tenantId, Long userId, String phone,
                                 int expiringPoints, String expireDate) {
        Map<String, Object> vars = Map.of(
                "points", expiringPoints,
                "expire_date", expireDate
        );
        notificationService.sendNotification(
                tenantId, userId, phone,
                "point_expiring", vars,
                "points", String.valueOf(userId)
        );
    }

    /**
     * 积分已过期。
     */
    public void onPointExpired(Long tenantId, Long userId, String phone, int expiredPoints) {
        Map<String, Object> vars = Map.of(
                "points", expiredPoints
        );
        notificationService.sendNotification(
                tenantId, userId, phone,
                "point_expired", vars,
                "points", String.valueOf(userId)
        );
    }

    /**
     * 管理员手动发放积分。
     */
    public void onPointManualAdd(Long tenantId, Long userId, String phone,
                                  int amount, Long adminId) {
        Map<String, Object> vars = Map.of(
                "points", amount,
                "admin_id", adminId
        );
        notificationService.sendNotification(
                tenantId, userId, phone,
                "point_manual_add", vars,
                "points", String.valueOf(userId)
        );
    }

    /**
     * 管理员手动扣减积分。
     */
    public void onPointManualDeduct(Long tenantId, Long userId, String phone,
                                    int amount, Long adminId, String reason) {
        Map<String, Object> vars = Map.of(
                "points", amount,
                "admin_id", adminId,
                "reason", reason != null ? reason : ""
        );
        notificationService.sendNotification(
                tenantId, userId, phone,
                "point_manual_deduct", vars,
                "points", String.valueOf(userId)
        );
    }

    // ========== 订单相关事件 ==========

    /**
     * 兑换订单履约完成。
     */
    public void onOrderFulfilled(Long tenantId, Long userId, String phone,
                                  Long orderId, String productName) {
        Map<String, Object> vars = Map.of(
                "order_id", orderId,
                "product_name", productName
        );
        notificationService.sendNotification(
                tenantId, userId, phone,
                "order_fulfilled", vars,
                "order", String.valueOf(orderId)
        );
    }

    /**
     * 兑换订单超时取消。
     */
    public void onOrderExpired(Long tenantId, Long userId, String phone,
                                Long orderId, int frozenPoints) {
        Map<String, Object> vars = Map.of(
                "order_id", orderId,
                "frozen_points", frozenPoints
        );
        notificationService.sendNotification(
                tenantId, userId, phone,
                "order_expired", vars,
                "order", String.valueOf(orderId)
        );
    }

    /**
     * 卡券即将过期（7天前）。
     */
    public void onCouponExpiring(Long tenantId, Long userId, String phone,
                                  Long orderId, String productName, String expireDate) {
        Map<String, Object> vars = Map.of(
                "order_id", orderId,
                "product_name", productName,
                "expire_date", expireDate
        );
        notificationService.sendNotification(
                tenantId, userId, phone,
                "coupon_expiring", vars,
                "order", String.valueOf(orderId)
        );
    }

    // ========== 租户/用户状态事件 ==========

    /**
     * 企业被停用，通知所有用户。
     */
    public void onTenantSuspended(Long tenantId, java.util.List<Long> userIds,
                                   java.util.List<String> phones, String reason) {
        Map<String, Object> vars = Map.of(
                "reason", reason != null ? reason : "违反平台规定"
        );
        notificationService.sendBulkNotifications(
                tenantId, userIds, phones,
                "tenant_suspended", vars,
                "tenant", String.valueOf(tenantId)
        );
    }

    /**
     * 用户被停用。
     */
    public void onUserDisabled(Long tenantId, Long userId, String phone, String reason) {
        Map<String, Object> vars = Map.of(
                "reason", reason != null ? reason : "违反平台规定"
        );
        notificationService.sendNotification(
                tenantId, userId, phone,
                "user_disabled", vars,
                "user", String.valueOf(userId)
        );
    }

    // ========== 邀请相关事件 ==========

    /**
     * 企业邀请链接即将过期。
     */
    public void onInviteExpiring(Long tenantId, Long userId, String phone,
                                  String inviteCode, String expireDate) {
        Map<String, Object> vars = Map.of(
                "invite_code", inviteCode,
                "expire_date", expireDate
        );
        notificationService.sendNotification(
                tenantId, userId, phone,
                "invite_expiring", vars,
                "invitation", inviteCode
        );
    }

    // ========== 私有方法 ==========

    private String getLevelName(int level) {
        return switch (level) {
            case 1 -> "青铜";
            case 2 -> "白银";
            case 3 -> "黄金";
            case 4 -> "铂金";
            case 5 -> "钻石";
            default -> "Lv." + level;
        };
    }
}

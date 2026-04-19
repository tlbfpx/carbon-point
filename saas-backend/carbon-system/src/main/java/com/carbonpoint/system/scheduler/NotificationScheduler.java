package com.carbonpoint.system.scheduler;

import com.carbonpoint.system.mapper.ExchangeOrderQueryMapper;
import com.carbonpoint.system.mapper.PointTransactionQueryMapper;
import com.carbonpoint.system.mapper.UserQueryMapper;
import com.carbonpoint.system.service.NotificationTrigger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * 通知定时任务处理器。
 * <p>
 * 所有定时任务默认使用北京时间（CST），避免时区问题。
 * 任务执行间隔已设置足够长，避免重复触发。
 * </p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationScheduler {

    private final PointTransactionQueryMapper pointMapper;
    private final ExchangeOrderQueryMapper orderMapper;
    private final UserQueryMapper userMapper;
    private final NotificationTrigger notificationTrigger;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * 积分过期预警检查。
     * <p>
     * 每天 09:00（北京时间）执行。
     * 查询当天新进入 30 天过期窗口的积分，发送预警通知。
     * </p>
     * 注意：具体过期天数由 point_expiration_config 表配置。
     * 此处硬编码 30 天，后续可改为动态查询配置。
     */
    @Scheduled(cron = "0 0 9 * * *", zone = "Asia/Shanghai")
    public void checkExpiringPoints() {
        log.info("[Scheduler] 开始执行积分过期预警检查");
        var beforeDate = java.time.LocalDateTime.now()
                .plusDays(30)
                .withHour(23)
                .withMinute(59)
                .withSecond(59);

        try {
            var records = pointMapper.findExpiringPoints(beforeDate);
            int count = 0;
            for (var r : records) {
                String expireDateStr = r.expireTime().format(DATE_FMT);
                notificationTrigger.onPointExpiring(
                        r.tenantId(), r.userId(), r.phone(), null,
                        r.expiringPoints(), expireDateStr
                );
                count++;
            }
            log.info("[Scheduler] 积分过期预警检查完成，共发送 {} 条通知", count);
        } catch (Exception e) {
            log.error("[Scheduler] 积分过期预警检查失败", e);
        }
    }

    /**
     * 积分已过期检查。
     * <p>
     * 每天 10:00（北京时间）执行。
     * 查询当天刚过期的积分，发送过期通知。
     * </p>
     * 注意：实际积分扣除由 points 模块的定时任务执行，
     * 此处仅发送通知。
     */
    @Scheduled(cron = "0 0 10 * * *", zone = "Asia/Shanghai")
    public void checkExpiredPoints() {
        log.info("[Scheduler] 开始执行积分已过期检查");
        try {
            var records = pointMapper.findExpiredPoints();
            int count = 0;
            for (var r : records) {
                notificationTrigger.onPointExpired(
                        r.tenantId(), r.userId(), r.phone(), null,
                        r.expiredPoints()
                );
                count++;
            }
            log.info("[Scheduler] 积分已过期检查完成，共发送 {} 条通知", count);
        } catch (Exception e) {
            log.error("[Scheduler] 积分已过期检查失败", e);
        }
    }

    /**
     * 卡券过期提醒检查。
     * <p>
     * 每天 09:30（北京时间）执行。
     * 查询 7 天内即将过期的已发放优惠券，发送过期提醒。
     * </p>
     */
    @Scheduled(cron = "0 30 9 * * *", zone = "Asia/Shanghai")
    public void checkExpiringCoupons() {
        log.info("[Scheduler] 开始执行卡券过期提醒检查");
        var beforeDate = java.time.LocalDateTime.now()
                .plusDays(7)
                .withHour(23)
                .withMinute(59)
                .withSecond(59);

        try {
            var records = orderMapper.findExpiringCoupons(beforeDate);
            int count = 0;
            for (var r : records) {
                String expireDateStr = r.expiresAt().format(DATE_FMT);
                notificationTrigger.onCouponExpiring(
                        r.tenantId(), r.userId(), r.phone(), null,
                        r.orderId(), r.productName(), expireDateStr
                );
                count++;
            }
            log.info("[Scheduler] 卡券过期提醒检查完成，共发送 {} 条通知", count);
        } catch (Exception e) {
            log.error("[Scheduler] 卡券过期提醒检查失败", e);
        }
    }

    /**
     * 连续打卡中断检查。
     * <p>
     * 每天 20:00（北京时间）执行。
     * 查询昨日有打卡记录但今日未打卡的用户（且 consecutive_days > 0），
     * 发送连续打卡中断提醒。
     * </p>
     */
    @Scheduled(cron = "0 0 20 * * *", zone = "Asia/Shanghai")
    public void checkStreakBroken() {
        log.info("[Scheduler] 开始执行连续打卡中断检查");
        var yesterday = LocalDate.now().minusDays(1);

        try {
            var records = userMapper.findStreakBrokenUsers(yesterday);
            int count = 0;
            for (var r : records) {
                notificationTrigger.onStreakBroken(
                        r.tenantId(), r.userId(), r.phone(), null,
                        r.previousStreakDays()
                );
                count++;
            }
            log.info("[Scheduler] 连续打卡中断检查完成，共发送 {} 条通知", count);
        } catch (Exception e) {
            log.error("[Scheduler] 连续打卡中断检查失败", e);
        }
    }

    /**
     * 兑换订单超时取消检查。
     * <p>
     * 每小时 :05 分执行。
     * 查询创建超过 30 分钟仍未支付的 pending 订单，发送超时通知。
     * </p>
     * 注意：30 分钟超时时间可由配置中心动态管理。
     */
    @Scheduled(cron = "0 5 * * * *", zone = "Asia/Shanghai")
    public void checkExpiredPendingOrders() {
        log.info("[Scheduler] 开始执行订单超时检查");
        var expireBefore = java.time.LocalDateTime.now().minusMinutes(30);

        try {
            var records = orderMapper.findExpiredPendingOrders(expireBefore);
            int count = 0;
            for (var r : records) {
                notificationTrigger.onOrderExpired(
                        r.tenantId(), r.userId(), r.phone(), null,
                        r.orderId(), r.frozenPoints()
                );
                count++;
            }
            log.info("[Scheduler] 订单超时检查完成，共发送 {} 条通知", count);
        } catch (Exception e) {
            log.error("[Scheduler] 订单超时检查失败", e);
        }
    }
}

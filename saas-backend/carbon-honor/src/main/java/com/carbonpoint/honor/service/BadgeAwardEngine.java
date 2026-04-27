package com.carbonpoint.honor.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.honor.entity.BadgeDefinition;
import com.carbonpoint.honor.event.CheckInMilestoneEvent;
import com.carbonpoint.honor.event.LevelUpEvent;
import com.carbonpoint.honor.event.PointsMilestoneEvent;
import com.carbonpoint.honor.mapper.BadgeDefinitionMapper;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.system.service.NotificationTrigger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 徽章自动授予引擎 — 监听业务事件，自动匹配并发放徽章。
 *
 * <p>事件类型与 trigger_type 映射：
 * <ul>
 *   <li>CheckInMilestoneEvent → trigger_type = "checkin_milestone", trigger_condition = "7"/"30"/"100"...</li>
 *   <li>LevelUpEvent → trigger-type = "level_up", trigger_condition = "2"/"3"/"4"/"5"</li>
 *   <li>PointsMilestoneEvent → trigger_type = "points_milestone", trigger_condition = "1000"/"5000"...</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BadgeAwardEngine {

    private final BadgeService badgeService;
    private final BadgeDefinitionMapper badgeDefinitionMapper;
    private final UserMapper userMapper;
    private final NotificationTrigger notificationTrigger;

    /**
     * 监听签到里程碑事件。
     * 支持的连续天数：1（首次打卡）, 7, 30, 100
     */
    @EventListener
    public void onCheckInMilestone(CheckInMilestoneEvent event) {
        log.info("CheckInMilestoneEvent received: userId={}, streakDays={}", event.getUserId(), event.getStreakDays());
        awardBadgesByTrigger(event.getUserId(), event.getTenantId(), "checkin_milestone", String.valueOf(event.getStreakDays()));
    }

    /**
     * 监听等级升级事件。
     * 支持的等级：2（白银）, 3（黄金）, 4（铂金）, 5（钻石）
     */
    @EventListener
    public void onLevelUp(LevelUpEvent event) {
        log.info("LevelUpEvent received: userId={}, newLevel={}", event.getUserId(), event.getNewLevel());
        awardBadgesByTrigger(event.getUserId(), event.getTenantId(), "level_up", String.valueOf(event.getNewLevel()));
    }

    /**
     * 监听积分里程碑事件。
     * 支持的阈值：1000, 5000, 10000, 50000
     */
    @EventListener
    public void onPointsMilestone(PointsMilestoneEvent event) {
        log.info("PointsMilestoneEvent received: userId={}, totalPoints={}", event.getUserId(), event.getTotalPoints());
        // 检查所有不超过当前积分的里程碑
        int[] milestones = {1000, 5000, 10000, 50000};
        for (int milestone : milestones) {
            if (event.getTotalPoints() >= milestone) {
                awardBadgesByTrigger(event.getUserId(), event.getTenantId(), "points_milestone", String.valueOf(milestone));
            }
        }
    }

    /**
     * 根据 triggerType + triggerCondition 查找匹配的徽章定义并发放。
     */
    private void awardBadgesByTrigger(Long userId, Long tenantId, String triggerType, String triggerCondition) {
        LambdaQueryWrapper<BadgeDefinition> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(BadgeDefinition::getConditionExpr, triggerType + ":" + triggerCondition);
        List<BadgeDefinition> badges = badgeDefinitionMapper.selectList(wrapper);

        if (badges.isEmpty()) {
            log.debug("No badge definition found for triggerType={}, condition={}", triggerType, triggerCondition);
            return;
        }

        for (BadgeDefinition badge : badges) {
            boolean awarded = badgeService.awardBadge(userId, badge.getBadgeId());
            if (awarded) {
                log.info("Badge auto-awarded: userId={}, badgeId={}, badgeName={}", userId, badge.getBadgeId(), badge.getName());
                sendBadgeNotification(userId, tenantId, badge);
            }
        }
    }

    private void sendBadgeNotification(Long userId, Long tenantId, BadgeDefinition badge) {
        try {
            User user = userMapper.selectById(userId);
            if (user == null) return;
            notificationTrigger.onBadgeEarned(
                    tenantId, userId, user.getPhone(), user.getEmail(),
                    badge.getBadgeId(), badge.getName(), badge.getRarity()
            );
        } catch (Exception e) {
            log.warn("Failed to send badge notification: userId={}, badgeId={}", userId, badge.getBadgeId(), e);
        }
    }
}

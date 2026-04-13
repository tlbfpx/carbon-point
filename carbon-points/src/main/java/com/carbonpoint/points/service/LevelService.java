package com.carbonpoint.points.service;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.points.LevelConstants;
import com.carbonpoint.points.dto.UserLevelInfoDTO;
import com.carbonpoint.points.mapper.PointsUserMapper;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.service.NotificationTrigger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * 用户等级管理服务。
 * <p>
 * 职责：
 * <ul>
 *   <li>晋升：每次积分到账时由 {@link PointAccountService} 调用 {@link #promoteIfNeeded(Long)}</li>
 *   <li>降级：每月 1 日由定时任务调用 {@link #checkMonthlyDemotion()}</li>
 *   <li>查询：提供等级信息查询</li>
 * </ul>
 *
 * @see LevelConstants
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LevelService {

    /**
     * 等级模式：严格模式（默认），等级只升不降。
     */
    public static final String MODE_STRICT = "strict";

    /**
     * 等级模式：灵活模式，允许每月 1 日降级。
     */
    public static final String MODE_FLEXIBLE = "flexible";

    private final PointsUserMapper userMapper;
    private final NotificationTrigger notificationTrigger;

    // --- 晋升 ---

    /**
     * 检查并执行等级晋升。
     * 当 totalPoints 达到当前等级下一门槛时，立即更新 level。
     * 触发逐级通知（每跨过一级通知一次）。
     *
     * @param userId      用户ID
     * @param totalPoints 当前总积分
     */
    @Transactional
    public void promoteIfNeeded(Long userId, int totalPoints) {
        User user = userMapper.selectById(userId);
        if (user == null) return;

        int currentLevel = user.getLevel() != null ? user.getLevel() : 1;
        int newLevel = LevelConstants.getLevelByPoints(totalPoints);

        if (newLevel > currentLevel) {
            Long tenantId = user.getTenantId();
            String phone = user.getPhone();

            userMapper.updateLevel(userId, newLevel);
            log.info("User {} promoted from Lv.{} to Lv.{}", userId, currentLevel, newLevel);

            // Fire one notification per intermediate level crossed
            for (int lvl = currentLevel + 1; lvl <= newLevel; lvl++) {
                notificationTrigger.onLevelUp(tenantId, userId, phone, lvl - 1, lvl,
                        LevelConstants.getCoefficient(lvl));
            }
        }
    }

    // --- 降级 ---

    /**
     * 灵活模式下每月降级检查。
     * <p>
     * 每月 1 日凌晨由 {@link LevelCheckScheduler} 调用。
     * 降级规则（仅适用于 level_mode = flexible 的租户）：
     * <ul>
     *   <li>若用户上月无打卡记录：直接降一级（Lv.1 除外）</li>
     *   <li>若用户上月有打卡记录：检查上月累计积分增量，若不足当前等级门槛则降一级</li>
     * </ul>
     *
     * @param userId        用户ID
     * @param tenantId      租户ID（用于判断租户等级模式）
     * @param levelMode     租户等级模式：strict 或 flexible
     * @param currentLevel  用户当前等级
     * @param lastCheckinDate 用户最后打卡日期
     * @return 降级后的等级；若无需降级则返回当前等级
     */
    @Transactional
    public int demoteIfNeeded(Long userId, Long tenantId, String levelMode,
                               int currentLevel, LocalDate lastCheckinDate) {
        if (MODE_STRICT.equals(levelMode)) {
            return currentLevel;
        }
        if (currentLevel <= LevelConstants.BRONZE) {
            return currentLevel;
        }

        // 检查上月是否有打卡记录
        LocalDate lastMonth = LocalDate.now().minusMonths(1).withDayOfMonth(1);
        boolean hadCheckinLastMonth = lastCheckinDate != null
                && !lastCheckinDate.isBefore(lastMonth)
                && lastCheckinDate.isBefore(lastMonth.plusMonths(1));

        boolean shouldDemote;
        if (!hadCheckinLastMonth) {
            // 无打卡记录，直接降一级
            shouldDemote = true;
        } else {
            // 有打卡记录，检查上月积分增量是否满足当前等级门槛
            int previousMonthPointsGained = getPreviousMonthPointsGained(userId, lastMonth);
            int threshold = LevelConstants.getThreshold(currentLevel);
            shouldDemote = previousMonthPointsGained < threshold;
        }

        if (shouldDemote) {
            int newLevel = Math.max(currentLevel - 1, LevelConstants.BRONZE);
            User user = userMapper.selectById(userId);
            if (user == null) return currentLevel;

            String phone = user.getPhone();
            userMapper.updateLevel(userId, newLevel);
            log.info("User {} demoted from Lv.{} to Lv.{} (mode={}, hadCheckin={})",
                    userId, currentLevel, newLevel, levelMode, hadCheckinLastMonth);

            notificationTrigger.onLevelDown(tenantId, userId, phone,
                    currentLevel, newLevel, LevelConstants.getCoefficient(newLevel));

            return newLevel;
        }

        return currentLevel;
    }

    // --- 查询 ---

    /**
     * 获取用户等级信息（含进度）。
     */
    public UserLevelInfoDTO getUserLevelInfo(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }

        int totalPoints = user.getTotalPoints() != null ? user.getTotalPoints() : 0;
        int currentLevel = user.getLevel() != null ? user.getLevel() : 1;
        int nextLevel = Math.min(currentLevel + 1, LevelConstants.DIAMOND);

        UserLevelInfoDTO dto = new UserLevelInfoDTO();
        dto.setUserId(userId);
        dto.setLevel(currentLevel);
        dto.setLevelName(LevelConstants.getName(currentLevel));
        dto.setCoefficient(LevelConstants.getCoefficient(currentLevel));
        dto.setTotalPoints(totalPoints);

        if (currentLevel < LevelConstants.DIAMOND) {
            int nextThreshold = LevelConstants.getThreshold(nextLevel);
            int currentThreshold = LevelConstants.getThreshold(currentLevel);
            int range = nextThreshold - currentThreshold;
            int progress = range > 0 ? totalPoints - currentThreshold : 0;
            dto.setNextLevel(nextLevel);
            dto.setNextLevelName(LevelConstants.getName(nextLevel));
            dto.setNextThreshold(nextThreshold);
            dto.setProgress(Math.min(progress, range));
            dto.setRange(range);
        } else {
            dto.setNextLevel(LevelConstants.DIAMOND);
            dto.setNextLevelName(LevelConstants.getName(LevelConstants.DIAMOND));
            dto.setNextThreshold(totalPoints);
            dto.setProgress(0);
            dto.setRange(0);
        }

        return dto;
    }

    /**
     * 根据 totalPoints 计算等级（纯计算，不写库）。
     */
    public int calculateLevelByPoints(int totalPoints) {
        return LevelConstants.getLevelByPoints(totalPoints);
    }

    // --- 内部方法 ---

    /**
     * 查询用户在指定月份累计获得的积分（amount > 0 的记录）。
     */
    private int getPreviousMonthPointsGained(Long userId, LocalDate monthStart) {
        LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);
        int gained = userMapper.sumPointsInRange(userId, monthStart, monthEnd);
        return gained;
    }
}

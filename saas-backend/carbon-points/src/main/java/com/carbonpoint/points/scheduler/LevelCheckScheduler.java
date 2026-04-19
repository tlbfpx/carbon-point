package com.carbonpoint.points.scheduler;

import com.carbonpoint.points.mapper.PointsUserMapper;
import com.carbonpoint.points.service.LevelService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 用户等级定时检查任务。
 * <p>
 * 每月 1 日凌晨 02:00（北京时间）执行灵活模式租户的等级降级检查。
 * 降级规则详见 {@link LevelService#demoteIfNeeded}。
 *
 * @see LevelService
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LevelCheckScheduler {

    private final LevelService levelService;
    private final PointsUserMapper userMapper;

    /**
     * 每月 1 日凌晨 02:00（北京时间）执行等级降级检查。
     * <p>
     * 选择 02:00 而非 00:00 是为了避开日切高峰，确保 check_in_records
     * 等日表数据已全部落库。
     */
    @Scheduled(cron = "0 0 2 1 * *", zone = "Asia/Shanghai")
    public void monthlyLevelDemotionCheck() {
        log.info("[Scheduler] 开始执行每月等级降级检查");

        try {
            List<PointsUserMapper.UserLevelCheckRecord> users =
                    userMapper.selectUsersForDemotionCheck();

            int checked = 0;
            int demoted = 0;

            for (PointsUserMapper.UserLevelCheckRecord user : users) {
                checked++;
                int newLevel = levelService.demoteIfNeeded(
                        user.userId(),
                        user.tenantId(),
                        user.levelMode(),
                        user.level(),
                        user.lastCheckinDate()
                );
                if (newLevel < user.level()) {
                    demoted++;
                }
            }

            log.info("[Scheduler] 等级降级检查完成，共检查 {} 个用户，降级 {} 人", checked, demoted);
        } catch (Exception e) {
            log.error("[Scheduler] 等级降级检查失败", e);
        }
    }
}

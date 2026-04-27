package com.carbonpoint.honor.scheduler;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.honor.entity.LeaderboardSnapshot;
import com.carbonpoint.honor.mapper.LeaderboardSnapshotMapper;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.mapper.TenantMapper;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.UserQueryMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * 排行榜快照调度器 — 每天 00:05 生成本日排行榜快照。
 *
 * <p>为每个活跃租户生成 daily 维度的快照（Top 100 用户），
 * 同时清除 Redis 缓存使后续请求读取最新快照。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LeaderboardSnapshotScheduler {

    private final LeaderboardSnapshotMapper snapshotMapper;
    private final TenantMapper tenantMapper;
    private final UserQueryMapper userQueryMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String KEY_PATTERN = "leaderboard:tenant:%d:daily";
    private static final int TOP_N = 100;

    /**
     * 每天 00:05 执行，为所有活跃租户生成每日排行榜快照。
     */
    @Scheduled(cron = "0 5 0 * * ?")
    public void generateDailySnapshot() {
        log.info("Leaderboard snapshot generation started");
        long start = System.currentTimeMillis();

        // 清除 TenantContext — 调度器不在租户上下文内运行
        TenantContext.clear();

        List<Tenant> tenants = getActiveTenants();
        int successCount = 0;

        for (Tenant tenant : tenants) {
            try {
                TenantContext.setTenantId(tenant.getId());
                generateSnapshotForTenant(tenant.getId());
                successCount++;
            } catch (Exception e) {
                log.error("Failed to generate snapshot for tenantId={}", tenant.getId(), e);
            } finally {
                TenantContext.clear();
            }
        }

        long elapsed = System.currentTimeMillis() - start;
        log.info("Leaderboard snapshot generation completed: {}/{} tenants, {}ms",
                successCount, tenants.size(), elapsed);
    }

    private List<Tenant> getActiveTenants() {
        LambdaQueryWrapper<Tenant> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Tenant::getStatus, "active");
        return tenantMapper.selectList(wrapper);
    }

    private void generateSnapshotForTenant(Long tenantId) {
        LocalDate today = LocalDate.now();

        // 检查今天是否已有快照，避免重复
        LambdaQueryWrapper<LeaderboardSnapshot> exists = new LambdaQueryWrapper<>();
        exists.eq(LeaderboardSnapshot::getTenantId, tenantId)
              .eq(LeaderboardSnapshot::getSnapshotType, "today")
              .eq(LeaderboardSnapshot::getDimension, "daily")
              .eq(LeaderboardSnapshot::getSnapshotDate, today);
        if (snapshotMapper.selectCount(exists) > 0) {
            log.debug("Snapshot already exists for tenantId={}, date={}", tenantId, today);
            return;
        }

        // 查询租户内活跃用户，按 total_points 降序
        List<User> users = userQueryMapper.selectActiveByTenantOrdered(tenantId);
        List<Map<String, Object>> rankData = new ArrayList<>();
        int rank = 1;
        for (User user : users) {
            if (rank > TOP_N) break;
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("rank", rank);
            entry.put("userId", user.getId());
            entry.put("nickname", user.getNickname());
            entry.put("avatar", user.getAvatar());
            entry.put("points", user.getTotalPoints() != null ? user.getTotalPoints() : 0);
            rankData.add(entry);
            rank++;
        }

        // 保存快照
        try {
            LeaderboardSnapshot snapshot = new LeaderboardSnapshot();
            snapshot.setTenantId(tenantId);
            snapshot.setSnapshotType("today");
            snapshot.setDimension("daily");
            snapshot.setSnapshotDate(today);
            snapshot.setRankData(objectMapper.writeValueAsString(rankData));
            snapshot.setCreatedAt(LocalDateTime.now());
            snapshotMapper.insert(snapshot);
        } catch (Exception e) {
            log.error("Failed to serialize/insert snapshot for tenantId={}", tenantId, e);
            return;
        }

        // 清除 Redis 缓存，使下次查询读取最新快照
        String redisKey = String.format(KEY_PATTERN, tenantId);
        try {
            redisTemplate.delete(redisKey);
        } catch (Exception e) {
            log.warn("Failed to clear Redis cache for tenantId={}", tenantId, e);
        }

        log.debug("Snapshot generated for tenantId={}, entries={}", tenantId, rankData.size());
    }
}

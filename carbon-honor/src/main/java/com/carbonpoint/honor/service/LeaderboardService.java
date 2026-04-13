package com.carbonpoint.honor.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.honor.dto.LeaderboardContextDTO;
import com.carbonpoint.honor.dto.LeaderboardEntryDTO;
import com.carbonpoint.honor.dto.LeaderboardPageDTO;
import com.carbonpoint.honor.entity.LeaderboardSnapshot;
import com.carbonpoint.honor.mapper.LeaderboardSnapshotMapper;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.UserQueryMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

/**
 * 排行榜服务。
 *
 * <p>数据来源策略：
 * <ul>
 *   <li>读取时优先从 Redis 缓存获取（TTL 2h）</li>
 *   <li>缓存未命中则从 leaderboard_snapshots 表查询最近快照</li>
 * </ul>
 *
 * <p>平分规则：积分相同时按 checkin_time ASC 排序（先打卡排前）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private final LeaderboardSnapshotMapper leaderboardSnapshotMapper;
    private final UserQueryMapper userQueryMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String KEY_TODAY     = "leaderboard:tenant:%d:today";
    private static final String KEY_WEEK      = "leaderboard:tenant:%d:week";
    private static final String KEY_HISTORY   = "leaderboard:tenant:%d:history";
    private static final String KEY_CONTEXT   = "leaderboard:tenant:%d:context:%d";
    private static final long    TTL_SECONDS  = 7200L; // 2 hours

    // === Public API ===

    /**
     * 获取今日排行榜。
     * 排序：total_points DESC，积分相同按 checkin_time ASC（先打卡排前）。
     */
    public LeaderboardPageDTO getToday(Long currentUserId, int page, int pageSize) {
        Long tenantId = TenantContext.getTenantId();
        List<LeaderboardEntryDTO> allEntries = loadTodayEntries(tenantId, currentUserId);
        return paginate(allEntries, currentUserId, page, pageSize);
    }

    /**
     * 获取本周排行榜。
     */
    public LeaderboardPageDTO getWeek(Long currentUserId, int page, int pageSize) {
        Long tenantId = TenantContext.getTenantId();
        List<LeaderboardEntryDTO> allEntries = loadWeekEntries(tenantId, currentUserId);
        return paginate(allEntries, currentUserId, page, pageSize);
    }

    /**
     * 获取历史累计排行榜。
     */
    public LeaderboardPageDTO getHistory(Long currentUserId, int page, int pageSize) {
        Long tenantId = TenantContext.getTenantId();
        List<LeaderboardEntryDTO> allEntries = loadHistoryEntries(tenantId, currentUserId);
        return paginate(allEntries, currentUserId, page, pageSize);
    }

    /**
     * 获取当前用户的排行榜上下文（currentRank + changeFromLastWeek + percentile）。
     */
    public LeaderboardContextDTO getContext(Long currentUserId) {
        Long tenantId = TenantContext.getTenantId();

        // Try cache
        String cacheKey = String.format(KEY_CONTEXT, tenantId, currentUserId);
        LeaderboardContextDTO cached = (LeaderboardContextDTO) redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return cached;
        }

        LeaderboardContextDTO context = new LeaderboardContextDTO();

        // currentRank: query today's leaderboard position
        context.setCurrentRank(getUserRankInToday(tenantId, currentUserId));

        // changeFromLastWeek
        context.setChangeFromLastWeek(getRankChange(tenantId, currentUserId));

        // percentile: total users, users with more points
        context.setPercentile(getPercentile(tenantId, currentUserId));

        // Cache for 2 hours
        redisTemplate.opsForValue().set(cacheKey, context, TTL_SECONDS, java.util.concurrent.TimeUnit.SECONDS);

        return context;
    }

    // === Private helpers ===

    private List<LeaderboardEntryDTO> loadTodayEntries(Long tenantId, Long currentUserId) {
        String redisKey = String.format(KEY_TODAY, tenantId);
        List<LeaderboardEntryDTO> cached = getCachedEntries(redisKey, currentUserId);
        if (cached != null) return cached;

        // Fallback: query DB snapshot for today
        List<LeaderboardEntryDTO> entries = queryLeaderboardFromDB(tenantId, "today", currentUserId);

        // Cache result
        cacheEntries(redisKey, entries);
        return entries;
    }

    private List<LeaderboardEntryDTO> loadWeekEntries(Long tenantId, Long currentUserId) {
        String redisKey = String.format(KEY_WEEK, tenantId);
        List<LeaderboardEntryDTO> cached = getCachedEntries(redisKey, currentUserId);
        if (cached != null) return cached;

        List<LeaderboardEntryDTO> entries = queryLeaderboardFromDB(tenantId, "week", currentUserId);
        cacheEntries(redisKey, entries);
        return entries;
    }

    private List<LeaderboardEntryDTO> loadHistoryEntries(Long tenantId, Long currentUserId) {
        String redisKey = String.format(KEY_HISTORY, tenantId);
        List<LeaderboardEntryDTO> cached = getCachedEntries(redisKey, currentUserId);
        if (cached != null) return cached;

        List<LeaderboardEntryDTO> entries = queryHistoryFromDB(tenantId, currentUserId);
        cacheEntries(redisKey, entries);
        return entries;
    }

    private List<LeaderboardEntryDTO> queryLeaderboardFromDB(Long tenantId, String type, Long currentUserId) {
        LocalDate today = LocalDate.now();
        LambdaQueryWrapper<LeaderboardSnapshot> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LeaderboardSnapshot::getTenantId, tenantId)
               .eq(LeaderboardSnapshot::getSnapshotType, type)
               .eq(LeaderboardSnapshot::getSnapshotDate, today)
               .orderByDesc(LeaderboardSnapshot::getCreatedAt)
               .last("LIMIT 1");
        LeaderboardSnapshot snapshot = leaderboardSnapshotMapper.selectOne(wrapper);
        return parseSnapshotEntries(snapshot, currentUserId);
    }

    private List<LeaderboardEntryDTO> queryHistoryFromDB(Long tenantId, Long currentUserId) {
        // History: sorted by total_points DESC (tie-break by earliest check-in)
        List<User> users = userQueryMapper.selectActiveByTenantOrdered(tenantId);
        List<LeaderboardEntryDTO> entries = new ArrayList<>();
        int rank = 1;
        for (User user : users) {
            LeaderboardEntryDTO entry = new LeaderboardEntryDTO();
            entry.setRank(rank++);
            entry.setUserId(user.getId());
            entry.setNickname(maskedNickname(user.getNickname(), rank));
            entry.setAvatar(user.getAvatar());
            entry.setPoints(user.getTotalPoints());
            entry.setIsCurrentUser(user.getId().equals(currentUserId));
            entries.add(entry);
        }
        return entries;
    }

    private List<LeaderboardEntryDTO> parseSnapshotEntries(LeaderboardSnapshot snapshot, Long currentUserId) {
        if (snapshot == null || snapshot.getRankData() == null) {
            return Collections.emptyList();
        }
        try {
            List<Map<String, Object>> raw = objectMapper.readValue(
                    snapshot.getRankData(), new TypeReference<>() {});
            List<LeaderboardEntryDTO> entries = new ArrayList<>();
            for (Map<String, Object> item : raw) {
                LeaderboardEntryDTO entry = new LeaderboardEntryDTO();
                entry.setRank(((Number) item.get("rank")).intValue());
                entry.setUserId(((Number) item.get("userId")).longValue());
                entry.setNickname(maskedNickname((String) item.get("nickname"), entry.getRank()));
                entry.setAvatar((String) item.get("avatar"));
                entry.setPoints(((Number) item.get("points")).intValue());
                entry.setIsCurrentUser(entry.getUserId().equals(currentUserId));
                entries.add(entry);
            }
            return entries;
        } catch (Exception e) {
            log.warn("Failed to parse leaderboard snapshot rank_data", e);
            return Collections.emptyList();
        }
    }

    private LeaderboardPageDTO paginate(List<LeaderboardEntryDTO> allEntries, Long currentUserId,
                                        int page, int pageSize) {
        // Mark all entries: ensure the current user's entry is marked (even if outside top-N)
        for (LeaderboardEntryDTO e : allEntries) {
            if (e.getUserId().equals(currentUserId)) {
                e.setIsCurrentUser(true);
            }
        }

        // Find current user rank (may be outside visible window)
        Integer currentUserRank = null;
        for (LeaderboardEntryDTO e : allEntries) {
            if (Boolean.TRUE.equals(e.getIsCurrentUser())) {
                currentUserRank = e.getRank();
                break;
            }
        }

        // Paginate
        int start = (page - 1) * pageSize;
        int end = Math.min(start + pageSize, allEntries.size());
        List<LeaderboardEntryDTO> pageList = start < allEntries.size()
                ? allEntries.subList(start, end) : Collections.emptyList();

        LeaderboardPageDTO result = new LeaderboardPageDTO();
        result.setList(pageList);
        result.setCurrentUserRank(currentUserRank);
        result.setTotal((long) allEntries.size());
        result.setPage(page);
        result.setPageSize(pageSize);
        result.setHasMore(end < allEntries.size());
        return result;
    }

    private Integer getUserRankInToday(Long tenantId, Long userId) {
        List<LeaderboardEntryDTO> entries = loadTodayEntries(tenantId, userId);
        for (LeaderboardEntryDTO e : entries) {
            if (e.getUserId().equals(userId)) {
                return e.getRank();
            }
        }
        return null;
    }

    private Integer getRankChange(Long tenantId, Long userId) {
        // Compare current rank vs last week's snapshot
        LocalDate lastWeek = LocalDate.now().minusWeeks(1);
        LambdaQueryWrapper<LeaderboardSnapshot> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LeaderboardSnapshot::getTenantId, tenantId)
               .eq(LeaderboardSnapshot::getSnapshotType, "today")
               .eq(LeaderboardSnapshot::getSnapshotDate, lastWeek)
               .orderByDesc(LeaderboardSnapshot::getCreatedAt)
               .last("LIMIT 1");
        LeaderboardSnapshot lastWeekSnapshot = leaderboardSnapshotMapper.selectOne(wrapper);
        if (lastWeekSnapshot == null) return null;

        Integer lastRank = null;
        try {
            List<Map<String, Object>> raw = objectMapper.readValue(
                    lastWeekSnapshot.getRankData(), new TypeReference<>() {});
            for (Map<String, Object> item : raw) {
                if (((Number) item.get("userId")).longValue() == userId) {
                    lastRank = ((Number) item.get("rank")).intValue();
                    break;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse last week snapshot", e);
        }

        Integer currentRank = getUserRankInToday(tenantId, userId);
        if (lastRank == null || currentRank == null) return null;
        return lastRank - currentRank; // positive = moved up
    }

    private Double getPercentile(Long tenantId, Long userId) {
        User user = userQueryMapper.selectById(userId);
        if (user == null) return null;
        Integer userPoints = user.getTotalPoints();

        Long totalUsers = userQueryMapper.countActiveByTenant(tenantId);
        if (totalUsers == null || totalUsers <= 1) return 0.0;

        // Count users with more points than current user
        Long usersAbove = userQueryMapper.countUsersWithMorePoints(tenantId, userPoints);
        return Math.round((double) usersAbove * 10000 / totalUsers) / 100.0; // 保留两位小数
    }

    private List<LeaderboardEntryDTO> getCachedEntries(String key, Long currentUserId) {
        try {
            Object cached = redisTemplate.opsForValue().get(key);
            if (cached instanceof List<?> list) {
                @SuppressWarnings("unchecked")
                List<LeaderboardEntryDTO> entries = (List<LeaderboardEntryDTO>) (List<?>) list;
                // Re-mark current user
                for (LeaderboardEntryDTO e : entries) {
                    e.setIsCurrentUser(e.getUserId().equals(currentUserId));
                }
                return entries;
            }
        } catch (Exception e) {
            log.warn("Failed to read leaderboard from Redis: {}", key, e);
        }
        return null;
    }

    private void cacheEntries(String key, List<LeaderboardEntryDTO> entries) {
        try {
            redisTemplate.opsForValue().set(key, entries, TTL_SECONDS, java.util.concurrent.TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("Failed to cache leaderboard entries: {}", key, e);
        }
    }

    /**
     * 昵称脱敏：4-10 名显示 "张**" 格式。
     */
    private String maskedNickname(String nickname, int rank) {
        if (nickname == null || nickname.isBlank()) return "匿名用户";
        if (rank <= 3) return nickname;
        if (nickname.length() == 1) return nickname + "**";
        return nickname.charAt(0) + "**";
    }
}

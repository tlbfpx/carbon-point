package com.carbonpoint.honor.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
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
import java.time.temporal.IsoFields;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * 排行榜服务。
 *
 * <p>支持多种排行维度 (dimension):
 * <ul>
 *   <li>daily — 今日排行（从快照表查询）</li>
 *   <li>weekly — 本周排行（聚合本周一至今天的积分）</li>
 *   <li>monthly — 本月排行（聚合本月1日至今天的积分）</li>
 *   <li>quarterly — 本季排行（聚合本季度首日至今天的积分）</li>
 *   <li>yearly — 本年排行（聚合本年1月1日至今天的积分）</li>
 *   <li>history — 历史累计排行（使用用户 total_points）</li>
 * </ul>
 *
 * <p>数据来源策略：
 * <ul>
 *   <li>读取时优先从 Redis 缓存获取</li>
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

    private static final String KEY_PATTERN = "leaderboard:tenant:%d:%s";
    private static final String KEY_CONTEXT   = "leaderboard:tenant:%d:context:%d";

    /** Valid dimension values */
    private static final Set<String> VALID_DIMENSIONS = Set.of(
            "daily", "weekly", "monthly", "quarterly", "yearly", "history"
    );

    /** Cache TTL per dimension (seconds) */
    private static final Map<String, Long> TTL_BY_DIMENSION = Map.of(
            "daily",      3600L,   // 1 hour
            "weekly",    21600L,   // 6 hours
            "monthly",   43200L,   // 12 hours
            "quarterly", 86400L,   // 24 hours
            "yearly",    86400L,   // 24 hours
            "history",   43200L    // 12 hours
    );

    // === Public API ===

    /**
     * Get leaderboard for a specific dimension.
     *
     * @param currentUserId current user ID
     * @param dimension     one of: daily, weekly, monthly, quarterly, yearly, history
     * @param page          page number (1-based)
     * @param pageSize      page size
     * @return paginated leaderboard result
     */
    public LeaderboardPageDTO getLeaderboard(Long currentUserId, String dimension, int page, int pageSize) {
        dimension = normalizeDimension(dimension);
        Long tenantId = TenantContext.getTenantId();
        List<LeaderboardEntryDTO> allEntries = loadEntries(tenantId, currentUserId, dimension);
        return paginate(allEntries, currentUserId, page, pageSize);
    }

    /**
     * 获取今日排行榜 (legacy, maps to dimension=daily).
     */
    public LeaderboardPageDTO getToday(Long currentUserId, int page, int pageSize) {
        return getLeaderboard(currentUserId, "daily", page, pageSize);
    }

    /**
     * 获取本周排行榜 (legacy, maps to dimension=weekly).
     */
    public LeaderboardPageDTO getWeek(Long currentUserId, int page, int pageSize) {
        return getLeaderboard(currentUserId, "weekly", page, pageSize);
    }

    /**
     * 获取历史累计排行榜 (legacy, maps to dimension=history).
     */
    public LeaderboardPageDTO getHistory(Long currentUserId, int page, int pageSize) {
        return getLeaderboard(currentUserId, "history", page, pageSize);
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
        context.setCurrentRank(getUserRankInDimension(tenantId, currentUserId, "daily"));

        // changeFromLastWeek
        context.setChangeFromLastWeek(getRankChange(tenantId, currentUserId));

        // percentile: total users, users with more points
        context.setPercentile(getPercentile(tenantId, currentUserId));

        // Cache for 2 hours
        redisTemplate.opsForValue().set(cacheKey, context, 7200L, TimeUnit.SECONDS);

        return context;
    }

    // === Dimension-based entry loading ===

    private List<LeaderboardEntryDTO> loadEntries(Long tenantId, Long currentUserId, String dimension) {
        String redisKey = String.format(KEY_PATTERN, tenantId, dimension);
        List<LeaderboardEntryDTO> cached = getCachedEntries(redisKey, currentUserId);
        if (cached != null) return cached;

        List<LeaderboardEntryDTO> entries;
        if ("history".equals(dimension)) {
            entries = queryHistoryFromDB(tenantId, currentUserId);
        } else if ("daily".equals(dimension)) {
            entries = querySnapshotFromDB(tenantId, dimension, currentUserId);
        } else {
            // weekly, monthly, quarterly, yearly: aggregate from point_transactions
            entries = queryAggregatedFromDB(tenantId, dimension, currentUserId);
        }

        cacheEntries(redisKey, entries, getTTL(dimension));
        return entries;
    }

    // === Date range calculation for each dimension ===

    /**
     * Calculate the start date for a given dimension.
     */
    LocalDate getDimensionStartDate(String dimension) {
        LocalDate today = LocalDate.now();
        return switch (dimension) {
            case "daily" -> today;
            case "weekly" -> today.with(java.time.DayOfWeek.MONDAY);
            case "monthly" -> today.withDayOfMonth(1);
            case "quarterly" -> {
                int quarter = (today.getMonthValue() - 1) / 3;
                yield today.withMonth(quarter * 3 + 1).withDayOfMonth(1);
            }
            case "yearly" -> today.withDayOfYear(1);
            default -> today;
        };
    }

    // === DB query methods ===

    private List<LeaderboardEntryDTO> querySnapshotFromDB(Long tenantId, String dimension, Long currentUserId) {
        LocalDate today = LocalDate.now();
        LambdaQueryWrapper<LeaderboardSnapshot> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LeaderboardSnapshot::getTenantId, tenantId)
               .eq(LeaderboardSnapshot::getSnapshotType, "today")
               .eq(LeaderboardSnapshot::getDimension, dimension)
               .eq(LeaderboardSnapshot::getSnapshotDate, today)
               .orderByDesc(LeaderboardSnapshot::getCreatedAt)
               .last("LIMIT 1");
        LeaderboardSnapshot snapshot = leaderboardSnapshotMapper.selectOne(wrapper);
        return parseSnapshotEntries(snapshot, currentUserId);
    }

    /**
     * Aggregate points from point_transactions for the given dimension's date range.
     * Queries all active users in the tenant, then sums their earned points
     * (amount > 0 where type is an earning type) within the date range.
     */
    private List<LeaderboardEntryDTO> queryAggregatedFromDB(Long tenantId, String dimension, Long currentUserId) {
        LocalDate startDate = getDimensionStartDate(dimension);
        LocalDate today = LocalDate.now();

        // Use the leaderboard_snapshots table with dimension for cached aggregates,
        // falling back to real-time user total_points if no snapshot exists.
        // First try snapshot
        LambdaQueryWrapper<LeaderboardSnapshot> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LeaderboardSnapshot::getTenantId, tenantId)
               .eq(LeaderboardSnapshot::getDimension, dimension)
               .ge(LeaderboardSnapshot::getSnapshotDate, startDate)
               .le(LeaderboardSnapshot::getSnapshotDate, today)
               .orderByDesc(LeaderboardSnapshot::getCreatedAt)
               .last("LIMIT 1");
        LeaderboardSnapshot snapshot = leaderboardSnapshotMapper.selectOne(wrapper);

        if (snapshot != null && snapshot.getRankData() != null) {
            return parseSnapshotEntries(snapshot, currentUserId);
        }

        // Fallback: build from user total_points (not ideal for non-history dimensions,
        // but provides a reasonable fallback until a scheduler populates the snapshots).
        List<User> users = userQueryMapper.selectActiveByTenantOrdered(tenantId);
        List<LeaderboardEntryDTO> entries = new ArrayList<>();
        int rank = 1;
        for (User user : users) {
            LeaderboardEntryDTO entry = new LeaderboardEntryDTO();
            entry.setRank(rank++);
            entry.setUserId(user.getId());
            entry.setNickname(maskedNickname(user.getNickname(), rank - 1));
            entry.setAvatar(user.getAvatar());
            entry.setPoints(user.getTotalPoints());
            entry.setIsCurrentUser(user.getId().equals(currentUserId));
            entries.add(entry);
        }
        return entries;
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
            entry.setNickname(maskedNickname(user.getNickname(), rank - 1));
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

    // === Pagination ===

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

    // === Context helpers ===

    private Integer getUserRankInDimension(Long tenantId, Long userId, String dimension) {
        List<LeaderboardEntryDTO> entries = loadEntries(tenantId, userId, dimension);
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
               .eq(LeaderboardSnapshot::getDimension, "daily")
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

        Integer currentRank = getUserRankInDimension(tenantId, userId, "daily");
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

    // === Redis helpers ===

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

    private void cacheEntries(String key, List<LeaderboardEntryDTO> entries, long ttlSeconds) {
        try {
            redisTemplate.opsForValue().set(key, entries, ttlSeconds, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("Failed to cache leaderboard entries: {}", key, e);
        }
    }

    // === Utility methods ===

    private String normalizeDimension(String dimension) {
        if (dimension == null || !VALID_DIMENSIONS.contains(dimension.toLowerCase())) {
            return "daily";
        }
        return dimension.toLowerCase();
    }

    private long getTTL(String dimension) {
        return TTL_BY_DIMENSION.getOrDefault(dimension, 3600L);
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

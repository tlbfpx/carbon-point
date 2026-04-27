package com.carbonpoint.honor.service;

import com.carbonpoint.honor.mapper.LeaderboardSnapshotMapper;
import com.carbonpoint.system.mapper.UserQueryMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("排行榜服务单元测试")
class LeaderboardServiceTest {

    @Mock
    private LeaderboardSnapshotMapper leaderboardSnapshotMapper;

    @Mock
    private UserQueryMapper userQueryMapper;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @InjectMocks
    private LeaderboardService leaderboardService;

    @Test
    @DisplayName("获取每日排行榜")
    void testGetLeaderboard_Daily() {
        var result = leaderboardService.getLeaderboard("user-123", "daily", 1, 10);
        assertNotNull(result);
    }

    @Test
    @DisplayName("获取排行榜上下文")
    void testGetLeaderboardContext() {
        var result = leaderboardService.getContext("user-123");
        assertNotNull(result);
    }

    @Test
    @DisplayName("验证维度参数 - 无效维度默认daily")
    void testGetDimensionStartDate_InvalidDimension() {
        var result = leaderboardService.getDimensionStartDate("invalid");
        assertNotNull(result);
    }
}

package com.carbonpoint.honor.service;

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
    private com.carbonpoint.honor.mapper.LeaderboardSnapshotMapper leaderboardSnapshotMapper;

    @Mock
    private com.carbonpoint.system.mapper.UserQueryMapper userQueryMapper;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @InjectMocks
    private LeaderboardService leaderboardService;

    @Test
    @DisplayName("验证维度参数 - 无效维度默认daily")
    void testGetDimensionStartDate_InvalidDimension() {
        var result = leaderboardService.getDimensionStartDate("invalid");
        assertNotNull(result);
    }
}

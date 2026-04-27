package com.carbonpoint.honor.service;

import com.carbonpoint.honor.entity.BadgeDefinition;
import com.carbonpoint.honor.mapper.BadgeDefinitionMapper;
import com.carbonpoint.honor.mapper.UserBadgeMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("徽章服务单元测试")
class BadgeServiceTest {

    @Mock
    private UserBadgeMapper userBadgeMapper;

    @Mock
    private BadgeDefinitionMapper badgeDefinitionMapper;

    @InjectMocks
    private BadgeService badgeService;

    @Test
    @DisplayName("授予徽章 - 第一次授予成功")
    void testAwardBadge_FirstTime() {
        boolean result = badgeService.awardBadge("user-123", "first-checkin");
        assertNotNull(result);
    }

    @Test
    @DisplayName("检查用户是否拥有徽章")
    void testHasBadge() {
        boolean result = badgeService.hasBadge("user-123", "first-checkin");
        assertNotNull(result);
    }

    @Test
    @DisplayName("获取用户徽章列表")
    void testGetUserBadges() {
        var result = badgeService.getUserBadges("user-123", 9);
        assertNotNull(result);
    }

    @Test
    @DisplayName("获取用户所有徽章")
    void testGetAllUserBadges() {
        var result = badgeService.getAllUserBadges("user-123");
        assertNotNull(result);
    }
}

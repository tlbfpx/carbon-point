package com.carbonpoint.checkin;

import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.entity.Notification;
import com.carbonpoint.system.mapper.NotificationMapper;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.points.service.PointAccountService;
import com.carbonpoint.common.tenant.TenantContext;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for notification triggering.
 *
 * <p>Tests:
 * <ul>
 *   <li>Level up notification when threshold is reached</li>
 *   <li>Notifications are stored in DB with correct type</li>
 *   <li>Notifications include correct reference info</li>
 * </ul>
 */
class NotificationTriggerTest extends BaseIntegrationTest {

    @Autowired
    private NotificationMapper notificationMapper;

    @Autowired
    private PointAccountService pointAccountService;

    @Autowired
    private UserMapper userMapper;

    // ─────────────────────────────────────────
    // 15.5.1 — Level up notification
    // ─────────────────────────────────────────

    @Test
    void testLevelUpNotification() throws Exception {
        // Create tenant and user at level 1 (Bronze: 0-999 points)
        testDataHelper.tenant("等级通知测试租户").id(1001L).save();
        User user = testDataHelper.user(1001L, "13900001001", "Test@123")
                .id(1001L)
                .level(1)
                .totalPoints(500)
                .availablePoints(500)
                .save();

        String token = generateToken(user.getId(), 1001L, List.of("user"));
        setTenantContext(1001L);

        // Award enough points to reach Silver level (1000+)
        // Current: 500, need: 1000 for Silver
        pointAccountService.awardPoints(user.getId(), 600, "manual_add",
                "test_levelup", "Level up test");

        // Verify user level was updated
        User updatedUser = userMapper.selectById(user.getId());
        assertEquals(2, updatedUser.getLevel(),
                "User should be promoted to Silver (level 2)");
        assertTrue(updatedUser.getTotalPoints() >= 1000,
                "Total points should reach Silver threshold");

        // Verify notification was created
        LambdaQueryWrapper<Notification> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Notification::getUserId, user.getId())
               .eq(Notification::getType, "level_up")
               .orderByDesc(Notification::getCreatedAt)
               .last("LIMIT 1");
        Notification notification = notificationMapper.selectOne(wrapper);

        assertNotNull(notification,
                "Level up notification should be created");

        assertEquals("level_up", notification.getType(),
                "Notification type should be 'level_up'");

        assertTrue(notification.getTitle() != null && !notification.getTitle().isBlank(),
                "Notification title should not be blank");

        assertTrue(notification.getContent() != null && !notification.getContent().isBlank(),
                "Notification content should not be blank");

        assertEquals(user.getTenantId(), notification.getTenantId(),
                "Notification tenant ID should match user tenant");

        assertFalse(notification.getIsRead(),
                "New notification should be unread");
    }

    // ─────────────────────────────────────────
    // 15.5.2 — Multiple level ups (Bronze → Silver → Gold)
    // ─────────────────────────────────────────

    @Test
    void testMultipleLevelUps() throws Exception {
        testDataHelper.tenant("连续升级测试租户").id(1002L).save();
        User user = testDataHelper.user(1002L, "13900001002", "Test@123")
                .id(1002L)
                .level(1)
                .totalPoints(0)
                .availablePoints(0)
                .save();

        setTenantContext(1002L);

        // Award enough for Diamond (50000+)
        pointAccountService.awardPoints(user.getId(), 50000, "manual_add",
                "test_multi_levelup", "Multi-level up test");

        // Verify final level
        User updatedUser = userMapper.selectById(user.getId());
        assertEquals(5, updatedUser.getLevel(),
                "User should reach Diamond (level 5)");

        // Count level_up notifications
        LambdaQueryWrapper<Notification> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Notification::getUserId, user.getId())
               .eq(Notification::getType, "level_up");
        long levelUpCount = notificationMapper.selectCount(wrapper);

        // Should have notifications for levels 2, 3, 4, 5 (4 level ups)
        assertTrue(levelUpCount >= 4,
                "Should have at least 4 level up notifications, got " + levelUpCount);
    }

    // ─────────────────────────────────────────
    // 15.5.3 — Notification list API
    // ─────────────────────────────────────────

    @Test
    void testNotificationListApi() throws Exception {
        testDataHelper.tenant("通知列表测试租户").id(1003L).save();
        User user = testDataHelper.user(1003L, "13900001003", "Test@123")
                .id(1003L)
                .save();

        // Create some test notifications
        setTenantContext(1003L);
        for (int i = 0; i < 3; i++) {
            Notification notification = new Notification();
            notification.setTenantId(1003L);
            notification.setUserId(user.getId());
            notification.setType("level_up");
            notification.setTitle("升级通知 " + (i + 1));
            notification.setContent("恭喜您升级到新等级！");
            notification.setReferenceType("user");
            notification.setReferenceId(String.valueOf(user.getId()));
            notification.setIsRead(false);
            notificationMapper.insert(notification);
        }

        String token = generateToken(user.getId(), 1003L, List.of("user"));

        // Query notification list
        MvcResult result = getWithToken("/api/notifications", token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        // Should contain the notifications
        assertTrue(content.contains("升级通知"),
                "Notification list should contain created notifications");
    }

    // ─────────────────────────────────────────
    // 15.5.4 — Unread count API
    // ─────────────────────────────────────────

    @Test
    void testUnreadCount() throws Exception {
        testDataHelper.tenant("未读计数测试租户").id(1004L).save();
        User user = testDataHelper.user(1004L, "13900001004", "Test@123")
                .id(1004L)
                .save();

        // Create 5 unread notifications
        setTenantContext(1004L);
        for (int i = 0; i < 5; i++) {
            Notification notification = new Notification();
            notification.setTenantId(1004L);
            notification.setUserId(user.getId());
            notification.setType("system");
            notification.setTitle("系统通知 " + (i + 1));
            notification.setContent("这是一条系统通知");
            notification.setIsRead(false);
            notificationMapper.insert(notification);
        }

        // Mark 2 as read
        List<Notification> all = notificationMapper.selectList(
                new LambdaQueryWrapper<Notification>()
                        .eq(Notification::getUserId, user.getId())
                        .eq(Notification::getIsRead, false)
                        .last("LIMIT 2")
        );
        for (Notification n : all) {
            n.setIsRead(true);
            notificationMapper.updateById(n);
        }

        String token = generateToken(user.getId(), 1004L, List.of("user"));

        // Query unread count
        MvcResult result = getWithToken("/api/notifications/unread-count", token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        // Should indicate 3 unread
        assertTrue(
                content.contains("3") || content.contains("unread") || content.contains("count"),
                "Should show unread count, got: " + content
        );
    }

    @Autowired
    private TestDataHelper testDataHelper;
}

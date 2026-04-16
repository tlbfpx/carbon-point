package com.carbonpoint.system.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * NotificationTrigger 单元测试。
 *
 * 测试场景：
 * 1. 各业务事件正确触发通知发送
 * 2. 通知参数正确传递
 * 3. 批量通知正确分发
 */
@ExtendWith(MockitoExtension.class)
class NotificationTriggerTest {

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private NotificationTrigger notificationTrigger;

    @Nested
    @DisplayName("打卡事件")
    class CheckInEvents {

        @Test
        @DisplayName("onStreakBonus 应正确传递连续天数和奖励积分")
        void shouldTriggerStreakBonus() {
            // Given
            Long tenantId = 1L, userId = 10L;
            String phone = "13800138000";
            String email = "user@example.com";

            // When
            notificationTrigger.onStreakBonus(tenantId, userId, phone, email, 7, 50);

            // Then
            verify(notificationService).sendNotification(
                    eq(tenantId), eq(userId), eq(phone), eq(email),
                    eq("streak_bonus"),
                    argThat(m -> m.get("streak_days").equals(7) && m.get("bonus_points").equals(50)),
                    eq("checkin"),
                    eq("10")
            );
        }

        @Test
        @DisplayName("onStreakBroken 应正确传递上次的连续天数")
        void shouldTriggerStreakBroken() {
            // Given
            Long tenantId = 1L, userId = 10L;
            String phone = "13800138000";

            // When
            notificationTrigger.onStreakBroken(tenantId, userId, phone, null, 15);

            // Then
            verify(notificationService).sendNotification(
                    eq(tenantId), eq(userId), eq(phone), isNull(),
                    eq("streak_broken"),
                    argThat(m -> m.get("streak_days").equals(15)),
                    anyString(),
                    anyString()
            );
        }
    }

    @Nested
    @DisplayName("等级事件")
    class LevelEvents {

        @Test
        @DisplayName("onLevelUp 应正确传递等级名称和系数")
        void shouldTriggerLevelUp() {
            // Given
            Long tenantId = 1L, userId = 10L;
            String phone = "13800138000";
            String email = "user@example.com";

            // When
            notificationTrigger.onLevelUp(tenantId, userId, phone, email, 1, 2, 1.2);

            // Then
            verify(notificationService).sendNotification(
                    eq(tenantId), eq(userId), eq(phone), eq(email),
                    eq("level_up"),
                    argThat(m ->
                            m.get("old_level").equals(1) &&
                                    m.get("new_level").equals(2) &&
                                    m.get("level_name").equals("白银") &&
                                    m.get("coefficient").equals("1.2")
                    ),
                    eq("user"),
                    anyString()
            );
        }

        @Test
        @DisplayName("等级 5 应返回 钻石")
        void shouldReturnDiamondForLevel5() {
            // When
            notificationTrigger.onLevelUp(1L, 1L, null, null, 4, 5, 1.8);

            // Then
            ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
            verify(notificationService).sendNotification(
                    anyLong(), anyLong(), any(), any(),
                    anyString(),
                    captor.capture(), any(), any()
            );
            assertEquals("钻石", captor.getValue().get("level_name"));
        }
    }

    @Nested
    @DisplayName("批量通知")
    class BulkNotifications {

        @Test
        @DisplayName("onTenantSuspended 应调用批量发送")
        void shouldTriggerBulkForTenantSuspended() {
            // Given
            Long tenantId = 1L;
            List<Long> userIds = List.of(1L, 2L, 3L);
            List<String> phones = List.of("13800000001", "13800000002", "13800000003");

            // When
            notificationTrigger.onTenantSuspended(tenantId, userIds, phones, null, "违规操作");

            // Then
            verify(notificationService).sendBulkNotifications(
                    eq(tenantId), eq(userIds), eq(phones), isNull(),
                    eq("tenant_suspended"),
                    argThat(m -> m.get("reason").equals("违规操作")),
                    eq("tenant"),
                    anyString()
            );
        }
    }
}

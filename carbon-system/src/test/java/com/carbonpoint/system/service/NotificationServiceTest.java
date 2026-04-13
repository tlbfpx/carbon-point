package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.res.NotificationListRes;
import com.carbonpoint.system.entity.Notification;
import com.carbonpoint.system.entity.NotificationTemplate;
import com.carbonpoint.system.entity.UserNotificationPreference;
import com.carbonpoint.system.mapper.NotificationMapper;
import com.carbonpoint.system.mapper.UserNotificationPreferenceMapper;
import com.carbonpoint.system.service.impl.NotificationServiceImpl;
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
 * NotificationService 单元测试。
 *
 * 测试场景：
 * 1. 站内消息 CRUD 操作
 * 2. 通知偏好设置（必要通知不可关闭）
 * 3. 通知发送逻辑（偏好检查、必要通知跳过）
 * 4. 批量发送
 */
@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationMapper notificationMapper;

    @Mock
    private UserNotificationPreferenceMapper preferenceMapper;

    @Mock
    private NotificationTemplateService templateService;

    @Mock
    private SmsService smsService;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    // ===== 通知发送测试 =====

    @Nested
    @DisplayName("sendNotification")
    class SendNotificationTests {

        @Test
        @DisplayName("应发送站内消息到用户")
        void shouldSendInAppNotification() {
            // Given
            Long userId = 1L;
            Long tenantId = 10L;
            String phone = "13800138000";
            String type = "level_up";

            NotificationTemplateService.RenderedTemplate rendered =
                    new NotificationTemplateService.RenderedTemplate("恭喜升级！", "您已升级为白银等级");

            when(templateService.renderTemplate(type, "in_app", Map.of()))
                    .thenReturn(rendered);
            when(preferenceMapper.selectOne(any())).thenReturn(null); // 无偏好，默认开启

            // When
            notificationService.sendNotification(
                    tenantId, userId, phone, type,
                    Map.of(), "user", "1"
            );

            // Then
            ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
            verify(notificationMapper).insert(captor.capture());

            Notification saved = captor.getValue();
            assertEquals(tenantId, saved.getTenantId());
            assertEquals(userId, saved.getUserId());
            assertEquals(type, saved.getType());
            assertEquals("恭喜升级！", saved.getTitle());
            assertFalse(saved.getIsRead());
        }

        @Test
        @DisplayName("用户关闭的通知类型应跳过发送")
        void shouldSkipWhenUserDisabledNotification() {
            // Given
            Long userId = 1L;
            Long tenantId = 10L;
            String type = "streak_broken";

            UserNotificationPreference pref = new UserNotificationPreference();
            pref.setUserId(userId);
            pref.setType(type);
            pref.setEnabled(false);

            when(preferenceMapper.selectOne(any())).thenReturn(pref);

            // When
            notificationService.sendNotification(
                    tenantId, userId, null, type,
                    Map.of(), "checkin", "1"
            );

            // Then
            verify(notificationMapper, never()).insert(any(Notification.class));
            verify(templateService, never()).renderTemplate(anyString(), anyString(), any());
        }

        @Test
        @DisplayName("必要通知应绕过用户偏好直接发送")
        void shouldSendRequiredNotificationBypassingPreference() {
            // Given
            Long userId = 1L;
            Long tenantId = 10L;
            String type = "point_expired"; // 必要通知

            UserNotificationPreference disabledPref = new UserNotificationPreference();
            disabledPref.setEnabled(false);

            when(templateService.renderTemplate(eq(type), eq("in_app"), any()))
                    .thenReturn(new NotificationTemplateService.RenderedTemplate("积分已过期", "内容"));

            // When
            notificationService.sendNotification(
                    tenantId, userId, null, type,
                    Map.of(), "points", "1"
            );

            // Then
            verify(notificationMapper).insert(any(Notification.class));
        }
    }

    // ===== 已读操作测试 =====

    @Nested
    @DisplayName("markAsRead / markAllAsRead")
    class ReadOperationTests {

        @Test
        @DisplayName("应将指定通知标记为已读")
        void shouldMarkNotificationAsRead() {
            // Given
            Long notificationId = 1L;
            Long userId = 10L;
            Notification notification = new Notification();
            notification.setId(notificationId);
            notification.setUserId(userId);
            notification.setIsRead(false);

            when(notificationMapper.selectById(notificationId)).thenReturn(notification);

            // When
            notificationService.markAsRead(notificationId, userId);

            // Then
            verify(notificationMapper).updateById(notification);
            assertTrue(notification.getIsRead());
        }

        @Test
        @DisplayName("无权操作他 人通知应抛出异常")
        void shouldThrowWhenMarkingOthersNotification() {
            // Given
            Long notificationId = 1L;
            Long ownerId = 10L;
            Long attackerId = 99L;

            Notification notification = new Notification();
            notification.setId(notificationId);
            notification.setUserId(ownerId);

            when(notificationMapper.selectById(notificationId)).thenReturn(notification);

            // When / Then
            assertThrows(
                    com.carbonpoint.common.exception.BusinessException.class,
                    () -> notificationService.markAsRead(notificationId, attackerId)
            );
        }

        @Test
        @DisplayName("全部已读应批量更新用户未读通知")
        void shouldMarkAllAsRead() {
            // Given
            Long userId = 1L;

            // When
            notificationService.markAllAsRead(userId);

            // Then
            verify(notificationMapper).update(
                    argThat((Notification n) -> n.getIsRead()),
                    any()
            );
        }
    }

    // ===== 通知偏好测试 =====

    @Nested
    @DisplayName("通知偏好设置")
    class PreferenceTests {

        @Test
        @DisplayName("必要通知类型应禁止关闭")
        void shouldRejectDisablingRequiredNotification() {
            // Given
            Long userId = 1L;
            String requiredType = "point_expired";

            // When / Then
            assertThrows(
                    com.carbonpoint.common.exception.BusinessException.class,
                    () -> notificationService.updatePreference(userId, requiredType, false)
            );
        }

        @Test
        @DisplayName("非必要通知应允许关闭")
        void shouldAllowDisablingNonRequiredNotification() {
            // Given
            Long userId = 1L;
            String type = "streak_broken";

            when(preferenceMapper.selectOne(any())).thenReturn(null);

            // When
            notificationService.updatePreference(userId, type, false);

            // Then
            ArgumentCaptor<UserNotificationPreference> captor =
                    ArgumentCaptor.forClass(UserNotificationPreference.class);
            verify(preferenceMapper).insert(captor.capture());
            assertFalse(captor.getValue().getEnabled());
        }
    }
}

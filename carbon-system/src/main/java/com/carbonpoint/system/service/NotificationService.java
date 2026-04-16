package com.carbonpoint.system.service;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.res.NotificationListRes;
import com.carbonpoint.system.dto.res.UnreadCountRes;
import com.carbonpoint.system.dto.res.UserNotificationPreferenceRes;

import java.util.List;

/**
 * 通知服务接口。
 * <p>
 * 作为通知系统的对外入口，提供：
 * <ul>
 *   <li>站内消息 CRUD</li>
 *   <li>通知触发（站内信 + 短信 + 邮件）</li>
 *   <li>模板渲染</li>
 *   <li>用户偏好管理</li>
 * </ul>
 */
public interface NotificationService {

    // ========== 站内消息 CRUD ==========

    /**
     * 分页查询当前用户的消息列表。
     */
    List<NotificationListRes> listNotifications(Long userId, int page, int size);

    /**
     * 获取未读消息数量。
     */
    long getUnreadCount(Long userId);

    /**
     * 标记单条消息为已读。
     */
    void markAsRead(Long notificationId, Long userId);

    /**
     * 全部已读。
     */
    void markAllAsRead(Long userId);

    // ========== 通知触发 ==========

    /**
     * 发送通知（支持站内信 + 短信 + 邮件）。
     *
     * @param tenantId 租户ID
     * @param userId   用户ID
     * @param phone    手机号（短信用，可为 null）
     * @param email    邮箱地址（邮件用，可为 null）
     * @param type     通知类型
     * @param variables 模板变量
     * @param referenceType 关联业务类型
     * @param referenceId  关联业务ID
     */
    void sendNotification(Long tenantId, Long userId, String phone, String email, String type,
                          java.util.Map<String, Object> variables,
                          String referenceType, String referenceId);

    /**
     * 批量发送通知（如企业停用通知发给所有用户）。
     */
    void sendBulkNotifications(Long tenantId, List<Long> userIds, List<String> phones, List<String> emails,
                               String type, java.util.Map<String, Object> variables,
                               String referenceType, String referenceId);

    // ========== 用户偏好 ==========

    /**
     * 获取用户的通知偏好列表。
     */
    List<UserNotificationPreferenceRes> getUserPreferences(Long userId);

    /**
     * 更新用户通知偏好。
     */
    void updatePreference(Long userId, String type, boolean enabled);

    /**
     * 初始化用户的通知偏好（首次登录时调用）。
     */
    void initUserPreferences(Long userId);

    /**
     * 批量更新用户通知偏好。
     */
    void batchUpdatePreferences(Long userId, List<java.util.Map<String, Object>> preferences);
}

package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.system.entity.Notification;
import com.carbonpoint.system.entity.NotificationTemplate;
import com.carbonpoint.system.entity.UserNotificationPreference;
import com.carbonpoint.system.mapper.NotificationMapper;
import com.carbonpoint.system.mapper.UserNotificationPreferenceMapper;
import com.carbonpoint.system.service.NotificationService;
import com.carbonpoint.system.service.NotificationTemplateService;
import com.carbonpoint.system.service.SmsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * 通知服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationMapper notificationMapper;
    private final UserNotificationPreferenceMapper preferenceMapper;
    private final NotificationTemplateService templateService;
    private final SmsService smsService;

    /**
     * 必要通知类型（不可关闭）。
     */
    private static final Set<String> REQUIRED_NOTIFICATION_TYPES = Set.of(
            "point_expired",
            "tenant_suspended",
            "user_disabled",
            "order_fulfilled"
    );

    @Override
    public List<com.carbonpoint.system.dto.res.NotificationListRes> listNotifications(Long userId, int page, int size) {
        Page<Notification> pageResult = notificationMapper.selectPage(
                new Page<>(page, size),
                new LambdaQueryWrapper<Notification>()
                        .eq(Notification::getUserId, userId)
                        .orderByDesc(Notification::getCreatedAt)
        );

        return pageResult.getRecords().stream().map(n -> {
            com.carbonpoint.system.dto.res.NotificationListRes r = new com.carbonpoint.system.dto.res.NotificationListRes();
            r.setId(n.getId());
            r.setType(n.getType());
            r.setTitle(n.getTitle());
            r.setContent(n.getContent());
            r.setReferenceType(n.getReferenceType());
            r.setReferenceId(n.getReferenceId());
            r.setIsRead(n.getIsRead());
            r.setCreatedAt(n.getCreatedAt());
            return r;
        }).toList();
    }

    @Override
    public long getUnreadCount(Long userId) {
        return notificationMapper.selectCount(
                new LambdaQueryWrapper<Notification>()
                        .eq(Notification::getUserId, userId)
                        .eq(Notification::getIsRead, false)
        );
    }

    @Override
    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationMapper.selectById(notificationId);
        if (notification == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "通知不存在");
        }
        if (!notification.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.PERMISSION_DENIED, "无权操作此通知");
        }
        if (!Boolean.TRUE.equals(notification.getIsRead())) {
            notification.setIsRead(true);
            notificationMapper.updateById(notification);
        }
    }

    @Override
    @Transactional
    public void markAllAsRead(Long userId) {
        Notification update = new Notification();
        update.setIsRead(true);
        notificationMapper.update(update,
                new LambdaQueryWrapper<Notification>()
                        .eq(Notification::getUserId, userId)
                        .eq(Notification::getIsRead, false)
        );
    }

    @Override
    @Transactional
    public void sendNotification(Long tenantId, Long userId, String phone, String type,
                                 Map<String, Object> variables,
                                 String referenceType, String referenceId) {
        // 1. 检查用户偏好（必要通知跳过检查）
        if (!REQUIRED_NOTIFICATION_TYPES.contains(type)) {
            if (!shouldSendToUser(userId, type)) {
                log.debug("用户 {} 关闭了类型为 {} 的通知，跳过发送", userId, type);
                return;
            }
        }

        // 2. 渲染站内信模板
        NotificationTemplateService.RenderedTemplate rendered = templateService.renderTemplate(type, "in_app", variables);
        if (rendered == null) {
            log.warn("站内信模板不存在: type={}", type);
            return;
        }

        // 3. 保存站内消息
        Notification notification = new Notification();
        notification.setTenantId(tenantId);
        notification.setUserId(userId);
        notification.setType(type);
        notification.setTitle(rendered.title());
        notification.setContent(rendered.content());
        notification.setReferenceType(referenceType);
        notification.setReferenceId(referenceId);
        notification.setIsRead(false);
        notificationMapper.insert(notification);

        log.info("发送站内信成功: userId={}, type={}, title={}", userId, type, rendered.title());

        // 4. 尝试发送短信（频率限制 + 失败降级）
        sendSmsWithFallback(userId, phone, type, variables);
    }

    @Override
    @Transactional
    public void sendBulkNotifications(Long tenantId, List<Long> userIds, List<String> phones,
                                      String type, Map<String, Object> variables,
                                      String referenceType, String referenceId) {
        if (userIds == null || userIds.isEmpty()) {
            return;
        }
        for (int i = 0; i < userIds.size(); i++) {
            Long userId = userIds.get(i);
            String phone = (phones != null && i < phones.size()) ? phones.get(i) : null;
            sendNotification(tenantId, userId, phone, type, variables, referenceType, referenceId);
        }
    }

    @Override
    public List<com.carbonpoint.system.dto.res.UserNotificationPreferenceRes> getUserPreferences(Long userId) {
        List<UserNotificationPreference> prefs = preferenceMapper.selectList(
                new LambdaQueryWrapper<UserNotificationPreference>()
                        .eq(UserNotificationPreference::getUserId, userId)
        );

        return prefs.stream().map(p -> {
            com.carbonpoint.system.dto.res.UserNotificationPreferenceRes r = new com.carbonpoint.system.dto.res.UserNotificationPreferenceRes();
            r.setId(p.getId());
            r.setUserId(p.getUserId());
            r.setType(p.getType());
            r.setEnabled(p.getEnabled());
            r.setRequired(REQUIRED_NOTIFICATION_TYPES.contains(p.getType()));
            return r;
        }).toList();
    }

    @Override
    @Transactional
    public void updatePreference(Long userId, String type, boolean enabled) {
        if (REQUIRED_NOTIFICATION_TYPES.contains(type)) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "此类通知不可关闭");
        }

        UserNotificationPreference pref = preferenceMapper.selectOne(
                new LambdaQueryWrapper<UserNotificationPreference>()
                        .eq(UserNotificationPreference::getUserId, userId)
                        .eq(UserNotificationPreference::getType, type)
        );

        if (pref == null) {
            pref = new UserNotificationPreference();
            pref.setUserId(userId);
            pref.setType(type);
            pref.setEnabled(enabled);
            preferenceMapper.insert(pref);
        } else {
            pref.setEnabled(enabled);
            preferenceMapper.updateById(pref);
        }
    }

    @Override
    @Transactional
    public void initUserPreferences(Long userId) {
        // 初始化默认开启的通知类型
        for (String type : getDefaultEnabledTypes()) {
            UserNotificationPreference existing = preferenceMapper.selectOne(
                    new LambdaQueryWrapper<UserNotificationPreference>()
                            .eq(UserNotificationPreference::getUserId, userId)
                            .eq(UserNotificationPreference::getType, type)
            );
            if (existing == null) {
                UserNotificationPreference pref = new UserNotificationPreference();
                pref.setUserId(userId);
                pref.setType(type);
                pref.setEnabled(true);
                preferenceMapper.insert(pref);
            }
        }
    }

    @Override
    @Transactional
    public void batchUpdatePreferences(Long userId, List<Map<String, Object>> preferences) {
        for (Map<String, Object> pref : preferences) {
            String type = (String) pref.get("type");
            Boolean enabled = (Boolean) pref.get("enabled");
            if (type != null && enabled != null) {
                updatePreference(userId, type, enabled);
            }
        }
    }

    // ========== 私有方法 ==========

    private boolean shouldSendToUser(Long userId, String type) {
        UserNotificationPreference pref = preferenceMapper.selectOne(
                new LambdaQueryWrapper<UserNotificationPreference>()
                        .eq(UserNotificationPreference::getUserId, userId)
                        .eq(UserNotificationPreference::getType, type)
        );
        // 未设置偏好时默认开启
        return pref == null || Boolean.TRUE.equals(pref.getEnabled());
    }

    private void sendSmsWithFallback(Long userId, String phone, String type, Map<String, Object> variables) {
        if (phone == null || phone.isEmpty()) {
            return;
        }

        // 只对配置了短信模板的类型发送短信
        if (!isSmsEnabledType(type)) {
            return;
        }

        NotificationTemplateService.RenderedTemplate rendered = templateService.renderTemplate(type, "sms", variables);
        if (rendered == null) {
            return;
        }

        String content = rendered.content();
        boolean sent = smsService.sendSms(userId, phone, type, content);
        if (!sent) {
            log.info("短信发送失败或已达频率限制（站内信已发送）: userId={}, type={}", userId, type);
        }
    }

    private boolean isSmsEnabledType(String type) {
        return Set.of(
                "point_expiring",
                "point_expired",
                "tenant_suspended",
                "user_disabled"
        ).contains(type);
    }

    private Set<String> getDefaultEnabledTypes() {
        return Set.of(
                "level_up",
                "badge_earned",
                "point_expiring",
                "coupon_expiring",
                "order_fulfilled",
                "order_expired",
                "streak_bonus",
                "streak_broken",
                "point_manual_add",
                "point_manual_deduct",
                "invite_expiring"
        );
    }
}

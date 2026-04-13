package com.carbonpoint.system.controller;

import com.carbonpoint.common.controller.BaseController;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.req.NotificationPreferenceReq;
import com.carbonpoint.system.dto.res.NotificationListRes;
import com.carbonpoint.system.dto.res.UnreadCountRes;
import com.carbonpoint.system.dto.res.UserNotificationPreferenceRes;
import com.carbonpoint.system.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 通知相关 API。
 * <p>
 * 路径: /api/notifications
 * </p>
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController extends BaseController {

    private final NotificationService notificationService;

    /**
     * GET /api/notifications
     * 分页查询消息列表。
     */
    @GetMapping
    public Result<List<NotificationListRes>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = getCurrentUserId();
        List<NotificationListRes> list = notificationService.listNotifications(userId, page, size);
        return success(list);
    }

    /**
     * GET /api/notifications/unread-count
     * 获取未读消息数量。
     */
    @GetMapping("/unread-count")
    public Result<UnreadCountRes> getUnreadCount() {
        Long userId = getCurrentUserId();
        long count = notificationService.getUnreadCount(userId);
        UnreadCountRes res = new UnreadCountRes();
        res.setCount(count);
        return success(res);
    }

    /**
     * PUT /api/notifications/{id}/read
     * 标记单条消息为已读。
     */
    @PutMapping("/{id}/read")
    public Result<Void> markAsRead(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        notificationService.markAsRead(id, userId);
        return success();
    }

    /**
     * PUT /api/notifications/read-all
     * 全部已读。
     */
    @PutMapping("/read-all")
    public Result<Void> markAllAsRead() {
        Long userId = getCurrentUserId();
        notificationService.markAllAsRead(userId);
        return success();
    }

    /**
     * GET /api/notifications/preferences
     * 获取用户通知偏好。
     */
    @GetMapping("/preferences")
    public Result<List<UserNotificationPreferenceRes>> getPreferences() {
        Long userId = getCurrentUserId();
        List<UserNotificationPreferenceRes> prefs = notificationService.getUserPreferences(userId);
        return success(prefs);
    }

    /**
     * PUT /api/notifications/preferences
     * 更新单条通知偏好。
     */
    @PutMapping("/preferences")
    public Result<Void> updatePreference(@RequestBody NotificationPreferenceReq req) {
        Long userId = getCurrentUserId();
        notificationService.updatePreference(userId, req.getType(), req.getEnabled());
        return success();
    }

    /**
     * PUT /api/notifications/preferences/batch
     * 批量更新通知偏好。
     */
    @PutMapping("/preferences/batch")
    public Result<Void> batchUpdatePreferences(@RequestBody List<Map<String, Object>> preferences) {
        Long userId = getCurrentUserId();
        notificationService.batchUpdatePreferences(userId, preferences);
        return success();
    }
}

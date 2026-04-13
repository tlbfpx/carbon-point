import { request, PageResult } from '../request';

/**
 * 通知类型 — 与后端 Notification.type 一致
 */
export type NotificationType =
  | 'level_up'
  | 'badge_earned'
  | 'point_expiring'
  | 'point_expired'
  | 'streak_bonus'
  | 'streak_broken'
  | 'coupon_expiring'
  | 'order_fulfilled'
  | 'order_expired'
  | 'point_manual_add'
  | 'point_manual_deduct'
  | 'tenant_suspended'
  | 'user_disabled'
  | 'invite_expiring';

/**
 * 通知记录 — 与后端 Notification 实体对齐
 */
export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  content: string;
  referenceType?: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * 分页查询参数
 */
export interface NotificationListParams {
  page?: number;
  pageSize?: number;
}

/**
 * 未读数量响应
 */
export interface UnreadCountRes {
  count: number;
}

/**
 * 用户通知偏好
 */
export interface UserNotificationPreference {
  id: number;
  userId: number;
  type: NotificationType;
  enabled: boolean;
  required?: boolean;
}

/**
 * 通知偏好更新请求
 */
export interface NotificationPreferenceReq {
  type: NotificationType;
  enabled: boolean;
}

/**
 * 通知 API — 对应后端 NotificationController
 */
export const notificationApi = {
  /** 分页查询消息列表 */
  list: (params?: NotificationListParams) =>
    request.get<PageResult<Notification>>('/notifications', { params }),

  /** 获取未读消息数量 */
  getUnreadCount: () =>
    request.get<UnreadCountRes>('/notifications/unread-count'),

  /** 标记单条消息为已读 */
  markAsRead: (notificationId: number) =>
    request.put<void>(`/notifications/${notificationId}/read`),

  /** 全部已读 */
  markAllAsRead: () =>
    request.put<void>('/notifications/read-all'),

  /** 获取用户通知偏好 */
  getPreferences: () =>
    request.get<UserNotificationPreference[]>('/notifications/preferences'),

  /** 更新单条通知偏好 */
  updatePreference: (req: NotificationPreferenceReq) =>
    request.put<void>('/notifications/preferences', req),

  /** 批量更新通知偏好 */
  batchUpdatePreferences: (preferences: NotificationPreferenceReq[]) =>
    request.put<void>('/notifications/preferences/batch', preferences),
};

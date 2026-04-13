import { apiClient } from './request';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createTime: string;
}

export const getNotifications = async (userId: string): Promise<{ data: Notification[] }> => {
  const res = await apiClient.get('/notifications', { params: { userId } });
  return res.data;
};

export const markAsRead = async (notificationId: string): Promise<void> => {
  await apiClient.put(`/notifications/${notificationId}/read`);
};

export const markAllAsRead = async (userId: string): Promise<void> => {
  await apiClient.put('/notifications/read-all', { userId });
};

import React from 'react';
import { Card, Badge, Empty } from 'antd-mobile';
import { useQuery } from '@tanstack/react-query';
import { getNotifications } from '@/api/notification';
import { useAuthStore } from '@/store/authStore';

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  createTime: string;
}

const NotificationPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(user?.userId || ''),
    enabled: !!user?.userId,
  });

  const notifications = (notificationsData?.data || []) as NotificationItem[];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: '#fff', padding: '12px 16px', borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>消息中心</h2>
          {unreadCount > 0 && (
            <Badge content={unreadCount} />
          )}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {notifications.length === 0 ? (
          <Empty description="暂无消息" />
        ) : (
          notifications.map((item) => (
            <Card
              key={item.id}
              style={{ marginBottom: 12, opacity: item.isRead ? 0.7 : 1 }}
            >
              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 'bold' }}>{item.title}</span>
                    {!item.isRead && <Badge content="." style={{ background: '#1677ff', borderRadius: '50%', width: 8, height: 8, minWidth: 8, padding: 0 }} />}
                  </div>
                  <span style={{ fontSize: 12, color: '#999' }}>{item.createTime}</span>
                </div>
                <p style={{ color: '#666', fontSize: 14, margin: 0 }}>{item.content}</p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPage;

import React from 'react';
import { List, Card, DotLoading, Empty } from 'antd-mobile';
import { useQuery } from '@tanstack/react-query';
import { getLeaderboard, type LeaderboardEntry } from '@/api/leaderboard';
import { useAuthStore } from '@/store/authStore';

const LeaderboardPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', 'history'],
    queryFn: () => getLeaderboard('history'),
    enabled: !!user?.userId,
  });

  const entries = data?.data?.list || [];

  if (isLoading) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <DotLoading />
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return <Empty description="暂无排行榜数据" />;
  }

  const currentUserId = user?.userId;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: 16 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>企业积分排行榜</h2>

      <Card>
        <List>
          {entries.map((entry: LeaderboardEntry) => (
            <List.Item
              key={entry.rank}
              extra={
                <div style={{ color: '#fa8c16', fontWeight: 'bold' }}>
                  {entry.points} 分
                </div>
              }
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    textAlign: 'center',
                    lineHeight: '28px',
                    fontSize: 13,
                    fontWeight: 'bold',
                    background:
                      entry.rank === 1
                        ? '#ffd700'
                        : entry.rank === 2
                        ? '#c0c0c0'
                        : entry.rank === 3
                          ? '#cd7f32'
                          : '#f0f0f0',
                    color: entry.rank <= 3 ? '#fff' : '#666',
                  }}
                >
                  {entry.rank}
                </span>
                <span
                  style={{
                    fontWeight: entry.userId === currentUserId ? 'bold' : 'normal',
                    color: entry.userId === currentUserId ? '#1890ff' : '#333',
                  }}
                >
                  {entry.nickname}
                  {entry.userId === currentUserId && ' (我)'}
                </span>
              </div>
            </List.Item>
          ))}
        </List>
      </Card>
    </div>
  );
};

export default LeaderboardPage;

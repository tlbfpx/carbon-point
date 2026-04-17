import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, List, DotLoading, Empty, TabBar, Tabs } from 'antd-mobile';
import { useQuery } from '@tanstack/react-query';
import { getLeaderboard } from '@/api/leaderboard';
import { getLeaderboardContext } from '@/api/points';
import { useAuthStore } from '@/store/authStore';

type LeaderboardType = 'daily' | 'weekly' | 'monthly' | 'history';

const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [activeType, setActiveType] = useState<LeaderboardType>('history');

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', activeType],
    queryFn: () => getLeaderboard(activeType),
  });

  const { data: contextData } = useQuery({
    queryKey: ['leaderboardContext'],
    queryFn: getLeaderboardContext,
  });

  const entries = data?.data?.list || [];
  const currentUserId = user?.userId;
  const myRank = contextData?.data?.currentRank;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: '#fff', padding: '12px 16px', borderBottom: '1px solid #eee' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>企业积分排行榜</h2>
      </div>

      <Tabs activeKey={activeType} onChange={(key) => setActiveType(key as LeaderboardType)} style={{ background: '#fff' }}>
        <Tabs.Tab title="历史" key="history" />
        <Tabs.Tab title="日榜" key="daily" />
        <Tabs.Tab title="周榜" key="weekly" />
        <Tabs.Tab title="月榜" key="monthly" />
      </Tabs>

      <div style={{ padding: 16 }}>
        {myRank && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 16px',
            background: '#e6f7ff',
            borderRadius: 8,
            marginBottom: 12,
            border: '1px solid #91d5ff',
          }}>
            <span style={{ fontSize: 14, color: '#1890ff' }}>我的排名</span>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 16, color: '#1890ff', fontWeight: 'bold' }}>#{myRank}</span>
              {contextData?.data?.percentile !== undefined && (
                <span style={{ fontSize: 12, color: '#666' }}>超越 {contextData.data.percentile}% 用户</span>
              )}
            </div>
          </div>
        )}

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <DotLoading />
          </div>
        ) : entries.length === 0 ? (
          <Empty description="暂无排行榜数据" />
        ) : (
          <Card>
            <List>
              {entries.map((entry: { rank: number; userId: string; nickname: string; points: number; avatar?: string }) => (
                <List.Item
                  key={entry.userId}
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
        )}
      </div>

      <TabBar activeKey="leaderboard" onChange={(key) => {
        if (key === 'home') navigate('/');
        else if (key === 'checkin') navigate('/checkin');
        else if (key === 'mall') navigate('/mall');
        else if (key === 'coupons') navigate('/my-coupons');
        else if (key === 'profile') navigate('/profile');
      }}>
        <TabBar.Item key="home" title="首页" />
        <TabBar.Item key="checkin" title="打卡" />
        <TabBar.Item key="mall" title="商城" />
        <TabBar.Item key="coupons" title="卡券" />
        <TabBar.Item key="profile" title="我的" />
      </TabBar>
    </div>
  );
};

export default LeaderboardPage;

import React from 'react';
import { Card, List, ProgressBar, DotLoading } from 'antd-mobile';
import { useQuery } from '@tanstack/react-query';
import { getPointsAccount, getPointsHistory, getLeaderboardHistory, getLeaderboardContext, PointsHistoryItem, LeaderboardEntry } from '@/api/points';
import { useAuthStore } from '@/store/authStore';

const levelConfig = [
  { level: 1, name: '青铜', min: 0, max: 999, color: '#cd7f32' },
  { level: 2, name: '白银', min: 1000, max: 4999, color: '#c0c0c0' },
  { level: 3, name: '黄金', min: 5000, max: 19999, color: '#ffd700' },
  { level: 4, name: '铂金', min: 20000, max: 49999, color: '#e5e4e2' },
  { level: 5, name: '钻石', min: 50000, max: Infinity, color: '#b9f2ff' },
];

const PointsPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  const { data: accountData, isLoading: accountLoading } = useQuery({
    queryKey: ['pointsAccount'],
    queryFn: () => getPointsAccount(user?.tenantId || '', user?.userId || ''),
    enabled: !!user?.userId,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['pointsHistory'],
    queryFn: () => getPointsHistory(user?.tenantId || '', user?.userId || ''),
    enabled: !!user?.userId,
  });

  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['leaderboardHistory'],
    queryFn: getLeaderboardHistory,
  });

  const { data: contextData } = useQuery({
    queryKey: ['leaderboardContext'],
    queryFn: getLeaderboardContext,
  });

  const account = accountData?.data;
  const totalPoints = account?.totalPoints || 0;
  const currentLevel = levelConfig.find((l) => totalPoints >= l.min && totalPoints <= l.max) || levelConfig[0];
  const nextLevel = levelConfig.find((l) => l.min > totalPoints);
  const progressInLevel = nextLevel
    ? ((totalPoints - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100
    : 100;

  const leaderboardList: LeaderboardEntry[] = leaderboardData?.data?.list || [];
  const myRank = contextData?.data?.currentRank;
  const myPercentile = contextData?.data?.percentile;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', padding: '24px 16px', color: '#fff' }}>
        <p style={{ fontSize: 14, opacity: 0.8 }}>我的积分 <span style={{ opacity: 0.7 }}>(可用: {account?.availablePoints || 0})</span></p>
        {accountLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <DotLoading color="white" />
          </div>
        ) : (
          <>
            <p style={{ fontSize: 48, fontWeight: 'bold', margin: '8px 0' }}>
              {totalPoints.toLocaleString()}
            </p>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 12,
              }}>
                Lv.{currentLevel.level} {currentLevel.name}
              </span>
              {nextLevel && (
                <span style={{ fontSize: 12, marginLeft: 12, opacity: 0.8 }}>
                  距离 {nextLevel.name} 还差 {(nextLevel.min - totalPoints).toLocaleString()} 积分
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <div style={{ padding: 16 }}>
        <Card style={{ marginBottom: 16 }} title="等级进度">
          <ProgressBar
            percent={Math.round(progressInLevel)}
            style={{ '--fill-color': currentLevel.color } as React.CSSProperties}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: '#999' }}>Lv.{currentLevel.level} {currentLevel.name}</span>
            {nextLevel && <span style={{ fontSize: 12, color: '#999' }}>Lv.{nextLevel.level} {nextLevel.name}</span>}
          </div>
        </Card>

        <Card style={{ marginBottom: 16 }} title="积分明细">
          {historyLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
              <DotLoading />
            </div>
          ) : (
            <List>
              {(historyData?.data || []).slice(0, 5).map((item: PointsHistoryItem) => (
                <List.Item key={item.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>{item.description || '积分变动'}</span>
                    <span style={{ color: item.points > 0 ? '#52c41a' : '#ff4d4f', fontWeight: 'bold' }}>
                      {item.points > 0 ? '+' : ''}{item.points}
                    </span>
                  </div>
                </List.Item>
              ))}
            </List>
          )}
        </Card>

        <Card style={{ marginBottom: 16 }} title="排行榜">
          {leaderboardLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
              <DotLoading />
            </div>
          ) : (
            <>
              {myRank && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: '#e6f7ff',
                  borderRadius: 8,
                  marginBottom: 12,
                }}>
                  <span style={{ fontSize: 13, color: '#1890ff' }}>我的排名</span>
                  <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                    <span style={{ color: '#1890ff', fontWeight: 'bold' }}>#{myRank}</span>
                    {myPercentile !== undefined && (
                      <span style={{ color: '#666' }}>超越 {myPercentile}% 用户</span>
                    )}
                  </div>
                </div>
              )}
              <List>
                {leaderboardList.map((entry) => (
                  <List.Item
                    key={entry.userId}
                    extra={<span style={{ color: '#fa8c16', fontWeight: 'bold' }}>{entry.points} 分</span>}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        display: 'inline-block',
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        textAlign: 'center',
                        lineHeight: '20px',
                        fontSize: 11,
                        fontWeight: 'bold',
                        background: entry.rank === 1 ? '#ffd700'
                          : entry.rank === 2 ? '#c0c0c0'
                          : entry.rank === 3 ? '#cd7f32'
                          : '#f0f0f0',
                        color: entry.rank <= 3 ? '#fff' : '#666',
                      }}>
                        {entry.rank}
                      </span>
                      <span style={{
                        fontWeight: entry.isCurrentUser ? 'bold' : 'normal',
                        color: entry.isCurrentUser ? '#1890ff' : '#333',
                      }}>
                        {entry.nickname}
                        {entry.isCurrentUser && ' (我)'}
                      </span>
                    </div>
                  </List.Item>
                ))}
                {leaderboardList.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#999', padding: '16px 0' }}>
                    暂无排行数据
                  </p>
                )}
              </List>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PointsPage;

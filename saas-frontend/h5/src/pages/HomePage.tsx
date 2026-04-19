import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, DotLoading, TabBar, List } from 'antd-mobile';
import { GlassCard } from '@carbon-point/design-system';
import { useQuery } from '@tanstack/react-query';
import { getTodayCheckInStatus } from '@/api/checkin';
import { getLeaderboardHistory, getLeaderboardContext, type LeaderboardEntry } from '@/api/points';
import { useAuthStore } from '@/store/authStore';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return '早上好';
  if (hour < 18) return '下午好';
  return '晚上好';
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const { data: checkInStatus, isLoading: checkInLoading } = useQuery({
    queryKey: ['checkInStatus'],
    queryFn: getTodayCheckInStatus,
  });

  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['leaderboardHistory'],
    queryFn: getLeaderboardHistory,
  });

  const { data: contextData } = useQuery({
    queryKey: ['leaderboardContext'],
    queryFn: getLeaderboardContext,
  });

  const checkedIn = checkInStatus?.data?.checkedIn;
  const consecutiveDays = checkInStatus?.data?.consecutiveDays || 0;
  const pointsEarned = checkInStatus?.data?.pointsEarned || 0;
  const leaderboardList = leaderboardData?.data?.list || [];
  const myRank = contextData?.data?.currentRank;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '16px' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 4 }}>
          {greeting()}，{user?.username || '用户'}
        </h1>
        <p style={{ color: '#999', fontSize: 14 }}>坚持运动，健康生活</p>
      </div>

      <GlassCard style={{ marginBottom: 16 }} title="今日打卡状态">
        {checkInLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <DotLoading />
          </div>
        ) : checkedIn ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 48, color: '#52c41a' }}>✓</div>
            <p style={{ color: '#52c41a', fontWeight: 'bold' }}>今日已打卡</p>
            {consecutiveDays > 0 && (
              <p style={{ color: '#fa8c16', fontSize: 13, fontWeight: 500 }}>
                已连续 {consecutiveDays} 天打卡
              </p>
            )}
            <p style={{ color: '#999', fontSize: 12 }}>
              获得 {pointsEarned} 积分
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 48, color: '#faad14' }}>⏰</div>
            <p style={{ fontWeight: 'bold' }}>今日尚未打卡</p>
            {consecutiveDays > 0 && (
              <p style={{ color: '#fa8c16', fontSize: 13 }}>
                已连续 {consecutiveDays} 天，继续加油！
              </p>
            )}
            <Button color="primary" onClick={() => navigate('/checkin')} style={{ marginTop: 12 }}>
              立即打卡
            </Button>
          </div>
        )}
      </GlassCard>

      <GlassCard style={{ marginBottom: 16 }} title="快捷入口">
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/checkin')}>
            <div style={{ fontSize: 28 }}>🏃</div>
            <span style={{ fontSize: 12, marginTop: 4 }}>打卡</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/points')}>
            <div style={{ fontSize: 28 }}>💰</div>
            <span style={{ fontSize: 12, marginTop: 4 }}>积分</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/mall')}>
            <div style={{ fontSize: 28 }}>🛒</div>
            <span style={{ fontSize: 12, marginTop: 4 }}>商城</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/notifications')}>
            <div style={{ fontSize: 28 }}>🔔</div>
            <span style={{ fontSize: 12, marginTop: 4 }}>消息</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/walking')}>
            <div style={{ fontSize: 28 }}>🚶</div>
            <span style={{ fontSize: 12, marginTop: 4 }}>走路</span>
          </div>
        </div>
      </GlassCard>

      <GlassCard
        title="排行榜"
        extra={<span style={{ color: '#1677ff', fontSize: 12, cursor: 'pointer' }} onClick={() => navigate('/points')}>查看全部 →</span>}
      >
        {leaderboardLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
            <DotLoading />
          </div>
        ) : leaderboardList.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '8px 0' }}>暂无排行数据</p>
        ) : (
          <>
            {myRank && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#e6f7ff',
                borderRadius: 8,
                marginBottom: 12,
              }}>
                <span style={{ fontSize: 13, color: '#1890ff' }}>我的排名</span>
                <span style={{ fontSize: 13, color: '#1890ff', fontWeight: 'bold' }}>#{myRank}</span>
              </div>
            )}
            <List>
              {leaderboardList.slice(0, 5).map((entry: LeaderboardEntry) => (
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
            </List>
          </>
        )}
      </GlassCard>

      <TabBar activeKey="home" onChange={(key) => {
        if (key === 'checkin') navigate('/checkin');
        else if (key === 'walking') navigate('/walking');
        else if (key === 'mall') navigate('/mall');
        else if (key === 'profile') navigate('/profile');
      }}>
        <TabBar.Item key="home" title="首页" />
        <TabBar.Item key="checkin" title="打卡" />
        <TabBar.Item key="walking" title="走路" />
        <TabBar.Item key="mall" title="商城" />
        <TabBar.Item key="profile" title="我的" />
      </TabBar>
    </div>
  );
};

export default HomePage;

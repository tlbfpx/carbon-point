import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Steps, DotLoading } from 'antd-mobile';
import { useQuery } from '@tanstack/react-query';
import { getTodayCheckInStatus } from '@/api/checkin';
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

  const { data: checkInStatus, isLoading } = useQuery({
    queryKey: ['checkInStatus'],
    queryFn: getTodayCheckInStatus,
  });

  const checkedIn = checkInStatus?.data?.checkedIn;
  const consecutiveDays = checkInStatus?.data?.consecutiveDays || 0;
  const pointsEarned = checkInStatus?.data?.pointsEarned || 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '16px' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 4 }}>
          {greeting()}，{user?.username || '用户'}
        </h1>
        <p style={{ color: '#999', fontSize: 14 }}>坚持运动，健康生活</p>
      </div>

      <Card style={{ marginBottom: 16 }} title="今日打卡状态">
        {isLoading ? (
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
      </Card>

      <Card style={{ marginBottom: 16 }} title="快捷入口">
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
        </div>
      </Card>

      <Card title="排行榜">
        <Steps current={0} direction="horizontal">
          <Steps.Step title="Lv.1" description="青铜" />
          <Steps.Step title="Lv.2" description="白银" />
          <Steps.Step title="Lv.3" description="黄金" />
          <Steps.Step title="Lv.4" description="铂金" />
          <Steps.Step title="Lv.5" description="钻石" />
        </Steps>
      </Card>
    </div>
  );
};

export default HomePage;

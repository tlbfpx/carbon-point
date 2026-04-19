import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Button, Switch, Toast, TabBar, DotLoading } from 'antd-mobile';
import { GlassCard } from '@carbon-point/design-system';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { getPointsAccount } from '@/api/points';

const levelConfig = [
  { level: 1, name: '青铜', min: 0, max: 999, color: '#cd7f32' },
  { level: 2, name: '白银', min: 1000, max: 4999, color: '#c0c0c0' },
  { level: 3, name: '黄金', min: 5000, max: 19999, color: '#ffd700' },
  { level: 4, name: '铂金', min: 20000, max: 49999, color: '#e5e4e2' },
  { level: 5, name: '钻石', min: 50000, max: Infinity, color: '#b9f2ff' },
];

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const { data: accountData, isLoading: accountLoading } = useQuery({
    queryKey: ['pointsAccount'],
    queryFn: () => getPointsAccount(user?.tenantId || '', user?.userId || ''),
    enabled: !!user?.userId,
  });

  const account = accountData?.data;
  const totalPoints = account?.totalPoints || 0;
  const currentLevel = levelConfig.find((l) => totalPoints >= l.min && totalPoints <= l.max) || levelConfig[0];

  const handleLogout = () => {
    logout();
    Toast.show('已退出登录');
    navigate('/login');
  };

  const avatarText = user?.username?.charAt(0) || 'U';

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', padding: '24px 16px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {user?.avatar ? (
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 'bold',
              }}>
                {avatarText}
              </div>
            ) : (
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 'bold',
              }}>
                {avatarText}
              </div>
            )}
            <div style={{ marginLeft: 16 }}>
              <p style={{ fontSize: 20, fontWeight: 'bold' }}>{user?.username || '用户'}</p>
              <p style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>ID: {user?.userId || '-'}</p>
            </div>
          </div>
          {accountLoading ? (
            <DotLoading color="white" />
          ) : (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>
                {totalPoints.toLocaleString()}
              </p>
              <p style={{ fontSize: 12, opacity: 0.8 }}>
                Lv.{currentLevel.level} {currentLevel.name}
              </p>
            </div>
          )}
        </div>
      </div>

      <GlassCard
        style={{ margin: 16 }}
        title="我的积分"
        onClick={() => navigate('/points')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 24, fontWeight: 'bold', margin: 0, color: '#1890ff' }}>
              {totalPoints.toLocaleString()}
            </p>
            <p style={{ fontSize: 12, color: '#999', margin: '4px 0 0' }}>
              可用积分
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              background: currentLevel.color,
              color: currentLevel.level >= 3 ? '#333' : '#fff',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 'bold',
            }}>
              Lv.{currentLevel.level} {currentLevel.name}
            </span>
            <p style={{ fontSize: 12, color: '#1677ff', margin: '4px 0 0' }}>查看详情 →</p>
          </div>
        </div>
      </GlassCard>

      <GlassCard style={{ margin: '0 16px 16px' }} title="个人信息">
        <List>
          <List.Item extra={user?.username || '-'}>用户名</List.Item>
          <List.Item extra={user?.phone || '-'}>手机号</List.Item>
          <List.Item extra={user?.email || '-'}>邮箱</List.Item>
        </List>
      </GlassCard>

      <GlassCard style={{ margin: '0 16px 16px' }} title="设置">
        <List>
          <List.Item
            extra={
              <Switch
                checked={notificationsEnabled}
                onChange={(checked) => {
                  setNotificationsEnabled(checked);
                  Toast.show(checked ? '已开启消息通知' : '已关闭消息通知');
                }}
              />
            }
          >
            消息通知
          </List.Item>
          <List.Item
            extra={
              <Switch
                checked={soundEnabled}
                onChange={(checked) => {
                  setSoundEnabled(checked);
                  Toast.show(checked ? '已开启声音提示' : '已关闭声音提示');
                }}
              />
            }
          >
            声音提示
          </List.Item>
        </List>
      </GlassCard>

      <div style={{ padding: '0 16px' }}>
        <Button block color="danger" onClick={handleLogout}>
          退出登录
        </Button>
      </div>

      <TabBar activeKey="profile" onChange={(key) => {
        if (key === 'home') navigate('/');
        else if (key === 'checkin') navigate('/checkin');
        else if (key === 'mall') navigate('/mall');
        else if (key === 'coupons') navigate('/my-coupons');
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

export default ProfilePage;

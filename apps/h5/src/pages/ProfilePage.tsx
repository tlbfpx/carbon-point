import React from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Card, Avatar, Button, Switch, Toast } from 'antd-mobile';
import { useAuthStore } from '@/store/authStore';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    Toast.show('已退出登录');
    navigate('/login');
  };

  const avatarText = user?.username?.charAt(0) || 'U';

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', padding: '24px 16px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {user?.avatar ? (
            <Avatar
              src={user.avatar}
              fallback={avatarText}
              style={{ background: 'rgba(255,255,255,0.2)' }}
            />
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
      </div>

      <Card style={{ margin: 16 }} title="个人信息">
        <List>
          <List.Item extra={user?.username || '-'}>用户名</List.Item>
          <List.Item extra={user?.phone || '-'}>手机号</List.Item>
          <List.Item extra={user?.email || '-'}>邮箱</List.Item>
        </List>
      </Card>

      <Card style={{ margin: '0 16px 16px' }} title="设置">
        <List>
          <List.Item
            extra={<Switch />}
            onClick={() => {}}
          >
            消息通知
          </List.Item>
          <List.Item
            extra={<Switch defaultChecked />}
            onClick={() => {}}
          >
            声音提示
          </List.Item>
        </List>
      </Card>

      <div style={{ padding: '0 16px' }}>
        <Button block color="danger" onClick={handleLogout}>
          退出登录
        </Button>
      </div>
    </div>
  );
};

export default ProfilePage;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, List, Input, Button, Toast, Checkbox } from 'antd-mobile';
import { useMutation } from '@tanstack/react-query';
import { login } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login: setAuth } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (res) => {
      if (res.code === 200) {
        setAuth(res.data.accessToken, res.data.refreshToken, res.data.user);
        Toast.show('登录成功');
        navigate('/');
      } else {
        Toast.show(res.message || '登录失败');
      }
    },
    onError: () => {
      Toast.show('网络错误，请重试');
    },
  });

  const handleLogin = () => {
    if (!phone || !password) {
      Toast.show('请输入手机号和密码');
      return;
    }
    loginMutation.mutate({ phone, password, remember });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🏃</div>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>碳积分打卡平台</h1>
        <p style={{ color: '#999', marginTop: 8 }}>健康运动，积分激励</p>
      </div>

      <Card>
        <List>
          <Input
            placeholder="请输入手机号"
            value={phone}
            onChange={(val) => setPhone(val)}
            type="phone"
            clearable
          />
        </List>
        <List style={{ marginTop: 8 }}>
          <Input
            placeholder="请输入密码"
            value={password}
            onChange={(val) => setPassword(val)}
            type="password"
            clearable
          />
        </List>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <Checkbox checked={remember} onChange={(val) => setRemember(val)}>
            <span style={{ fontSize: 12 }}>记住我</span>
          </Checkbox>
          <span
            style={{ fontSize: 12, color: '#1677ff', cursor: 'pointer' }}
            onClick={() => {}}
          >
            忘记密码？
          </span>
        </div>

        <Button block color="primary" size="large" style={{ marginTop: 24 }} onClick={handleLogin}>
          登录
        </Button>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <span style={{ color: '#999', fontSize: 14 }}>还没有账号？</span>
          <span
            style={{ color: '#1677ff', fontSize: 14, cursor: 'pointer', marginLeft: 4 }}
            onClick={() => navigate('/register')}
          >
            立即注册
          </span>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;

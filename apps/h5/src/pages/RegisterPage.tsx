import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '@carbon-point/design-system';
import { List, Input, Button, Toast } from 'antd-mobile';
import { useMutation } from '@tanstack/react-query';
import { register, sendSmsCode } from '@/api/auth';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [countDown, setCountDown] = useState(0);

  useEffect(() => {
    if (countDown > 0) {
      const timer = setTimeout(() => setCountDown(countDown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countDown]);

  const sendCodeMutation = useMutation({
    mutationFn: sendSmsCode,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200) {
        Toast.show('验证码已发送');
        setCountDown(60);
      } else {
        Toast.show(res.message || '发送失败');
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200) {
        Toast.show('注册成功');
        navigate('/login');
      } else {
        Toast.show(res.message || '注册失败');
      }
    },
  });

  const handleSendCode = () => {
    if (!phone || phone.length !== 11) {
      Toast.show('请输入正确的手机号');
      return;
    }
    sendCodeMutation.mutate({ phone, type: 'register' });
  };

  const handleRegister = () => {
    if (!phone || !smsCode || !password) {
      Toast.show('请填写完整信息');
      return;
    }
    if (password !== confirmPassword) {
      Toast.show('两次密码不一致');
      return;
    }
    if (password.length < 8) {
      Toast.show('密码长度至少8位');
      return;
    }
    registerMutation.mutate({ phone, smsCode, password, inviteCode });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: 16 }}>
      <div style={{ textAlign: 'center', marginBottom: 24, paddingTop: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>注册账号</h1>
        <p style={{ color: '#999', marginTop: 8 }}>加入碳积分，健康生活</p>
      </div>

      <GlassCard>
        <List>
          <Input
            placeholder="请输入手机号"
            value={phone}
            onChange={setPhone}
            type="phone"
            clearable
          />
        </List>

        <List style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Input
              placeholder="请输入验证码"
              value={smsCode}
              onChange={setSmsCode}
              style={{ flex: 1 }}
            />
            <Button
              size="small"
              disabled={countDown > 0}
              onClick={handleSendCode}
            >
              {countDown > 0 ? `${countDown}s` : '获取验证码'}
            </Button>
          </div>
        </List>

        <List style={{ marginTop: 8 }}>
          <Input
            placeholder="设置密码（至少8位）"
            value={password}
            onChange={setPassword}
            type="password"
            clearable
          />
        </List>

        <List style={{ marginTop: 8 }}>
          <Input
            placeholder="确认密码"
            value={confirmPassword}
            onChange={setConfirmPassword}
            type="password"
            clearable
          />
        </List>

        <List style={{ marginTop: 8 }}>
          <Input
            placeholder="邀请码（选填）"
            value={inviteCode}
            onChange={setInviteCode}
            clearable
          />
        </List>

        <Button block color="primary" size="large" style={{ marginTop: 24 }} onClick={handleRegister}>
          注册
        </Button>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <span style={{ color: '#999', fontSize: 14 }}>已有账号？</span>
          <span
            style={{ color: '#1677ff', fontSize: 14, cursor: 'pointer', marginLeft: 4 }}
            onClick={() => navigate('/login')}
          >
            立即登录
          </span>
        </div>
      </GlassCard>
    </div>
  );
};

export default RegisterPage;

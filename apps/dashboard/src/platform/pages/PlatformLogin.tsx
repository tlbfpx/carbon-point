import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { platformLogin } from '@/shared/api/platform';
import { useAuthStore } from '@/shared/store/authStore';

const PlatformLogin: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { login: setPlatformAuth } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      platformLogin(username, password),
    onSuccess: (res) => {
      setLoading(false);
      if (res.code === 200 && res.data) {
        message.success('登录成功');
        setPlatformAuth(
          res.data.accessToken,
          res.data.refreshToken,
          res.data.user,
          res.data.permissions
        );
        navigate('/platform/dashboard');
      } else {
        message.error(res.message || '登录失败');
      }
    },
    onError: () => {
      setLoading(false);
      message.error('网络错误，请重试');
    },
  });

  const onFinish = (values: { username: string; password: string; remember: boolean }) => {
    setLoading(true);
    loginMutation.mutate(values);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a3360 0%, #091e42 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card
        title="平台管理员登录"
        style={{ width: 420 }}
        headStyle={{ fontSize: 20, textAlign: 'center' }}
      >
        <Form
          form={form}
          name="platform-login"
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked" initialValue={true}>
            <Checkbox>记住我</Checkbox>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default PlatformLogin;

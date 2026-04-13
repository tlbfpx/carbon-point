import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message, Checkbox } from 'antd';
import { IdcardOutlined, LockOutlined } from '@ant-design/icons';
import { platformApiClient } from '@/api/request';
import { useAuthStore } from '@/store/authStore';

const PlatformLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login: setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { username: string; password: string; remember?: boolean }) => {
    setLoading(true);
    try {
      const res: any = await platformApiClient.post('/auth/login', {
        username: values.username,
        password: values.password,
      });
      if (res.data?.code === 200 || res.data?.code === 0 || res.status === 200) {
        const data = res.data?.data || res.data;
        // PlatformAuthResponse has `admin` (PlatformAdminVO), not `user`
        setAuth(data.accessToken, data.refreshToken, {
          userId: String(data.admin.id),
          username: data.admin.displayName || data.admin.username,
          roles: [data.admin.role],
          permissions: [],
          isPlatformAdmin: true,
        });
        message.success('登录成功');
        navigate('/');
      } else {
        message.error(res.data?.message || res.data?.msg || '登录失败');
      }
    } catch (err: any) {
      const data = err.response?.data;
      message.error(data?.message || '网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      }}
    >
      <Card
        style={{ width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}
        bordered={false}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔧</div>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>平台管理后台</h1>
          <p style={{ color: '#999', marginTop: 8 }}>SaaS 平台运维管理系统</p>
        </div>

        <Form
          name="platform-login"
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<IdcardOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="请输入管理员用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="请输入密码"
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>记住我</Checkbox>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default PlatformLoginPage;

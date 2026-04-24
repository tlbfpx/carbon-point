import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, message, Checkbox, Alert, Space } from 'antd';
import { LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { platformApiClient } from '@/api/request';
import { useAuthStore } from '@/store/authStore';

interface LoginFormValues {
  username: string;
  password: string;
  remember?: boolean;
}

interface LoginError {
  type: 'network' | 'auth' | 'unknown';
  message: string;
}

const PlatformLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login: setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);
  const [form] = Form.useForm();

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await platformApiClient.post('/auth/login', {
        username: values.username.trim(),
        password: values.password,
      });
      const responseData = res.data;

      if (res.code === '0000' || res.code === '0' || res.code === 0 || res.code === 200) {
        const data = responseData;
        const admin = data.admin;

        if (!admin) {
          setError({ type: 'auth', message: '登录响应数据异常' });
          setLoading(false);
          return;
        }

        setAuth(data.accessToken, data.refreshToken, {
          userId: String(admin.id),
          username: admin.displayName || admin.username || values.username,
          phone: admin.phone,
          email: admin.email,
          roles: [admin.role || 'admin'],
          permissions: [],
          isPlatformAdmin: true,
        });
        message.success('登录成功');
        navigate('/', { replace: true });
      } else {
        setError({
          type: 'auth',
          message: responseData?.message || responseData?.msg || '用户名或密码错误',
        });
      }
    } catch (err: any) {
      if (err.response) {
        const data = err.response.data;
        setError({
          type: data?.code === 401 || err.response.status === 401 ? 'auth' : 'network',
          message: data?.message || (err.response.status === 401 ? '用户名或密码错误' : '网络错误，请检查网络后重试'),
        });
      } else if (err.request) {
        setError({ type: 'network', message: '无法连接到服务器，请检查网络' });
      } else {
        setError({ type: 'unknown', message: '登录过程发生异常' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearError = () => {
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F5F5F7',
        position: 'relative',
      }}
    >
      {/* Subtle decorative gradient */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '45%',
          background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #a78bfa 100%)',
          borderBottomLeftRadius: '40% 60px',
          borderBottomRightRadius: '40% 60px',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: 420,
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
          padding: '40px 36px 32px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo and title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              marginBottom: 16,
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}
          >
            <SafetyCertificateOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#1E293B', fontFamily: "'Inter', 'Noto Sans SC', sans-serif" }}>
            平台管理后台
          </h1>
          <p style={{ color: '#94A3B8', marginTop: 6, fontSize: 14 }}>
            SaaS 多租户运营管理系统
          </p>
        </div>

        {error && (
          <Alert
            message={error.message}
            type={error.type === 'auth' ? 'error' : 'warning'}
            showIcon
            closable
            onClose={handleClearError}
            style={{ marginBottom: 20, borderRadius: 8 }}
          />
        )}

        <Form
          name="platform-login"
          form={form}
          onFinish={onFinish}
          size="large"
          layout="vertical"
          initialValues={{ remember: true }}
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入管理员用户名' },
              { min: 2, max: 32, message: '用户名长度为 2-32 个字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#94A3B8' }} />}
              placeholder="请输入管理员用户名"
              autoComplete="username"
              maxLength={32}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少 6 个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
              placeholder="请输入密码"
              autoComplete="current-password"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 16 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Checkbox>记住用户名</Checkbox>
              <a
                style={{ fontSize: 13, color: '#6366F1' }}
                onClick={(e) => {
                  e.preventDefault();
                  message.info('请联系系统管理员重置密码');
                }}
              >
                忘记密码？
              </a>
            </Space>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              size="large"
              style={{
                height: 44,
                fontSize: 15,
                borderRadius: 8,
                fontWeight: 500,
              }}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </Form.Item>
        </Form>

        {/* Footer */}
        <div
          style={{
            marginTop: 24,
            textAlign: 'center',
            paddingTop: 16,
            borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          }}
        >
          <Space split={<span style={{ color: '#CBD5E1' }}>|</span>}>
            <a style={{ fontSize: 12, color: '#94A3B8' }}>帮助中心</a>
            <a style={{ fontSize: 12, color: '#94A3B8' }}>服务条款</a>
            <a style={{ fontSize: 12, color: '#94A3B8' }}>隐私政策</a>
          </Space>
        </div>
      </div>
    </div>
  );
};

export default PlatformLoginPage;

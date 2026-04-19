import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, message, Checkbox, Alert, Space } from 'antd';
import { IdcardOutlined, LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
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
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        position: 'relative',
      }}
    >
      {/* Decorative background elements */}
      <div
        style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle at 30% 30%, rgba(64, 158, 255, 0.08) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      <Card
        style={{
          width: 420,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          borderRadius: 16,
          border: 'none',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: '40px 36px 32px' } }}
      >
        {/* Logo and title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 72,
              height: 72,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
              marginBottom: 16,
              boxShadow: '0 4px 16px rgba(24, 144, 255, 0.4)',
            }}
          >
            <SafetyCertificateOutlined style={{ fontSize: 36, color: '#fff' }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#1a1a2e' }}>
            平台管理后台
          </h1>
          <p style={{ color: '#8c8c8c', marginTop: 6, fontSize: 14 }}>
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
              prefix={<UserOutlined style={{ color: '#bfbfbf', fontSize: 18 }} />}
              placeholder="请输入管理员用户名"
              autoComplete="username"
              maxLength={32}
              size="large"
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
              prefix={<LockOutlined style={{ color: '#bfbfbf', fontSize: 18 }} />}
              placeholder="请输入密码"
              autoComplete="current-password"
              size="large"
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 16 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Checkbox>记住用户名</Checkbox>
              <a
                style={{ fontSize: 13, color: '#1890ff' }}
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
                height: 48,
                fontSize: 16,
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
            borderTop: '1px solid #f0f0f0',
          }}
        >
          <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
            <a style={{ fontSize: 12, color: '#8c8c8c' }}>帮助中心</a>
            <a style={{ fontSize: 12, color: '#8c8c8c' }}>服务条款</a>
            <a style={{ fontSize: 12, color: '#8c8c8c' }}>隐私政策</a>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default PlatformLoginPage;
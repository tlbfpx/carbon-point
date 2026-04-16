import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Card, message, Checkbox, Image } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { login } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { getBrandingByTenantId } from '@/api/branding';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login: setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Get tenant ID from query parameters
  const tenantId = searchParams.get('tenantId') ? Number(searchParams.get('tenantId')) : null;

  // Fetch branding configuration for this tenant
  const { data: branding } = useQuery({
    queryKey: ['tenantBranding', tenantId],
    queryFn: () => getBrandingByTenantId(tenantId!),
    enabled: !!tenantId, // Only fetch if tenantId exists
  });

  // Get primary color from branding or use default
  const primaryColor = branding?.primaryColor || 
    (branding?.themeType === 'preset' ? 
      ({
        'default-blue': '#1890ff',
        'tech-green': '#52c41a',
        'vibrant-orange': '#fa8c16',
        'deep-purple': '#722ed1',
      }[branding.presetTheme!] || '#1890ff') : 
      '#1890ff'
    );

  // Generate gradient background based on primary color
  const backgroundGradient = `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor} 100%)`;

  const onFinish = async (values: { phone: string; password: string; remember?: boolean }) => {
    setLoading(true);
    try {
      const res: any = await login(values);
      console.log('[Login Debug] Full response:', res);
      
      // 尝试多种可能的响应结构
      const code = res.data?.code ?? res.code ?? res.status;
      const data = res.data?.data || res.data || res;
      
      console.log('[Login Debug] Parsed code:', code, 'Parsed data:', data);
      
      if (code === 200 || code === 0 || code === '200' || code === '0' || code === '0000') {
        // 确保我们有正确的用户数据结构
        const accessToken = data.accessToken || data.token;
        const refreshToken = data.refreshToken || data.refresh_token;
        const user = data.user || data;
        
        console.log('[Login Debug] Tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken });
        console.log('[Login Debug] User:', user);
        
        if (accessToken && user) {
          setAuth(accessToken, refreshToken, user);
          message.success('登录成功');
          // 使用更明确的导航路径
          setTimeout(() => {
            navigate('/enterprise/dashboard', { replace: true });
          }, 100);
        } else {
          message.error('登录响应数据格式错误');
          console.error('[Login Error] Missing accessToken or user data');
        }
      } else {
        const errorMsg = res.data?.message || res.data?.msg || res.message || data.message || data.msg || '登录失败';
        message.error(errorMsg);
        console.error('[Login Error] Login failed with code:', code, 'message:', errorMsg);
      }
    } catch (error: any) {
      console.error('[Login Error] Network error:', error);
      message.error(error?.response?.data?.message || error?.message || '网络错误，请重试');
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
        background: backgroundGradient,
      }}
    >
      <Card
        style={{ width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}
        bordered={false}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {branding?.logoUrl ? (
            <Image 
              src={branding.logoUrl} 
              alt="企业Logo" 
              width={64} 
              height={64} 
              preview={false} 
              style={{ marginBottom: 12 }}
            />
          ) : (
            <div style={{ fontSize: 48, marginBottom: 8 }}>🏢</div>
          )}
          <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>管理后台</h1>
          <p style={{ color: '#999', marginTop: 8 }}>企业数据管理平台</p>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="phone"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="请输入手机号"
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
                style={{ background: primaryColor, borderColor: primaryColor }}
              >
                登录
              </Button>
            </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;

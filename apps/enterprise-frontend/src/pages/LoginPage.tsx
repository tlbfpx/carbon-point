import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, message, Checkbox } from 'antd';
import { UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { login } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import { useBranding } from '@/components/BrandingProvider';

const DEFAULT_PRIMARY = '#1890ff'; // Default brand color

// Floating blob animation
const FloatingBlob: React.FC<{
  color: string;
  size: number;
  top: string;
  left: string;
  delay: number;
  duration: number;
}> = ({ color, size, top, left, delay, duration }) => (
  <div
    style={{
      position: 'absolute',
      width: size,
      height: size,
      top,
      left,
      background: `radial-gradient(circle at 30% 30%, ${color}99, ${color}66)`,
      borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
      filter: 'blur(0px)',
      opacity: 0.4,
      animation: `float ${duration}s ease-in-out ${delay}s infinite`,
      pointerEvents: 'none',
    }}
  />
);

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login: setAuth } = useAuthStore();
  const { branding, primaryColor } = useBranding();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const color = primaryColor || DEFAULT_PRIMARY;

  // Warm color palette for digital garden aesthetic
  const colors = {
    warmWhite: '#fafaf7',
    warmGrayLight: '#f8f7f4',
    warmGray: '#f0efe9',
    warmBorder: '#d4d0c8',
    warmText: '#3d3d3d',
    warmTextMuted: '#8a8a8a',
    errorBg: '#fef2f2',
    errorBorder: '#fecaca',
    errorText: '#dc2626',
  };

  const onFinish = async (values: { phone: string; password: string; remember?: boolean }) => {
    setFormError(null);
    setLoading(true);
    try {
      const res: any = await login(values);

      const code = res.data?.code ?? res.code ?? res.status;
      const data = res.data?.data || res.data || res;

      if (code === 200 || code === 0 || code === '200' || code === '0' || code === '0000') {
        const accessToken = data.accessToken || data.token;
        const refreshToken = data.refreshToken || data.refresh_token;
        const user = data.user || data;

        if (accessToken && user) {
          setAuth(accessToken, refreshToken, user);
          message.success('登录成功');
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 100);
        } else {
          setFormError('登录响应数据格式错误');
        }
      } else {
        const errorMsg = res.data?.message || res.data?.msg || res.message || data.message || data.msg || '登录失败';
        setFormError(errorMsg);
      }
    } catch (error: any) {
      setFormError(error?.response?.data?.message || error?.message || '网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // Common input style
  const inputStyle: React.CSSProperties = {
    borderRadius: 12,
    border: `1px solid ${colors.warmBorder}`,
    padding: '12px 16px',
    fontSize: 15,
    background: colors.warmWhite,
    transition: 'all 0.25s ease',
  };

  const inputFocusStyle: React.CSSProperties = {
    borderColor: color,
    boxShadow: `0 0 0 3px ${color}20`,
  };

  return (
    <>
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
            25% { transform: translateY(-20px) rotate(5deg) scale(1.05); }
            50% { transform: translateY(-10px) rotate(-5deg) scale(0.95); }
            75% { transform: translateY(-15px) rotate(3deg) scale(1.02); }
          }

          @keyframes pulse-soft {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.6; }
          }

          .login-input .ant-input {
            border-radius: 12px !important;
            border: 1px solid ${colors.warmBorder} !important;
            padding: 12px 16px !important;
            font-size: 15px !important;
            background: ${colors.warmWhite} !important;
            transition: all 0.25s ease !important;
          }

          .login-input .ant-input:focus,
          .login-input .ant-input-focused {
            border-color: ${color} !important;
            box-shadow: 0 0 0 3px ${color}20 !important;
          }

          .login-input .ant-input:hover {
            border-color: ${color}80 !important;
          }

          .login-input .ant-input-prefix {
            color: ${colors.warmTextMuted} !important;
            margin-right: 8px !important;
          }

          .login-checkbox .ant-checkbox-wrapper {
            color: ${colors.warmText} !important;
          }

          .login-checkbox .ant-checkbox-checked .ant-checkbox-inner {
            background-color: ${color} !important;
            border-color: ${color} !important;
          }

          .login-checkbox .ant-checkbox:hover .ant-checkbox-inner {
            border-color: ${color} !important;
          }

          @media (max-width: 768px) {
            .left-panel {
              display: none !important;
            }
            .right-panel {
              width: 100% !important;
              max-width: none !important;
            }
          }
        `}
      </style>

      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          fontFamily: "'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif",
          background: colors.warmGray,
        }}
      >
        {/* Left Panel - Decorative Branding Area */}
        <div
          className="left-panel"
          style={{
            flex: '0 0 58%',
            position: 'relative',
            overflow: 'hidden',
            background: `linear-gradient(135deg, ${color}08 0%, ${color}15 50%, ${color}20 100%)`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Gradient mesh background */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `
                radial-gradient(ellipse 80% 50% at 20% 40%, ${color}15 0%, transparent 50%),
                radial-gradient(ellipse 60% 40% at 80% 20%, ${color}12 0%, transparent 50%),
                radial-gradient(ellipse 50% 60% at 40% 80%, ${color}10 0%, transparent 50%),
                radial-gradient(ellipse 40% 30% at 70% 70%, ${color}08 0%, transparent 50%)
              `,
            }}
          />

          {/* Floating organic blobs */}
          <FloatingBlob color={color} size={200} top="10%" left="15%" delay={0} duration={8} />
          <FloatingBlob color={color} size={150} top="60%" left="10%" delay={1} duration={10} />
          <FloatingBlob color={color} size={180} top="20%" left="70%" delay={2} duration={12} />
          <FloatingBlob color={color} size={120} top="70%" left="75%" delay={0.5} duration={9} />
          <FloatingBlob color={color} size={100} top="40%" left="45%" delay={1.5} duration={11} />

          {/* Decorative circles */}
          <div
            style={{
              position: 'absolute',
              width: 400,
              height: 400,
              top: '10%',
              right: -100,
              borderRadius: '50%',
              border: `1px solid ${color}20`,
              opacity: 0.3,
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: 300,
              height: 300,
              bottom: '15%',
              left: -80,
              borderRadius: '50%',
              border: `1px solid ${color}18`,
              opacity: 0.25,
            }}
          />

          {/* Logo and title */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              textAlign: 'center',
              animation: 'float 6s ease-in-out infinite',
            }}
          >
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="企业Logo"
                style={{
                  width: 80,
                  height: 80,
                  objectFit: 'contain',
                  marginBottom: 24,
                  filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.1))',
                }}
              />
            ) : (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 20,
                  background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                  margin: '0 auto 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  color: '#fff',
                  fontWeight: 600,
                  boxShadow: `0 12px 32px ${color}40`,
                }}
              >
                碳
              </div>
            )}

            <h1
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 64,
                fontWeight: 700,
                margin: 0,
                background: `linear-gradient(135deg, ${color}, ${color}99)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
              }}
            >
              碳积分
            </h1>

            <p
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 20,
                fontWeight: 400,
                color: colors.warmTextMuted,
                marginTop: 12,
                letterSpacing: '0.02em',
              }}
            >
              企业碳积分管理平台
            </p>

            {/* Decorative tagline */}
            <div
              style={{
                marginTop: 32,
                padding: '12px 24px',
                background: `${color}10`,
                borderRadius: 24,
                color: `${color}cc`,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              绿色办公 · 健康生活 · 低碳未来
            </div>
          </div>

          {/* Bottom decorative element */}
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 8,
              opacity: 0.4,
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: color,
                  animation: `pulse-soft 2s ease-in-out ${i * 0.3}s infinite`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div
          className="right-panel"
          style={{
            flex: 1,
            minWidth: 0,
            background: colors.warmWhite,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            position: 'relative',
          }}
        >
          {/* Subtle background pattern */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.03,
              backgroundImage: `radial-gradient(circle, ${color} 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />

          <div
            style={{
              width: '100%',
              maxWidth: 400,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* Welcome heading */}
            <div style={{ marginBottom: 40 }}>
              <h2
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 32,
                  fontWeight: 600,
                  color: colors.warmText,
                  margin: 0,
                  marginBottom: 8,
                }}
              >
                欢迎回来
              </h2>
              <p
                style={{
                  fontSize: 15,
                  color: colors.warmTextMuted,
                  margin: 0,
                }}
              >
                请登录您的账户
              </p>
            </div>

            {/* Error display */}
            {formError && (
              <div
                style={{
                  background: colors.errorBg,
                  border: `1px solid ${colors.errorBorder}`,
                  borderRadius: 12,
                  padding: '12px 16px',
                  marginBottom: 24,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: colors.errorText,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>!</span>
                </div>
                <span style={{ color: colors.errorText, fontSize: 14 }}>{formError}</span>
              </div>
            )}

            {/* Login form */}
            <Form
              name="login"
              onFinish={onFinish}
              layout="vertical"
              requiredMark={false}
            >
              <Form.Item
                name="phone"
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
                ]}
                style={{ marginBottom: 20 }}
              >
                <Input
                  className="login-input"
                  prefix={<UserOutlined />}
                  placeholder="手机号"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: '请输入密码' }]}
                style={{ marginBottom: 16 }}
              >
                <Input.Password
                  className="login-input"
                  prefix={<LockOutlined />}
                  placeholder="密码"
                  size="large"
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                />
              </Form.Item>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 28,
                }}
              >
                <Form.Item name="remember" valuePropName="checked" style={{ margin: 0 }}>
                  <Checkbox className="login-checkbox">记住我</Checkbox>
                </Form.Item>
              </div>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  htmlType="submit"
                  block
                  loading={loading}
                  style={{
                    height: 48,
                    borderRadius: 24,
                    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                    border: 'none',
                    fontSize: 16,
                    fontWeight: 600,
                    fontFamily: "'Outfit', sans-serif",
                    letterSpacing: '0.02em',
                    boxShadow: `0 4px 16px ${color}40`,
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 8px 24px ${color}50`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = `0 4px 16px ${color}40`;
                  }}
                >
                  登录
                </Button>
              </Form.Item>
            </Form>

            {/* Footer text */}
            <div
              style={{
                marginTop: 32,
                textAlign: 'center',
                fontSize: 13,
                color: colors.warmTextMuted,
              }}
            >
              登录即表示您同意我们的{' '}
              <a href="#" style={{ color: color, textDecoration: 'none' }}>
                服务条款
              </a>{' '}
              和{' '}
              <a href="#" style={{ color: color, textDecoration: 'none' }}>
                隐私政策
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;

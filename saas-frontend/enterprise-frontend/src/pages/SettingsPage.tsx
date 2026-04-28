import React from 'react';
import { Row, Col, Card } from 'antd';
import {
  SafetyOutlined,
  SkinOutlined,
  AppstoreOutlined,
  BookOutlined,
  FileTextOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useBranding } from '@/components/BrandingProvider';

const settingsItems = [
  { key: '/roles', icon: <SafetyOutlined />, title: '角色管理', desc: '管理企业角色和权限分配' },
  { key: '/branding', icon: <SkinOutlined />, title: '品牌配置', desc: '自定义企业Logo和主题颜色' },
  { key: '/feature-matrix', icon: <AppstoreOutlined />, title: '功能点阵', desc: '查看已开通功能列表' },
  { key: '/dict-management', icon: <BookOutlined />, title: '字典管理', desc: '管理系统数据字典' },
  { key: '/operation-log', icon: <FileTextOutlined />, title: '操作日志', desc: '查看系统操作记录' },
];

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { primaryColor } = useBranding();

  return (
    <div style={{ padding: '0 0 24px', fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)' }}>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 4,
            color: '#fff',
          }}
        >
          系统设置
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: 0 }}>
          管理系统配置和参数
        </p>
      </div>

      <Row gutter={[16, 16]}>
        {settingsItems.map((item) => (
          <Col xs={24} sm={12} md={8} key={item.key}>
            <Card
              hoverable
              onClick={() => navigate(item.key)}
              style={{
                borderRadius: 16,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
              }}
              styles={{ body: { padding: 20 } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 28, color: primaryColor }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: 15, marginBottom: 2 }}>
                    {item.title}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
                    {item.desc}
                  </div>
                </div>
                <RightOutlined style={{ color: 'rgba(255,255,255,0.25)' }} />
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default SettingsPage;

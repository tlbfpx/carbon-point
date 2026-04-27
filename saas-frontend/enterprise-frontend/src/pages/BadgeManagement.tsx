import React from 'react';
import { Card, Row, Col, Table, Tag, Space, Statistic } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';

interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  badgeName: string;
  description: string;
  icon: string;
  rarity: string;
  earnedAt: string;
}

const BadgeManagement: React.FC = () => {
  const user = useAuthStore((s) => s.user);

  const columns = [
    {
      title: '徽章',
      dataIndex: 'badgeName',
      key: 'badgeName',
      render: (name: string, record: UserBadge) => (
        <Space>
          <TrophyOutlined style={{ fontSize: 24, color: getRarityColor(record.rarity) }} />
          <span style={{ fontWeight: 600 }}>{name}</span>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '稀有度',
      dataIndex: 'rarity',
      key: 'rarity',
      render: (rarity: string) => (
        <Tag color={getRarityTagColor(rarity)}>{getRarityLabel(rarity)}</Tag>
      ),
    },
    {
      title: '获得时间',
      dataIndex: 'earnedAt',
      key: 'earnedAt',
    },
  ];

  // Get color for rarity icon
  function getRarityColor(rarity: string) {
    switch (rarity) {
      case 'common': return '#94A3B8';
      case 'rare': return '#3B82F6';
      case 'epic': return '#8B5CF6';
      case 'legendary': return '#F59E0B';
      default: return '#94A3B8';
    }
  }

  // Get tag color for rarity
  function getRarityTagColor(rarity: string) {
    switch (rarity) {
      case 'common': return 'default';
      case 'rare': return 'blue';
      case 'epic': return 'purple';
      case 'legendary': return 'orange';
      default: return 'default';
    }
  }

  // Get label for rarity
  function getRarityLabel(rarity: string) {
    switch (rarity) {
      case 'common': return '普通';
      case 'rare': return '稀有';
      case 'epic': return '史诗';
      case 'legendary': return '传说';
      default: return rarity;
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>
          徽章管理
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#94A3B8' }}>
          查看和管理用户获得的徽章
        </p>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总徽章类型"
              value={12}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#3B82F6' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="已授予徽章"
              value={0}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#10B981' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="活跃用户"
              value={0}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#F59E0B' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="徽章列表" bordered={false} style={{ borderRadius: 12 }}>
        <Table
          columns={columns}
          dataSource={[]}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default BadgeManagement;

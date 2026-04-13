import React from 'react';
import { Row, Col, Card, Statistic, Table, Progress } from 'antd';
import {
  TeamOutlined,
  TrophyOutlined,
  ShoppingOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useAuthStore } from '@/store/authStore';
import {
  getDashboardStats,
  getCheckInTrend,
  getPointsTrend,
  getHotProducts,
  DashboardStats,
  CheckInTrend,
  PointsTrend,
  HotProduct,
} from '@/api/reports';

const EnterpriseDashboard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId || '';

  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats', tenantId],
    queryFn: () => getDashboardStats(tenantId),
    enabled: !!tenantId,
  });

  const { data: checkInTrendData } = useQuery({
    queryKey: ['checkin-trend', tenantId],
    queryFn: () => getCheckInTrend(tenantId),
    enabled: !!tenantId,
  });

  const { data: pointsTrendData } = useQuery({
    queryKey: ['points-trend', tenantId],
    queryFn: () => getPointsTrend(tenantId),
    enabled: !!tenantId,
  });

  const { data: hotProductsData } = useQuery({
    queryKey: ['hot-products', tenantId],
    queryFn: () => getHotProducts(tenantId),
    enabled: !!tenantId,
  });

  const stats: DashboardStats = statsData?.data || {
    todayCheckInCount: 0,
    todayPointsGranted: 0,
    activeUsers: 0,
    monthExchangeCount: 0,
  };

  const checkInTrend: CheckInTrend[] = checkInTrendData?.data || [];
  const pointsTrend: PointsTrend[] = pointsTrendData?.data || [];
  const hotProducts: HotProduct[] = hotProductsData?.data || [];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>数据看板</h2>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日打卡人数"
              value={stats.todayCheckInCount}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日积分发放"
              value={stats.todayPointsGranted}
              prefix={<TrophyOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃用户"
              value={stats.activeUsers}
              prefix={<RiseOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月兑换量"
              value={stats.monthExchangeCount}
              prefix={<ShoppingOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="打卡趋势（近7天）">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={checkInTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#1890ff"
                  strokeWidth={2}
                  name="打卡人数"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="积分发放趋势（近7天）">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={pointsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="granted" fill="#52c41a" name="发放积分" />
                <Bar dataKey="consumed" fill="#ff4d4f" name="消耗积分" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title="热门商品 TOP5">
        <Table
          dataSource={hotProducts}
          rowKey="productId"
          pagination={false}
          columns={[
            { title: '排名', render: (_: unknown, __: unknown, index: number) => index + 1 },
            { title: '商品名称', dataIndex: 'productName' },
            { title: '兑换次数', dataIndex: 'exchangeCount', sorter: (a: HotProduct, b: HotProduct) => a.exchangeCount - b.exchangeCount },
            { title: '消耗积分', dataIndex: 'totalPoints' },
            {
              title: '热度',
              render: (_: unknown, record: HotProduct) => {
                const max = Math.max(...hotProducts.map((p) => p.exchangeCount), 1);
                return <Progress percent={Math.round((record.exchangeCount / max) * 100)} size="small" />;
              },
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default EnterpriseDashboard;

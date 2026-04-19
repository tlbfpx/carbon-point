import React, { useState } from 'react';
import { Row, Col, Statistic, Table, Button, Space, Segmented, TableColumnsType, message } from 'antd';
import { GlassCard } from '@carbon-point/design-system';
import {
  TeamOutlined,
  ShopOutlined,
  TrophyOutlined,
  ShoppingOutlined,
  DownloadOutlined,
  UserOutlined,
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
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import dayjs from 'dayjs';
import {
  getPlatformStats,
  getEnterpriseRanking,
  getPlatformTrend,
  exportPlatformReport,
  PlatformStats,
  EnterpriseRankingItem,
  PlatformTrend,
  TrendDimension,
} from '@/api/platform';
import { extractArray } from '@/utils';

const PlatformDashboard: React.FC = () => {
  const [dimension, setDimension] = useState<TrendDimension>('day');

  const { data: statsData } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: getPlatformStats,
  });

  const { data: rankingData } = useQuery({
    queryKey: ['enterprise-ranking'],
    queryFn: () => getEnterpriseRanking(10),
  });

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['platform-trend', dimension],
    queryFn: () => getPlatformTrend(dimension, 30),
  });

  const extractObject = <T,>(data: unknown): T => {
    if (data && typeof data === 'object' && 'data' in data) {
      return (data as { data: T }).data;
    }
    return data as T;
  };

  const stats: PlatformStats = extractObject<PlatformStats>(statsData) || {
    totalEnterprises: 0,
    activeEnterprises: 0,
    totalUsers: 0,
    totalPoints: 0,
    totalExchanges: 0,
  };

  const ranking: EnterpriseRankingItem[] = extractArray<EnterpriseRankingItem>(rankingData);
  const trend: PlatformTrend[] = extractArray<PlatformTrend>(trendData);

  const handleExport = () => {
    const startDate = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
    const endDate = dayjs().format('YYYY-MM-DD');
    exportPlatformReport(dimension, startDate, endDate).then((blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `platform-report-${dimension}-${startDate}-${endDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    }).catch(() => {
      message.error('导出失败，请重试');
    });
  };

  const dimensionLabel: Record<TrendDimension, string> = {
    day: '按日',
    week: '按周',
    month: '按月',
  };

  const rankingColumns: TableColumnsType<EnterpriseRankingItem> = [
    {
      title: '排名',
      width: 60,
      render: (_: unknown, __: unknown, index: number) => (
        <span
          style={{
            fontWeight: 'bold',
            color: index < 3 ? '#fa8c16' : undefined,
          }}
        >
          {index + 1}
        </span>
      ),
    },
    {
      title: '企业名称',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: '用户数',
      dataIndex: 'userCount',
      sorter: (a, b) => a.userCount - b.userCount,
    },
    {
      title: '总积分',
      dataIndex: 'totalPoints',
      sorter: (a, b) => a.totalPoints - b.totalPoints,
    },
    {
      title: '打卡次数',
      dataIndex: 'totalCheckIns',
      sorter: (a, b) => a.totalCheckIns - b.totalCheckIns,
    },
    {
      title: '活跃天数',
      dataIndex: 'activeDays',
      sorter: (a, b) => a.activeDays - b.activeDays,
    },
    {
      title: '企业活跃度',
      render: (_: unknown, record: EnterpriseRankingItem) => {
        const max = Math.max(...ranking.map((p) => p.totalPoints), 1);
        const pct = max === 1 && ranking.length === 0 ? 0 : Math.round((record.totalPoints / max) * 100);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                flex: 1,
                height: 6,
                background: '#f0f0f0',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: pct > 70 ? '#52c41a' : pct > 40 ? '#1890ff' : '#fa8c16',
                  borderRadius: 3,
                }}
              />
            </div>
            <span style={{ fontSize: 12, color: '#888' }}>{pct}%</span>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>平台看板</h2>
        <Space>
          <Segmented
            value={dimension}
            onChange={(val) => setDimension(val as TrendDimension)}
            options={[
              { label: dimensionLabel.day, value: 'day' },
              { label: dimensionLabel.week, value: 'week' },
              { label: dimensionLabel.month, value: 'month' },
            ]}
          />
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出报表
          </Button>
        </Space>
      </div>

      {/* Stats Row 1 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <GlassCard loading={!statsData} hoverable>
            <Statistic
              title="企业总数"
              value={stats.totalEnterprises}
              prefix={<ShopOutlined style={{ color: '#1890ff' }} />}
            />
          </GlassCard>
        </Col>
        <Col span={6}>
          <GlassCard loading={!statsData} hoverable>
            <Statistic
              title="活跃企业"
              value={stats.activeEnterprises}
              prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </GlassCard>
        </Col>
        <Col span={6}>
          <GlassCard loading={!statsData} hoverable>
            <Statistic
              title="总用户数"
              value={stats.totalUsers}
              prefix={<UserOutlined style={{ color: '#fa8c16' }} />}
            />
          </GlassCard>
        </Col>
        <Col span={6}>
          <GlassCard loading={!statsData} hoverable>
            <Statistic
              title="总积分发放"
              value={stats.totalPoints}
              prefix={<TrophyOutlined style={{ color: '#722ed1' }} />}
            />
          </GlassCard>
        </Col>
      </Row>

      {/* Stats Row 2 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <GlassCard loading={!statsData} hoverable>
            <Statistic
              title="总兑换量"
              value={stats.totalExchanges}
              prefix={<ShoppingOutlined style={{ color: '#eb2f96' }} />}
            />
          </GlassCard>
        </Col>
        <Col span={8}>
          <GlassCard loading={!statsData} hoverable>
            <Statistic
              title="平均企业用户"
              value={stats.totalEnterprises > 0 ? Math.round(stats.totalUsers / stats.totalEnterprises) : 0}
            />
          </GlassCard>
        </Col>
        <Col span={8}>
          <GlassCard loading={!statsData} hoverable>
            <Statistic
              title="企业活跃率"
              value={stats.totalEnterprises > 0 ? Math.round((stats.activeEnterprises / stats.totalEnterprises) * 100) : 0}
              suffix="%"
              valueStyle={{ color: stats.totalEnterprises > 0 && (stats.activeEnterprises / stats.totalEnterprises) > 0.5 ? '#52c41a' : '#fa8c16' }}
            />
          </GlassCard>
        </Col>
      </Row>

      {/* Trend Charts */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <GlassCard title="积分发放与消耗趋势" loading={trendLoading}>
            <ResponsiveContainer width="100%" height={280} minWidth={300}>
              <AreaChart data={trend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGranted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#52c41a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#73d13d" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorConsumed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff4d4f" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ff7875" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} min={0} />
                <Tooltip
                  formatter={(value: number) => typeof value === 'number' ? value.toLocaleString() : '--'}
                  labelFormatter={(label) => `日期: ${label}`}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="pointsGranted"
                  stroke="#52c41a"
                  fill="url(#colorGranted)"
                  name="发放积分"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
                <Area
                  type="monotone"
                  dataKey="pointsConsumed"
                  stroke="#ff4d4f"
                  fill="url(#colorConsumed)"
                  name="消耗积分"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </Col>
        <Col span={12}>
          <GlassCard title="用户与兑换量趋势" loading={trendLoading}>
            <ResponsiveContainer width="100%" height={280} minWidth={300}>
              <LineChart data={trend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} min={0} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} min={0} />
                <Tooltip
                  formatter={(value: number) => typeof value === 'number' ? value.toLocaleString() : '--'}
                  labelFormatter={(label) => `日期: ${label}`}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="users"
                  stroke="#1890ff"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                  name="新增用户"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="exchanges"
                  stroke="#eb2f96"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                  name="兑换次数"
                />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>
        </Col>
      </Row>

      {/* Enterprise Bar Chart */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <GlassCard title="企业积分排行 TOP 10" loading={!rankingData}>
            <ResponsiveContainer width="100%" height={300} minWidth={300}>
              <BarChart
                data={ranking.slice(0, 10)}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 120, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="barPoints" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#722ed1" stopOpacity={1} />
                    <stop offset="100%" stopColor="#b37feb" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="barCheckins" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#1890ff" stopOpacity={1} />
                    <stop offset="100%" stopColor="#69c0ff" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} min={0} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={120}
                  tickFormatter={(value) => value.length > 8 ? `${value.slice(0, 8)}...` : value}
                />
                <Tooltip
                  formatter={(value: number) => typeof value === 'number' ? value.toLocaleString() : '--'}
                  labelFormatter={(label) => `企业: ${label}`}
                />
                <Legend />
                <Bar
                  dataKey="totalPoints"
                  fill="url(#barPoints)"
                  name="总积分"
                  radius={[0, 4, 4, 0]}
                  minPointSize={2}
                />
                <Bar
                  dataKey="totalCheckIns"
                  fill="url(#barCheckins)"
                  name="打卡次数"
                  radius={[0, 4, 4, 0]}
                  minPointSize={2}
                />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </Col>
      </Row>

      {/* Enterprise Ranking Table */}
      <GlassCard title="企业排行详情">
        <Table
          columns={rankingColumns}
          dataSource={ranking}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      </GlassCard>
    </div>
  );
};

export default PlatformDashboard;

import React, { useState } from 'react';
import { Row, Col, Table, Button, Space, Segmented, TableColumnsType, message, Empty } from 'antd';
import { StatCard } from '@carbon-point/design-system';
import {
  TeamOutlined,
  ShopOutlined,
  TrophyOutlined,
  ShoppingOutlined,
  DownloadOutlined,
  UserOutlined,
  RiseOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
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
  ComposedChart,
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

// ============================================
// Semantic color palette (desaturated)
// ============================================
const COLORS = {
  enterprises: '#3B82F6',   // Blue
  active: '#10B981',        // Emerald
  users: '#F59E0B',         // Amber
  points: '#8B5CF6',        // Violet
  exchanges: '#EC4899',     // Pink
  average: '#6366F1',       // Indigo
  rate: '#06B6D4',          // Cyan
};

// ============================================
// Active Rate Ring (SVG progress circle)
// ============================================
const ActiveRateRing: React.FC<{ rate: number; loading?: boolean }> = ({ rate, loading }) => {
  if (loading) {
    return (
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#F1F5F9', margin: '0 auto' }} />
    );
  }

  const strokeWidth = 6;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;
  const color = rate > 70 ? '#10B981' : rate > 40 ? '#3B82F6' : '#F59E0B';

  return (
    <svg width={80} height={80} style={{ display: 'block', margin: '0 auto' }}>
      <circle
        cx={40}
        cy={40}
        r={radius}
        fill="none"
        stroke="#F1F5F9"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={40}
        cy={40}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
      <text x={40} y={36} textAnchor="middle" style={{ fontSize: 18, fontWeight: 700, fill: '#1E293B', fontFamily: "'Inter', sans-serif" }}>
        {rate}
      </text>
      <text x={40} y={52} textAnchor="middle" style={{ fontSize: 11, fill: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>
        %
      </text>
    </svg>
  );
};

// ============================================
// Chart Empty State
// ============================================
const ChartEmpty: React.FC = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 280,
    color: '#94A3B8',
  }}>
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={<span style={{ color: '#94A3B8' }}>暂无数据</span>}
    />
  </div>
);

// ============================================
// Custom Tooltip
// ============================================
const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid rgba(0, 0, 0, 0.06)',
      borderRadius: 8,
      padding: '10px 14px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    }}>
      <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>
        {label}
      </div>
      {payload.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569' }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: item.color,
            display: 'inline-block',
          }} />
          {item.name}: <strong style={{ color: '#1E293B' }}>{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</strong>
        </div>
      ))}
    </div>
  );
};

// ============================================
// Main Dashboard
// ============================================
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

  const activeRate = stats.totalEnterprises > 0
    ? Math.round((stats.activeEnterprises / stats.totalEnterprises) * 100)
    : 0;

  const avgUsers = stats.totalEnterprises > 0
    ? Math.round(stats.totalUsers / stats.totalEnterprises)
    : 0;

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

  // Chart grid style
  const chartGridStroke = 'rgba(0, 0, 0, 0.04)';
  const chartTickStyle = { fontSize: 11, fill: '#94A3B8' };

  const rankingColumns: TableColumnsType<EnterpriseRankingItem> = [
    {
      title: '排名',
      width: 60,
      render: (_: unknown, __: unknown, index: number) => {
        const colors = ['#F59E0B', '#94A3B8', '#CD7F32'];
        return (
          <span style={{
            fontWeight: 700,
            color: index < 3 ? colors[index] : '#CBD5E1',
            fontSize: index < 3 ? 16 : 14,
            fontFamily: "'Inter', sans-serif",
          }}>
            {index + 1}
          </span>
        );
      },
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
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: '总积分',
      dataIndex: 'totalPoints',
      sorter: (a, b) => a.totalPoints - b.totalPoints,
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: '打卡次数',
      dataIndex: 'totalCheckIns',
      sorter: (a, b) => a.totalCheckIns - b.totalCheckIns,
      render: (val: number) => val.toLocaleString(),
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
            <div style={{
              flex: 1,
              height: 6,
              background: '#F1F5F9',
              borderRadius: 3,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${pct}%`,
                height: '100%',
                background: pct > 70 ? '#10B981' : pct > 40 ? '#3B82F6' : '#F59E0B',
                borderRadius: 3,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: "'Inter', sans-serif", minWidth: 32 }}>{pct}%</span>
          </div>
        );
      },
    },
  ];

  // Section card wrapper style
  const sectionCardStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04)',
    padding: 20,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 600,
    color: '#1E293B',
    marginBottom: 16,
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>
            平台看板
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#94A3B8' }}>
            实时监控平台运营数据
          </p>
        </div>
        <Space size={12}>
          <Segmented
            value={dimension}
            onChange={(val) => setDimension(val as TrendDimension)}
            options={[
              { label: dimensionLabel.day, value: 'day' },
              { label: dimensionLabel.week, value: 'week' },
              { label: dimensionLabel.month, value: 'month' },
            ]}
          />
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            style={{ borderRadius: 8 }}
          >
            导出报表
          </Button>
        </Space>
      </div>

      {/* ========== Metric Cards ========== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="企业总数"
            value={stats.totalEnterprises}
            icon={<ShopOutlined />}
            iconColor={COLORS.enterprises}
            loading={!statsData}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="活跃企业"
            value={stats.activeEnterprises}
            icon={<TeamOutlined />}
            iconColor={COLORS.active}
            loading={!statsData}
            trend={stats.totalEnterprises > 0 ? {
              value: Math.round((stats.activeEnterprises / stats.totalEnterprises) * 100),
              isPositive: (stats.activeEnterprises / stats.totalEnterprises) > 0.5,
            } : undefined}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="总用户数"
            value={stats.totalUsers}
            icon={<UserOutlined />}
            iconColor={COLORS.users}
            loading={!statsData}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="总积分发放"
            value={stats.totalPoints}
            icon={<TrophyOutlined />}
            iconColor={COLORS.points}
            loading={!statsData}
          />
        </Col>
      </Row>

      {/* ========== Secondary Metrics Row ========== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={8}>
          <StatCard
            title="总兑换量"
            value={stats.totalExchanges}
            icon={<ShoppingOutlined />}
            iconColor={COLORS.exchanges}
            loading={!statsData}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            title="平均企业用户"
            value={avgUsers}
            icon={<RiseOutlined />}
            iconColor={COLORS.average}
            loading={!statsData}
          />
        </Col>
        <Col xs={24} sm={8}>
          <div style={{
            background: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>企业活跃率</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <ActiveRateRing rate={activeRate} loading={!statsData} />
              <div>
                <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>
                  活跃企业 <strong style={{ color: '#1E293B' }}>{stats.activeEnterprises}</strong> / {stats.totalEnterprises}
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: activeRate > 50 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  fontSize: 12,
                  fontWeight: 500,
                  color: activeRate > 50 ? '#10B981' : '#F59E0B',
                }}>
                  {activeRate > 50 ? '健康' : '待提升'}
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* ========== Trend Charts ========== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} lg={12}>
          <div style={sectionCardStyle}>
            <div style={sectionTitleStyle}>
              <SwapOutlined style={{ marginRight: 8, color: '#6366F1' }} />
              积分发放与消耗趋势
            </div>
            {trend.length === 0 && !trendLoading ? <ChartEmpty /> : (
              <ResponsiveContainer width="100%" height={280} minWidth={300}>
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lightGranted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="lightConsumed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={chartTickStyle}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
                    angle={-30}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tick={chartTickStyle} tickLine={false} axisLine={false} min={0} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, color: '#475569' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pointsGranted"
                    stroke="#6366F1"
                    strokeWidth={2}
                    fill="url(#lightGranted)"
                    name="发放积分"
                    activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pointsConsumed"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    fill="url(#lightConsumed)"
                    name="消耗积分"
                    activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div style={sectionCardStyle}>
            <div style={sectionTitleStyle}>
              <UserOutlined style={{ marginRight: 8, color: '#3B82F6' }} />
              用户与兑换量趋势
            </div>
            {trend.length === 0 && !trendLoading ? <ChartEmpty /> : (
              <ResponsiveContainer width="100%" height={280} minWidth={300}>
                <ComposedChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={chartTickStyle}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
                    angle={-30}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={chartTickStyle}
                    tickLine={false}
                    axisLine={false}
                    min={0}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={chartTickStyle}
                    tickLine={false}
                    axisLine={false}
                    min={0}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, color: '#475569' }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="users"
                    fill="rgba(59, 130, 246, 0.2)"
                    radius={[4, 4, 0, 0]}
                    name="新增用户"
                    maxBarSize={24}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="exchanges"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                    name="兑换次数"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </Col>
      </Row>

      {/* ========== Enterprise Ranking Bar Chart ========== */}
      <div style={{ ...sectionCardStyle, marginBottom: 32 }}>
        <div style={sectionTitleStyle}>
          <TrophyOutlined style={{ marginRight: 8, color: '#8B5CF6' }} />
          企业积分排行 TOP 10
        </div>
        {ranking.length === 0 && !rankingData ? <ChartEmpty /> : (
          <ResponsiveContainer width="100%" height={300} minWidth={300}>
            <BarChart
              data={ranking.slice(0, 10)}
              layout="vertical"
              margin={{ top: 10, right: 20, left: 100, bottom: 0 }}
            >
              <defs>
                <linearGradient id="lightBarPoints" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="lightBarCheckins" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} horizontal={false} />
              <XAxis type="number" tick={chartTickStyle} tickLine={false} axisLine={false} min={0} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ ...chartTickStyle, fontSize: 12, fill: '#475569' }}
                tickLine={false}
                axisLine={false}
                width={100}
                tickFormatter={(value: string) => value.length > 8 ? `${value.slice(0, 8)}...` : value}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: '#475569' }}
              />
              <Bar
                dataKey="totalPoints"
                fill="url(#lightBarPoints)"
                name="总积分"
                radius={[0, 4, 4, 0]}
                minPointSize={2}
                maxBarSize={16}
              />
              <Bar
                dataKey="totalCheckIns"
                fill="url(#lightBarCheckins)"
                name="打卡次数"
                radius={[0, 4, 4, 0]}
                minPointSize={2}
                maxBarSize={16}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ========== Enterprise Ranking Table ========== */}
      <div style={sectionCardStyle}>
        <div style={sectionTitleStyle}>
          <TeamOutlined style={{ marginRight: 8, color: '#3B82F6' }} />
          企业排行详情
        </div>
        <Table
          columns={rankingColumns}
          dataSource={ranking}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      </div>
    </div>
  );
};

export default PlatformDashboard;

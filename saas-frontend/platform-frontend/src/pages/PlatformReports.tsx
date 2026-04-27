import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Table, Button, DatePicker, Space, message, Empty } from 'antd';
import {
  DownloadOutlined,
  TeamOutlined,
  TrophyOutlined,
  ShoppingOutlined,
  CalendarOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
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
import type { Dayjs } from 'dayjs';
import { getPlatformStats, getEnterpriseRanking, getPlatformTrend, exportPlatformReport, PlatformStats, EnterpriseRankingItem, PlatformTrend } from '@/api/platform';
import { extractArray } from '@/utils';
import { BRAND_PALETTE } from '@carbon-point/design-system';

const { RangePicker } = DatePicker;

// Chart colors
const CHART_COLORS = {
  enterprises: BRAND_PALETTE.primary,
  points: BRAND_PALETTE.success,
  exchanges: BRAND_PALETTE.accent,
};

const PlatformReports: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  const [dimension, setDimension] = useState<'day' | 'week' | 'month'>('day');

  const startDate = dateRange?.[0]?.format('YYYY-MM-DD') || dayjs().subtract(30, 'day').format('YYYY-MM-DD');
  const endDate = dateRange?.[1]?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD');

  const { data: statsData } = useQuery({
    queryKey: ['platform-report-stats', startDate, endDate],
    queryFn: getPlatformStats,
  });

  const { data: trendData } = useQuery({
    queryKey: ['platform-report-trend', dimension, startDate, endDate],
    queryFn: () => getPlatformTrend(dimension, 30),
  });

  const { data: rankingData } = useQuery({
    queryKey: ['platform-report-ranking', startDate, endDate],
    queryFn: () => getEnterpriseRanking(20),
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

  const trend: PlatformTrend[] = extractArray<PlatformTrend>(trendData);
  const ranking: EnterpriseRankingItem[] = extractArray<EnterpriseRankingItem>(rankingData);

  const handleExport = () => {
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

  // Stat card configuration
  const statCards = [
    {
      key: 'enterprises',
      title: '企业总数',
      value: stats.totalEnterprises,
      icon: <TeamOutlined />,
      gradient: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
      color: CHART_COLORS.enterprises,
    },
    {
      key: 'users',
      title: '总用户数',
      value: stats.totalUsers,
      icon: <TeamOutlined />,
      gradient: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
      color: CHART_COLORS.points,
    },
    {
      key: 'points',
      title: '总积分发放',
      value: stats.totalPoints,
      icon: <TrophyOutlined />,
      gradient: 'linear-gradient(135deg, #fff7e6 0%, #ffd591 100%)',
      color: '#fa8c16',
    },
    {
      key: 'exchange',
      title: '总兑换量',
      value: stats.totalExchanges,
      icon: <ShoppingOutlined />,
      gradient: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
      color: CHART_COLORS.exchanges,
    },
  ];

  const rankingColumns = [
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
  ];

  return (
    <div>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>
            平台报表
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#94A3B8' }}>
            查看平台整体运营数据和趋势分析
          </p>
        </div>
        <Space size={12}>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            style={{ width: 280 }}
          />
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            导出报表
          </Button>
        </Space>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((card) => (
          <Col xs={24} sm={12} lg={6} key={card.key}>
            <Card
              bordered={false}
              style={{
                background: card.gradient,
                borderRadius: 12,
              }}
            >
              <Statistic
                title={<span style={{ color: '#475569', fontSize: 14 }}>{card.title}</span>}
                value={card.value}
                prefix={card.icon}
                valueStyle={{ color: '#1E293B', fontWeight: 700 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Trend Chart */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={24}>
          <Card
            title={<span style={{ fontSize: 15, fontWeight: 600 }}>运营趋势</span>}
            bordered={false}
            style={{ borderRadius: 12 }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.points} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={CHART_COLORS.points} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExchanges" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.exchanges} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={CHART_COLORS.exchanges} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255,255,255,0.95)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="points"
                  stroke={CHART_COLORS.points}
                  fillOpacity={1}
                  fill="url(#colorPoints)"
                  name="积分发放"
                />
                <Area
                  type="monotone"
                  dataKey="exchanges"
                  stroke={CHART_COLORS.exchanges}
                  fillOpacity={1}
                  fill="url(#colorExchanges)"
                  name="兑换量"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Enterprise Ranking */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={24}>
          <Card
            title={<span style={{ fontSize: 15, fontWeight: 600 }}>企业排行榜</span>}
            bordered={false}
            style={{ borderRadius: 12 }}
          >
            <Table
              columns={rankingColumns}
              dataSource={ranking}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              locale={{
                emptyText: <Empty description="暂无数据" />,
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PlatformReports;

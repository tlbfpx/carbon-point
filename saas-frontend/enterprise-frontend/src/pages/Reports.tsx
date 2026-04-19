import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Table, Button, DatePicker, Space, message, Empty } from 'antd';
import {
  DownloadOutlined,
  TeamOutlined,
  TrophyOutlined,
  ShoppingOutlined,
  CalendarOutlined,
  LineChartOutlined,
  RiseOutlined,
  FallOutlined,
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
import { useAuthStore } from '@/store/authStore';
import { getDashboardStats, getCheckInTrend, getPointsTrend, exportReport, DashboardStats, CheckInTrend, PointsTrend } from '@/api/reports';
import { useBranding } from '@/components/BrandingProvider';

// Chart & table accent colors
const ACCENT_COLORS = {
  blue: '#1890ff',
  green: '#52c41a',
  orange: '#fa8c16',
  purple: '#722ed1',
  red: '#ff7875',
  redDark: '#ff4d4f',
} as const;

const { RangePicker } = DatePicker;

// Gradient definitions for organic feel
const createGradient = (color1: string, color2: string, id: string) => (
  <linearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stopColor={color1} stopOpacity={0.8} />
    <stop offset="100%" stopColor={color2} stopOpacity={0.1} />
  </linearGradient>
);

const Reports: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId || '';
  const { primaryColor } = useBranding();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);

  // Digital garden color palette
  const colors = {
    primary: primaryColor,
    warmBorder: '#d4d0c8',
    bgSoft: '#faf8f5',
    textMuted: '#8a857f',
    textHeading: '#2c2825',
    gradientBlue: ['#1890ff', '#69c0ff'],
    gradientGreen: ['#52c41a', '#73d13d'],
    gradientOrange: ['#fa8c16', '#ffa940'],
    gradientPurple: ['#722ed1', '#b37feb'],
  };

  const startDate = dateRange?.[0]?.format('YYYY-MM-DD') || dayjs().subtract(30, 'day').format('YYYY-MM-DD');
  const endDate = dateRange?.[1]?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD');

  const { data: statsData } = useQuery({
    queryKey: ['report-stats', tenantId, startDate, endDate],
    queryFn: () => getDashboardStats(tenantId),
    enabled: !!tenantId,
  });

  const { data: checkInTrendData } = useQuery({
    queryKey: ['report-checkin', tenantId, startDate, endDate],
    queryFn: () => getCheckInTrend(tenantId, 30),
    enabled: !!tenantId,
  });

  const { data: pointsTrendData } = useQuery({
    queryKey: ['report-points', tenantId, startDate, endDate],
    queryFn: () => getPointsTrend(tenantId, 30),
    enabled: !!tenantId,
  });

  const extractArray = <T,>(data: unknown): T[] => {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === 'object' && 'data' in data) {
      return (data as { data: T[] }).data;
    }
    return [];
  };

  const stats: DashboardStats = (statsData as DashboardStats) || {
    todayCheckInCount: 0,
    todayPointsGranted: 0,
    activeUsers: 0,
    monthExchangeCount: 0,
  };
  const checkInTrend: CheckInTrend[] = extractArray<CheckInTrend>(checkInTrendData);
  const pointsTrend: PointsTrend[] = extractArray<PointsTrend>(pointsTrendData);

  const handleExport = (type: string) => {
    exportReport(tenantId, type, startDate, endDate).then((blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${type}-${startDate}-${endDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    }).catch(() => {
      message.error('导出失败，请重试');
    });
  };

  // Stat card configuration
  const statCards = [
    {
      key: 'checkin',
      title: '今日打卡人数',
      value: stats.todayCheckInCount,
      icon: <TeamOutlined />,
      gradient: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
      iconGradient: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
      accent: ACCENT_COLORS.blue,
    },
    {
      key: 'points',
      title: '今日积分发放',
      value: stats.todayPointsGranted,
      icon: <TrophyOutlined />,
      gradient: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
      iconGradient: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
      accent: ACCENT_COLORS.green,
    },
    {
      key: 'active',
      title: '活跃用户',
      value: stats.activeUsers,
      icon: <LineChartOutlined />,
      gradient: 'linear-gradient(135deg, #fff7e6 0%, #ffd591 100%)',
      iconGradient: 'linear-gradient(135deg, #fa8c16 0%, #ffa940 100%)',
      accent: ACCENT_COLORS.orange,
    },
    {
      key: 'exchange',
      title: '本月兑换量',
      value: stats.monthExchangeCount,
      icon: <ShoppingOutlined />,
      gradient: 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)',
      iconGradient: 'linear-gradient(135deg, #722ed1 0%, #b37feb 100%)',
      accent: ACCENT_COLORS.purple,
    },
  ];

  return (
    <div style={{ padding: '0 0 24px 0', fontFamily: 'Noto Sans SC, sans-serif' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 28,
            fontWeight: 700,
            color: colors.textHeading,
            margin: 0,
          }}>
            数据报表
          </h1>
          <p style={{ color: colors.textMuted, marginTop: 8, fontSize: 14 }}>
            查看平台运营数据趋势与分析
          </p>
        </div>
      </div>

      {/* Filter Card */}
      <Card
        style={{
          marginBottom: 24,
          borderRadius: 16,
          border: `1px solid ${colors.warmBorder}`,
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
        }}
        styles={{ body: { padding: 20 } }}
      >
        <Space size={16} wrap>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CalendarOutlined style={{ color: colors.textMuted, fontSize: 16 }} />
            <RangePicker
              value={dateRange}
              onChange={(dates) => { if (dates) setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs]); }}
              style={{
                borderRadius: 12,
                border: `1px solid ${colors.warmBorder}`,
                fontFamily: 'Noto Sans SC, sans-serif',
              }}
              suffixIcon={<CalendarOutlined style={{ color: colors.textMuted }} />}
            />
          </div>
          <div style={{ height: 32, width: 1, background: colors.warmBorder, margin: '0 8px' }} />
          <Button
            icon={<DownloadOutlined />}
            onClick={() => handleExport('checkin')}
            style={{
              borderRadius: 20,
              height: 40,
              paddingLeft: 20,
              paddingRight: 20,
              fontFamily: 'Noto Sans SC, sans-serif',
              border: `1px solid ${colors.warmBorder}`,
            }}
          >
            导出打卡报表
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => handleExport('points')}
            style={{
              borderRadius: 20,
              height: 40,
              paddingLeft: 20,
              paddingRight: 20,
              fontFamily: 'Noto Sans SC, sans-serif',
              border: `1px solid ${colors.warmBorder}`,
            }}
          >
            导出积分报表
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => handleExport('orders')}
            style={{
              borderRadius: 20,
              height: 40,
              paddingLeft: 20,
              paddingRight: 20,
              fontFamily: 'Noto Sans SC, sans-serif',
              border: `1px solid ${colors.warmBorder}`,
            }}
          >
            导出订单报表
          </Button>
        </Space>
      </Card>

      {/* Stat Summary Row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {statCards.map((card) => (
          <Col span={6} key={card.key}>
            <div
              style={{
                background: card.gradient,
                borderRadius: 16,
                padding: 24,
                border: `1px solid ${colors.warmBorder}`,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
              }}
            >
              {/* Top accent strip */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: card.iconGradient,
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Statistic
                  title={
                    <span style={{
                      fontFamily: 'Noto Sans SC, sans-serif',
                      fontSize: 13,
                      color: colors.textMuted,
                      fontWeight: 500,
                    }}>
                      {card.title}
                    </span>
                  }
                  value={card.value}
                  valueStyle={{
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: 32,
                    fontWeight: 700,
                    color: card.accent,
                  }}
                  prefix={null}
                />
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    background: card.iconGradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: 24, color: '#fff' }}>{card.icon}</span>
                </div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Charts Row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {/* Check-in Trend Chart */}
        <Col span={12}>
          <Card
            title={
              <span style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 18,
                fontWeight: 600,
                color: colors.textHeading,
              }}>
                打卡趋势
              </span>
            }
            style={{
              borderRadius: 16,
              border: `1px solid ${colors.warmBorder}`,
              boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
            }}
            styles={{ body: { padding: 24 } }}
          >
            <ResponsiveContainer width="100%" height={320} minWidth={300}>
              {checkInTrend.length > 0 ? (
                <AreaChart data={checkInTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCheckin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.gradientBlue[0]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colors.gradientBlue[1]} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.gradientGreen[0]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colors.gradientGreen[1]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.warmBorder} strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  style={{ fontFamily: 'Noto Sans SC, sans-serif', fontSize: 12 }}
                  stroke={colors.textMuted}
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12 }}
                  stroke={colors.textMuted}
                  min={0}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${colors.warmBorder}`,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                    fontFamily: 'Noto Sans SC, sans-serif',
                  }}
                  formatter={(value: number) => [typeof value === 'number' ? value.toLocaleString() : '--', '']}
                />
                <Legend
                  wrapperStyle={{
                    fontFamily: 'Noto Sans SC, sans-serif',
                    paddingTop: 16,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={colors.gradientBlue[0]}
                  fillOpacity={1}
                  fill="url(#colorCheckin)"
                  name="打卡人数"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
                <Area
                  type="monotone"
                  dataKey="totalPoints"
                  stroke={colors.gradientGreen[0]}
                  fillOpacity={1}
                  fill="url(#colorPoints)"
                  name="发放积分"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Empty description="暂无打卡数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
              )}
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Points Trend Chart */}
        <Col span={12}>
          <Card
            title={
              <span style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 18,
                fontWeight: 600,
                color: colors.textHeading,
              }}>
                积分趋势
              </span>
            }
            style={{
              borderRadius: 16,
              border: `1px solid ${colors.warmBorder}`,
              boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
            }}
            styles={{ body: { padding: 24 } }}
          >
            <ResponsiveContainer width="100%" height={320} minWidth={300}>
              {pointsTrend.length > 0 ? (
                <BarChart data={pointsTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGranted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.gradientGreen[0]} stopOpacity={1} />
                    <stop offset="100%" stopColor={colors.gradientGreen[1]} stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="barConsumed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT_COLORS.red} stopOpacity={1} />
                    <stop offset="100%" stopColor="#ffccc7" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.warmBorder} strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  style={{ fontFamily: 'Noto Sans SC, sans-serif', fontSize: 12 }}
                  stroke={colors.textMuted}
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12 }}
                  stroke={colors.textMuted}
                  min={0}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${colors.warmBorder}`,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                    fontFamily: 'Noto Sans SC, sans-serif',
                  }}
                  formatter={(value: number) => [typeof value === 'number' ? value.toLocaleString() : '--', '']}
                />
                <Legend
                  wrapperStyle={{
                    fontFamily: 'Noto Sans SC, sans-serif',
                    paddingTop: 16,
                  }}
                />
                <Bar dataKey="granted" fill="url(#barGranted)" name="发放积分" radius={[8, 8, 0, 0]} minPointSize={2} />
                <Bar dataKey="consumed" fill="url(#barConsumed)" name="消耗积分" radius={[8, 8, 0, 0]} minPointSize={2} />
              </BarChart>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Empty description="暂无积分数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
              )}
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Detail Tables Row */}
      <Row gutter={16}>
        {/* Check-in Detail Table */}
        <Col span={12}>
          <Card
            title={
              <span style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 16,
                fontWeight: 600,
                color: colors.textHeading,
              }}>
                打卡数据明细
              </span>
            }
            style={{
              borderRadius: 16,
              border: `1px solid ${colors.warmBorder}`,
              boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
            }}
            styles={{ body: { padding: 16 } }}
          >
            <Table
              dataSource={checkInTrend}
              rowKey="date"
              pagination={false}
              size="small"
              columns={[
                {
                  title: '日期',
                  dataIndex: 'date',
                  render: (text: string) => (
                    <span style={{ fontFamily: 'Noto Sans SC, sans-serif', color: colors.textHeading }}>{text}</span>
                  ),
                },
                {
                  title: '打卡人数',
                  dataIndex: 'count',
                  render: (value: number) => (
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: colors.gradientBlue[0] }}>{value}</span>
                  ),
                },
                {
                  title: '发放积分',
                  dataIndex: 'totalPoints',
                  render: (value: number) => (
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: colors.gradientGreen[0] }}>{value}</span>
                  ),
                },
              ]}
              style={{
                fontFamily: 'Noto Sans SC, sans-serif',
              }}
            />
          </Card>
        </Col>

        {/* Points Detail Table */}
        <Col span={12}>
          <Card
            title={
              <span style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 16,
                fontWeight: 600,
                color: colors.textHeading,
              }}>
                积分数据明细
              </span>
            }
            style={{
              borderRadius: 16,
              border: `1px solid ${colors.warmBorder}`,
              boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
            }}
            styles={{ body: { padding: 16 } }}
          >
            <Table
              dataSource={pointsTrend}
              rowKey="date"
              pagination={false}
              size="small"
              columns={[
                {
                  title: '日期',
                  dataIndex: 'date',
                  render: (text: string) => (
                    <span style={{ fontFamily: 'Noto Sans SC, sans-serif', color: colors.textHeading }}>{text}</span>
                  ),
                },
                {
                  title: '发放积分',
                  dataIndex: 'granted',
                  render: (value: number) => (
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: colors.gradientGreen[0] }}>{value}</span>
                  ),
                },
                {
                  title: '消耗积分',
                  dataIndex: 'consumed',
                  render: (value: number) => (
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: ACCENT_COLORS.red }}>{value}</span>
                  ),
                },
                {
                  title: '净增',
                  render: (_: unknown, record: PointsTrend) => {
                    const net = record.granted - record.consumed;
                    return (
                      <span
                        style={{
                          fontFamily: 'Outfit, sans-serif',
                          fontWeight: 600,
                          color: net >= 0 ? ACCENT_COLORS.green : ACCENT_COLORS.redDark,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {net >= 0 ? <RiseOutlined /> : <FallOutlined />}
                        {Math.abs(net)}
                      </span>
                    );
                  },
                },
              ]}
              style={{
                fontFamily: 'Noto Sans SC, sans-serif',
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Reports;

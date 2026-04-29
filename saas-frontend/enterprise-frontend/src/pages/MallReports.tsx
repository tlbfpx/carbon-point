import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Table, DatePicker, Space, Empty, Select, Statistic } from 'antd';
import {
  ShoppingOutlined,
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  BarChartOutlined,
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
  LineChart,
  Line,
} from 'recharts';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { fetchMallReports, MallReportData, ExchangeVolumeItem, PointsConsumptionItem, ProductPopularityItem } from '@/api/mall';
import { useBranding } from '@/components/BrandingProvider';

const { RangePicker } = DatePicker;

const TYPE_OPTIONS: Record<string, string> = {
  coupon: '优惠券',
  recharge: '直充',
  privilege: '权益',
};

const ACCENT_COLORS = {
  blue: '#1890ff',
  green: '#52c41a',
  orange: '#fa8c16',
  purple: '#722ed1',
  red: '#ff7875',
};

const MallReports: React.FC<{ hideHeader?: boolean }> = ({ hideHeader = false }) => {
  const { primaryColor } = useBranding();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  const [dimension, setDimension] = useState<'day' | 'week' | 'month'>('day');

  const colors = {
    warmBorder: '#d4d0c8',
    bgSoft: '#faf8f5',
    textMuted: '#8a857f',
    textHeading: '#2c2825',
  };

  const startDate = dateRange?.[0]?.format('YYYY-MM-DD') || dayjs().subtract(30, 'day').format('YYYY-MM-DD');
  const endDate = dateRange?.[1]?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD');

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['mall-reports', dimension, startDate, endDate],
    queryFn: () => fetchMallReports({ type: dimension, startDate, endDate }),
    retry: false,
  });

  // Safely extract data from response
  const getSafeData = (input: unknown): MallReportData => {
    if (!input) return { exchangeVolume: [], pointsConsumption: [], productPopularity: [] };
    // Check if it's a wrapped response { data: ... }
    const unwrapped = (input as { data?: MallReportData }).data ?? input;
    if (!unwrapped || typeof unwrapped !== 'object') {
      return { exchangeVolume: [], pointsConsumption: [], productPopularity: [] };
    }
    return {
      exchangeVolume: Array.isArray((unwrapped as MallReportData).exchangeVolume) ? (unwrapped as MallReportData).exchangeVolume : [],
      pointsConsumption: Array.isArray((unwrapped as MallReportData).pointsConsumption) ? (unwrapped as MallReportData).pointsConsumption : [],
      productPopularity: Array.isArray((unwrapped as MallReportData).productPopularity) ? (unwrapped as MallReportData).productPopularity : [],
    };
  };

  const data = getSafeData(reportData);

  // Summary stats with safety
  const totalExchanges = useMemo(() => {
    if (!Array.isArray(data.exchangeVolume)) return 0;
    return data.exchangeVolume.reduce((sum, item) => sum + ((item as any).count || (item as any).exchangeCount || 0), 0);
  }, [data.exchangeVolume]);

  const totalPointsConsumed = useMemo(() => {
    if (!Array.isArray(data.pointsConsumption)) return 0;
    return data.pointsConsumption.reduce((sum, item) => sum + ((item as any).consumed || (item as any).totalPoints || 0), 0);
  }, [data.pointsConsumption]);

  const totalPointsFromExchanges = useMemo(() => {
    if (!Array.isArray(data.exchangeVolume)) return 0;
    return data.exchangeVolume.reduce((sum, item) => sum + ((item as any).totalPoints || 0), 0);
  }, [data.exchangeVolume]);

  // Product popularity columns
  const popularityColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 60,
      render: (rank: number) => {
        const style =
          rank === 1
            ? { background: '#ffd700', color: '#fff' }
            : rank === 2
              ? { background: '#c0c0c0', color: '#fff' }
              : rank === 3
                ? { background: '#cd7f32', color: '#fff' }
                : { background: '#f0ede8', color: colors.textMuted };
        return (
          <span
            style={{
              ...style,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 14,
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {rank}
          </span>
        );
      },
    },
    {
      title: '商品名称',
      dataIndex: 'productName',
      render: (name: string) => (
        <span style={{ fontWeight: 500, color: colors.textHeading }}>{name}</span>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (type: string) => (
        <span style={{ color: colors.textMuted, fontSize: 13 }}>{TYPE_OPTIONS[type] || type}</span>
      ),
    },
    {
      title: '兑换次数',
      dataIndex: 'exchangeCount',
      width: 100,
      render: (v: number) => (
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: ACCENT_COLORS.blue }}>
          {v}
        </span>
      ),
    },
    {
      title: '消耗积分',
      dataIndex: 'totalPoints',
      width: 120,
      render: (v: number) => (
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: primaryColor }}>
          {v?.toLocaleString() ?? 0}
        </span>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 0 24px', fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)' }}>
      {/* Page Header */}
      {!hideHeader && (
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 4,
            color: colors.textHeading,
          }}
        >
          积分商城报表
        </h1>
        <p style={{ color: colors.textMuted, fontSize: 14, margin: 0 }}>
          查看积分商城兑换数据、积分消耗趋势和商品热度排名
        </p>
      </div>
      )}

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
          <Select
            value={dimension}
            onChange={setDimension}
            style={{ width: 120 }}
            options={[
              { value: 'day', label: '按天' },
              { value: 'week', label: '按周' },
              { value: 'month', label: '按月' },
            ]}
          />
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates) setDateRange(dates as [Dayjs, Dayjs]);
            }}
            style={{
              borderRadius: 12,
              border: `1px solid ${colors.warmBorder}`,
            }}
          />
        </Space>
      </Card>

      {/* Summary Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <div
            style={{
              background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
              borderRadius: 16,
              padding: 24,
              border: `1px solid ${colors.warmBorder}`,
              boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
              }}
            />
            <Statistic
              title={
                <span style={{ fontSize: 13, color: colors.textMuted, fontWeight: 500 }}>
                  兑换总量
                </span>
              }
              value={totalExchanges}
              prefix={<ShoppingOutlined style={{ fontSize: 16 }} />}
              valueStyle={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 28,
                fontWeight: 700,
                color: ACCENT_COLORS.blue,
              }}
            />
          </div>
        </Col>
        <Col span={8}>
          <div
            style={{
              background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
              borderRadius: 16,
              padding: 24,
              border: `1px solid ${colors.warmBorder}`,
              boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
              }}
            />
            <Statistic
              title={
                <span style={{ fontSize: 13, color: colors.textMuted, fontWeight: 500 }}>
                  积分消耗总额
                </span>
              }
              value={totalPointsConsumed}
              prefix={<TrophyOutlined style={{ fontSize: 16 }} />}
              valueStyle={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 28,
                fontWeight: 700,
                color: ACCENT_COLORS.green,
              }}
            />
          </div>
        </Col>
        <Col span={8}>
          <div
            style={{
              background: 'linear-gradient(135deg, #fff7e6 0%, #ffd591 100%)',
              borderRadius: 16,
              padding: 24,
              border: `1px solid ${colors.warmBorder}`,
              boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: 'linear-gradient(135deg, #fa8c16 0%, #ffa940 100%)',
              }}
            />
            <Statistic
              title={
                <span style={{ fontSize: 13, color: colors.textMuted, fontWeight: 500 }}>
                  兑换积分合计
                </span>
              }
              value={totalPointsFromExchanges}
              prefix={<BarChartOutlined style={{ fontSize: 16 }} />}
              valueStyle={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 28,
                fontWeight: 700,
                color: ACCENT_COLORS.orange,
              }}
            />
          </div>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {/* Exchange Volume Bar Chart */}
        <Col span={12}>
          <Card
            title={
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 600, color: colors.textHeading }}>
                兑换量统计
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
              {data.exchangeVolume.length > 0 ? (
                <BarChart data={data.exchangeVolume} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barExchange" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACCENT_COLORS.blue} stopOpacity={1} />
                      <stop offset="100%" stopColor="#69c0ff" stopOpacity={0.6} />
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
                    formatter={(value: number) => [
                      typeof value === 'number' ? value.toLocaleString() : '--',
                      '',
                    ]}
                  />
                  <Legend
                    wrapperStyle={{
                      fontFamily: 'Noto Sans SC, sans-serif',
                      paddingTop: 16,
                    }}
                  />
                  <Bar dataKey="count" fill="url(#barExchange)" name="兑换次数" radius={[8, 8, 0, 0]} minPointSize={2} />
                </BarChart>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Empty description="暂无兑换数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
              )}
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Points Consumption Line Chart */}
        <Col span={12}>
          <Card
            title={
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 600, color: colors.textHeading }}>
                积分消耗趋势
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
              {data.pointsConsumption.length > 0 ? (
                <LineChart data={data.pointsConsumption} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lineConsumed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
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
                    formatter={(value: number) => [
                      typeof value === 'number' ? value.toLocaleString() : '--',
                      '消耗积分',
                    ]}
                  />
                  <Legend
                    wrapperStyle={{
                      fontFamily: 'Noto Sans SC, sans-serif',
                      paddingTop: 16,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="consumed"
                    stroke={primaryColor}
                    strokeWidth={2}
                    name="消耗积分"
                    dot={{ r: 4, fill: primaryColor }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Empty description="暂无积分消耗数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
              )}
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Product Popularity Ranking */}
      <Card
        title={
          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 600, color: colors.textHeading }}>
            商品热度排行
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
          dataSource={data.productPopularity}
          rowKey="productId"
          columns={popularityColumns}
          pagination={false}
          loading={isLoading}
          locale={{ emptyText: <Empty description="暂无商品热度数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          style={{ fontFamily: 'Noto Sans SC, sans-serif' }}
        />
      </Card>
    </div>
  );
};

export default MallReports;

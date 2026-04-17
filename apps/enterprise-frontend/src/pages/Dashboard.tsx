import React from 'react';
import { Row, Col, Card, Table, Progress, Empty } from 'antd';
import {
  TeamOutlined,
  TrophyOutlined,
  ShoppingOutlined,
  RiseOutlined,
  UserOutlined,
  CheckCircleOutlined,
  FireOutlined,
  StarOutlined,
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
  Area,
  AreaChart,
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

// Chart gradient definitions
const CHART_COLORS = {
  primary: { start: '#1890ff', end: '#69c0ff' },
  secondary: { start: '#52c41a', end: '#73d13d' },
  accent: { start: '#fa8c16', end: '#ffa940' },
  tertiary: { start: '#722ed1', end: '#b37feb' },
};

const STAT_ICONS = {
  blue: { icon: <UserOutlined />, bg: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', color: '#1890ff' },
  green: { icon: <CheckCircleOutlined />, bg: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)', color: '#52c41a' },
  amber: { icon: <FireOutlined />, bg: 'linear-gradient(135deg, #fff7e6 0%, #ffd591 100%)', color: '#fa8c16' },
  purple: { icon: <StarOutlined />, bg: 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)', color: '#722ed1' },
};

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

  const stats: DashboardStats = (statsData && typeof statsData === 'object' && 'data' in statsData)
    ? (statsData as { data: DashboardStats }).data
    : (statsData as DashboardStats) || {
    todayCheckInCount: 0,
    todayPointsGranted: 0,
    activeUsers: 0,
    monthExchangeCount: 0,
  };

  const extractArray = <T,>(data: unknown): T[] => {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === 'object' && 'data' in data) {
      return (data as { data: T[] }).data;
    }
    return [];
  };

  const checkInTrend: CheckInTrend[] = extractArray<CheckInTrend>(checkInTrendData);
  const pointsTrend: PointsTrend[] = extractArray<PointsTrend>(pointsTrendData);
  const hotProducts: HotProduct[] = extractArray<HotProduct>(hotProductsData);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            fontFamily: 'var(--font-body)',
          }}
        >
          <p style={{ margin: 0, marginBottom: 4, fontSize: 12, color: '#8c8c8c' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 500,
                color: entry.color,
              }}
            >
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 4,
              height: 28,
              background: 'linear-gradient(180deg, #1890ff 0%, #69c0ff 100%)',
              borderRadius: 2,
            }}
          />
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 28,
              fontWeight: 700,
              margin: 0,
              color: '#1f1f1f',
            }}
          >
            数据概览
          </h1>
        </div>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: '#8c8c8c',
            margin: '8px 0 0 16px',
          }}
        >
          实时运营数据监控
        </p>
      </div>

      {/* Stat Cards */}
      <Row gutter={20} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-card)',
              borderTop: `3px solid transparent`,
              background: `linear-gradient(to bottom, #1890ff 3px, white 3px)`,
              transition: 'all 0.3s ease',
            }}
            styles={{
              body: { padding: '24px' },
            }}
            hoverable
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: STAT_ICONS.blue.bg,
                }}
              >
                <TeamOutlined style={{ fontSize: 24, color: STAT_ICONS.blue.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 32,
                    fontWeight: 700,
                    color: '#1f1f1f',
                    lineHeight: 1,
                  }}
                >
                  {stats.todayCheckInCount}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    color: '#8c8c8c',
                    marginTop: 8,
                  }}
                >
                  今日签到
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-card)',
              background: `linear-gradient(to bottom, ${CHART_COLORS.secondary.start} 3px, white 3px)`,
              transition: 'all 0.3s ease',
            }}
            styles={{
              body: { padding: '24px' },
            }}
            hoverable
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: STAT_ICONS.green.bg,
                }}
              >
                <TrophyOutlined style={{ fontSize: 24, color: STAT_ICONS.green.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 32,
                    fontWeight: 700,
                    color: '#1f1f1f',
                    lineHeight: 1,
                  }}
                >
                  {stats.todayPointsGranted}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    color: '#8c8c8c',
                    marginTop: 8,
                  }}
                >
                  今日积分
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-card)',
              background: `linear-gradient(to bottom, ${CHART_COLORS.accent.start} 3px, white 3px)`,
              transition: 'all 0.3s ease',
            }}
            styles={{
              body: { padding: '24px' },
            }}
            hoverable
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: STAT_ICONS.amber.bg,
                }}
              >
                <RiseOutlined style={{ fontSize: 24, color: STAT_ICONS.amber.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 32,
                    fontWeight: 700,
                    color: '#1f1f1f',
                    lineHeight: 1,
                  }}
                >
                  {stats.activeUsers}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    color: '#8c8c8c',
                    marginTop: 8,
                  }}
                >
                  活跃成员
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-card)',
              background: `linear-gradient(to bottom, ${CHART_COLORS.tertiary.start} 3px, white 3px)`,
              transition: 'all 0.3s ease',
            }}
            styles={{
              body: { padding: '24px' },
            }}
            hoverable
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: STAT_ICONS.purple.bg,
                }}
              >
                <ShoppingOutlined style={{ fontSize: 24, color: STAT_ICONS.purple.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 32,
                    fontWeight: 700,
                    color: '#1f1f1f',
                    lineHeight: 1,
                  }}
                >
                  {stats.monthExchangeCount}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    color: '#8c8c8c',
                    marginTop: 8,
                  }}
                >
                  本月兑换
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts Section */}
      <Row gutter={20} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card
            bordered={false}
            style={{
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-card)',
            }}
            styles={{
              body: { padding: '24px' },
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 3,
                    height: 20,
                    background: `linear-gradient(180deg, ${CHART_COLORS.primary.start} 0%, ${CHART_COLORS.primary.end} 100%)`,
                    borderRadius: 2,
                  }}
                />
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 16,
                    fontWeight: 600,
                    margin: 0,
                    color: '#1f1f1f',
                  }}
                >
                  签到趋势
                </h3>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: '#8c8c8c',
                    marginLeft: 4,
                  }}
                >
                  近7天
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              {checkInTrend.length > 0 ? (
                <AreaChart data={checkInTrend}>
                  <defs>
                    <linearGradient id="colorCheckIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary.start} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary.start} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    style={{ fontFamily: 'var(--font-body)', fontSize: 12 }}
                    stroke="#bfbfbf"
                  />
                  <YAxis
                    style={{ fontFamily: 'var(--font-body)', fontSize: 12 }}
                    stroke="#bfbfbf"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={CHART_COLORS.primary.start}
                    strokeWidth={2}
                    fill="url(#colorCheckIn)"
                    name="签到人数"
                  />
                </AreaChart>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Empty description="暂无签到数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
              )}
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card
            bordered={false}
            style={{
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-card)',
            }}
            styles={{
              body: { padding: '24px' },
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 3,
                    height: 20,
                    background: `linear-gradient(180deg, ${CHART_COLORS.secondary.start} 0%, ${CHART_COLORS.secondary.end} 100%)`,
                    borderRadius: 2,
                  }}
                />
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 16,
                    fontWeight: 600,
                    margin: 0,
                    color: '#1f1f1f',
                  }}
                >
                  积分趋势
                </h3>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: '#8c8c8c',
                    marginLeft: 4,
                  }}
                >
                  近7天
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              {pointsTrend.length > 0 ? (
                <BarChart data={pointsTrend} barSize={24}>
                  <defs>
                    <linearGradient id="barGranted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.secondary.start} stopOpacity={1} />
                      <stop offset="100%" stopColor={CHART_COLORS.secondary.end} stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id="barConsumed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.accent.start} stopOpacity={1} />
                      <stop offset="100%" stopColor={CHART_COLORS.accent.end} stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    style={{ fontFamily: 'var(--font-body)', fontSize: 12 }}
                    stroke="#bfbfbf"
                  />
                  <YAxis
                    style={{ fontFamily: 'var(--font-body)', fontSize: 12 }}
                    stroke="#bfbfbf"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="granted"
                    fill="url(#barGranted)"
                    name="发放积分"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="consumed"
                    fill="url(#barConsumed)"
                    name="消耗积分"
                    radius={[4, 4, 0, 0]}
                  />
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

      {/* Hot Products Table */}
      <Card
        bordered={false}
        style={{
          borderRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-card)',
        }}
        styles={{
          body: { padding: '24px' },
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 3,
                height: 20,
                background: `linear-gradient(180deg, ${CHART_COLORS.tertiary.start} 0%, ${CHART_COLORS.tertiary.end} 100%)`,
                borderRadius: 2,
              }}
            />
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 16,
                fontWeight: 600,
                margin: 0,
                color: '#1f1f1f',
              }}
            >
              热门商品
            </h3>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: '#8c8c8c',
                marginLeft: 4,
              }}
            >
              TOP5
            </span>
          </div>
        </div>
        <Table
          dataSource={hotProducts}
          rowKey="productId"
          pagination={false}
          style={{
            fontFamily: 'var(--font-body)',
          }}
          columns={[
            {
              title: '排名',
              render: (_: unknown, __: unknown, index: number) => (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 600,
                    fontSize: 14,
                    background:
                      index === 0
                        ? 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)'
                        : index === 1
                          ? 'linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%)'
                          : index === 2
                            ? 'linear-gradient(135deg, #cd7f32 0%, #e5a66b 100%)'
                            : '#f5f5f5',
                    color: index < 3 ? '#fff' : '#8c8c8c',
                  }}
                >
                  {index + 1}
                </div>
              ),
            },
            {
              title: '商品名称',
              dataIndex: 'productName',
            },
            {
              title: '兑换次数',
              dataIndex: 'exchangeCount',
              sorter: (a: HotProduct, b: HotProduct) => a.exchangeCount - b.exchangeCount,
            },
            {
              title: '消耗积分',
              dataIndex: 'totalPoints',
            },
            {
              title: '热度',
              render: (_: unknown, record: HotProduct) => {
                const max = Math.max(...hotProducts.map((p) => p.exchangeCount), 1);
                const percent = Math.round((record.exchangeCount / max) * 100);
                return (
                  <Progress
                    percent={percent}
                    strokeColor={{
                      '0%': CHART_COLORS.tertiary.start,
                      '100%': CHART_COLORS.tertiary.end,
                    }}
                    trailColor="#f5f5f5"
                    showInfo={false}
                    strokeWidth={8}
                    style={{
                      fontFamily: 'var(--font-body)',
                    }}
                  />
                );
              },
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default EnterpriseDashboard;

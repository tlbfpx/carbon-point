import React from 'react';
import { Table, Progress, Empty, Button, Flex, Typography } from 'antd';
import {
  TeamOutlined,
  TrophyOutlined,
  ShoppingOutlined,
  RiseOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useAuthStore } from '@/store/authStore';
import {
  getDashboardStats,
  getCheckInTrend,
  getPointsTrend,
  getHotProducts,
  getCrossProductOverview,
  getProductStats,
  DashboardStats,
  CheckInTrend,
  PointsTrend,
  HotProduct,
  CrossProductOverview,
  ProductStats,
} from '@/api/reports';
import {
  GlassCard,
  GlassCardStat,
  BentoGrid,
  BentoItem,
  InsightBanner,
  NaturalLanguageQuery,
  PageHeader,
} from '@carbon-point/design-system';
import type { InsightData, QueryResult } from '@carbon-point/design-system';
import { BRAND_PALETTE } from '@carbon-point/design-system';
import { extractArray } from '@/utils';

const { Text } = Typography;

// 设计系统颜色（基于 BRAND_PALETTE）
const CHART_COLORS = {
  primary: { start: BRAND_PALETTE.primary, end: BRAND_PALETTE.secondary },
  secondary: { start: BRAND_PALETTE.success, end: '#34D399' },
  accent: { start: BRAND_PALETTE.warning, end: '#FBBF24' },
  tertiary: { start: BRAND_PALETTE.accent, end: '#F472B6' },
};

// 排行榜金银铜颜色
const RANKING_COLORS = {
  gold: { start: '#FFD700', end: '#FFED4E' },
  silver: { start: '#C0C0C0', end: '#E8E8E8' },
  bronze: { start: '#CD7F32', end: '#E5A66B' },
  default: 'rgba(255,255,255,0.06)',
};

// 图标配置
const STAT_CONFIG = [
  {
    key: 'checkin',
    label: '今日签到',
    icon: <TeamOutlined />,
    color: BRAND_PALETTE.primary,
    gradient: `linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.05))`,
  },
  {
    key: 'points',
    label: '今日积分',
    icon: <TrophyOutlined />,
    color: BRAND_PALETTE.success,
    gradient: `linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(52, 211, 153, 0.05))`,
  },
  {
    key: 'users',
    label: '活跃成员',
    icon: <RiseOutlined />,
    color: BRAND_PALETTE.warning,
    gradient: `linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(251, 191, 36, 0.05))`,
  },
  {
    key: 'exchange',
    label: '本月兑换',
    icon: <ShoppingOutlined />,
    color: BRAND_PALETTE.accent,
    gradient: `linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(244, 114, 182, 0.05))`,
  },
];

// 智能洞察数据
const DEFAULT_INSIGHTS: InsightData[] = [
  {
    type: 'tip',
    title: '签到率提升机会',
    description: '周末签到率相比工作日下降 12%，可考虑增加周末专属活动',
    metrics: [
      { label: '工作日', value: '85%', trend: 'up' },
      { label: '周末', value: '73%', trend: 'down' },
    ],
    action: {
      label: '查看详情',
      onClick: () => console.log('View weekend insights'),
    },
  },
  {
    type: 'success',
    title: '本周运营数据亮眼',
    description: '连续签到 3 天以上的用户增长 18.5%',
    metrics: [{ label: '活跃用户', value: '1,247', trend: 'up' }],
  },
  {
    type: 'warning',
    title: '热门商品库存不足',
    description: '¥10 话费券仅剩 234 张，建议尽快补货',
    action: {
      label: '立即补货',
      onClick: () => console.log('Restock'),
    },
  },
];

// 自然语言查询处理器
const handleNaturalQuery = async (query: string): Promise<QueryResult> => {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const lowerQ = query.toLowerCase();

  if (lowerQ.includes('签到')) {
    return {
      title: '签到数据分析',
      summary: '今日签到人数 1,247 人，环比昨日增长 12.5%',
      insights: [
        '9:00-10:00 为签到高峰，占全天 35%',
        '连续签到 3 天以上用户占比 42%',
        '建议关注周末签到率下滑问题',
      ],
      actions: [
        { label: '查看趋势图', onClick: () => {} },
        { label: '导出数据', onClick: () => {} },
      ],
    };
  }

  if (lowerQ.includes('用户') || lowerQ.includes('新增')) {
    return {
      title: '用户增长分析',
      summary: '本周新增注册 586 人，环比增长 18.5%',
      insights: [
        '通过邀请链接注册的用户占 35%',
        '新用户 7 日留存率 62.3%',
        '广东、浙江、江苏为主要来源省份',
      ],
      actions: [
        { label: '用户画像详情', onClick: () => {} },
        { label: '设置转化漏斗', onClick: () => {} },
      ],
    };
  }

  return {
    title: '查询结果',
    summary: `关于"${query}"的分析已完成`,
    insights: ['更多详情请浏览对应模块'],
  };
};

const EnterpriseDashboard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId || '';

  // 优化：使用staleTime缓存数据，减少重复请求
  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats', tenantId],
    queryFn: () => getDashboardStats(tenantId),
    enabled: !!tenantId,
    staleTime: 30 * 1000, // 30秒
    refetchOnWindowFocus: false,
  });

  const { data: checkInTrendData } = useQuery({
    queryKey: ['checkin-trend', tenantId],
    queryFn: () => getCheckInTrend(tenantId),
    enabled: !!tenantId,
    staleTime: 60 * 1000, // 1分钟
    refetchOnWindowFocus: false,
  });

  const { data: pointsTrendData } = useQuery({
    queryKey: ['points-trend', tenantId],
    queryFn: () => getPointsTrend(tenantId),
    enabled: !!tenantId,
    staleTime: 60 * 1000, // 1分钟
    refetchOnWindowFocus: false,
  });

  const { data: hotProductsData } = useQuery({
    queryKey: ['hot-products', tenantId],
    queryFn: () => getHotProducts(tenantId),
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000, // 2分钟
    refetchOnWindowFocus: false,
  });

  // 优化：暂时禁用这两个多产品请求，它们不是必需的
  // Multi-product dashboard data - disabled for faster load
  const productOverviewData = null;
  const productStatsData = null;

  // const { data: productOverviewData } = useQuery({
  //   queryKey: ['product-overview', tenantId],
  //   queryFn: () => getCrossProductOverview(),
  //   enabled: !!tenantId,
  //   staleTime: 2 * 60 * 1000, // 2分钟
  //   refetchOnWindowFocus: false,
  // });

  // const { data: productStatsData } = useQuery({
  //   queryKey: ['product-stats', tenantId],
  //   queryFn: () => getProductStats(),
  //   enabled: !!tenantId,
  //   staleTime: 5 * 60 * 1000, // 5分钟
  //   refetchOnWindowFocus: false,
  // });

  const stats: DashboardStats = (statsData as DashboardStats) || {
    todayCheckInCount: 0,
    todayPointsGranted: 0,
    activeUsers: 0,
    monthExchangeCount: 0,
  };

  const checkInTrend: CheckInTrend[] = extractArray<CheckInTrend>(checkInTrendData);
  const pointsTrend: PointsTrend[] = extractArray<PointsTrend>(pointsTrendData);
  const hotProducts: HotProduct[] = extractArray<HotProduct>(hotProductsData);

  // Multi-product data - disabled for faster load
  const productOverview: CrossProductOverview = {
    slices: [],
    totalPoints: 0,
    participationRates: {},
    overallParticipationRate: 0,
  };
  const productList: ProductStats[] = [];
  const stackedTrendData: any[] = [];
  const allProductNames: string[] = [];

  // Product colors for multi-product charts - disabled
  const getProductColor = (_productName: string, _index: number): string => BRAND_PALETTE.primary;

  // 统计数据
  const statValues = [
    { value: stats.todayCheckInCount, trend: { value: 12.5, isPositive: true } },
    { value: stats.todayPointsGranted, trend: { value: 8.3, isPositive: true } },
    { value: stats.activeUsers, trend: { value: 5.2, isPositive: true } },
    { value: stats.monthExchangeCount, trend: { value: 3.1, isPositive: false } },
  ];

  // 图表 tooltip 样式
  const glassTooltipStyle = {
    backgroundColor: 'rgba(26, 26, 36, 0.95)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    padding: '12px 16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    fontFamily: "'Inter', sans-serif",
  };

  const GlassTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={glassTooltipStyle}>
          <p style={{ margin: 0, marginBottom: 4, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            {label}
          </p>
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
    <div>
      {/* 页面标题 - 使用新版 PageHeader */}
      <PageHeader
        title="数据概览"
        subtitle="实时运营数据监控"
        actions={
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            style={{
              background: `linear-gradient(135deg, ${BRAND_PALETTE.primary}, ${BRAND_PALETTE.secondary})`,
              border: 'none',
              borderRadius: 10,
              height: 40,
              paddingInline: 20,
            }}
          >
            导出报告
          </Button>
        }
      />

      {/* 智能洞察 Banner */}
      <div style={{ marginBottom: 24 }}>
        <InsightBanner insights={DEFAULT_INSIGHTS} mode="carousel" autoRotateInterval={6000} />
      </div>

      {/* 统计卡片 - 使用 GlassCardStat + BentoGrid */}
      <BentoGrid cols={4} gap={16} style={{ marginBottom: 24 }}>
        {STAT_CONFIG.map((config, index) => (
          <GlassCardStat
            key={config.key}
            label={config.label}
            value={typeof statValues[index]?.value === 'number' ? statValues[index].value.toLocaleString() : '--'}
            icon={
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: config.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: config.color,
                }}
              >
                {React.cloneElement(config.icon as React.ReactElement, { style: { color: config.color } })}
              </div>
            }
            trend={statValues[index].trend}
            color={config.color}
          />
        ))}
      </BentoGrid>

      {/* 多产品维度统计卡片 - 已禁用以提高加载速度 */}

      {/* 多产品图表区域 - 已禁用以提高加载速度 */}

      {/* 图表区域 - 使用 BentoGrid 实现不对称布局 */}
      <BentoGrid cols={3} gap={16} style={{ marginBottom: 24 }}>
        {/* 签到趋势 - 占 2 列 */}
        <BentoItem span={2}>
          <GlassCard hoverable>
            <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
              <Flex align="center" gap={12}>
                <div
                  style={{
                    width: 4,
                    height: 24,
                    background: `linear-gradient(180deg, ${BRAND_PALETTE.primary}, ${BRAND_PALETTE.secondary})`,
                    borderRadius: 2,
                  }}
                />
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    margin: 0,
                    color: '#fff',
                  }}
                >
                  签到趋势
                </h3>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>近7天</Text>
              </Flex>
              <Button type="link" style={{ color: BRAND_PALETTE.primary }}>
                查看更多 <ArrowRightOutlined />
              </Button>
            </Flex>

            <ResponsiveContainer width="100%" height={280}>
              {checkInTrend.length > 0 ? (
                <AreaChart data={checkInTrend}>
                  <defs>
                    <linearGradient id="glassGradientCheckIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary.start} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary.start} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }}
                    stroke="rgba(255,255,255,0.3)"
                  />
                  <YAxis
                    style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }}
                    stroke="rgba(255,255,255,0.3)"
                  />
                  <Tooltip content={<GlassTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={CHART_COLORS.primary.start}
                    strokeWidth={2}
                    fill="url(#glassGradientCheckIn)"
                    name="签到人数"
                  />
                </AreaChart>
              ) : (
                <Empty description="暂无签到数据" />
              )}
            </ResponsiveContainer>
          </GlassCard>
        </BentoItem>

        {/* 积分趋势 - 占 1 列 */}
        <BentoItem>
          <GlassCard hoverable style={{ height: '100%' }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
              <Flex align="center" gap={12}>
                <div
                  style={{
                    width: 4,
                    height: 24,
                    background: `linear-gradient(180deg, ${BRAND_PALETTE.success}, #34D399)`,
                    borderRadius: 2,
                  }}
                />
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    margin: 0,
                    color: '#fff',
                  }}
                >
                  积分概况
                </h3>
              </Flex>
            </Flex>

            <ResponsiveContainer width="100%" height={280}>
              {pointsTrend.length > 0 ? (
                <BarChart data={pointsTrend} barSize={20}>
                  <defs>
                    <linearGradient id="glassBarGranted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.secondary.start} stopOpacity={1} />
                      <stop offset="100%" stopColor={CHART_COLORS.secondary.end} stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="glassBarConsumed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.accent.start} stopOpacity={1} />
                      <stop offset="100%" stopColor={CHART_COLORS.accent.end} stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }}
                    stroke="rgba(255,255,255,0.3)"
                  />
                  <YAxis
                    style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }}
                    stroke="rgba(255,255,255,0.3)"
                  />
                  <Tooltip content={<GlassTooltip />} />
                  <Bar dataKey="granted" fill="url(#glassBarGranted)" name="发放" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="consumed" fill="url(#glassBarConsumed)" name="消耗" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <Empty description="暂无积分数据" />
              )}
            </ResponsiveContainer>
          </GlassCard>
        </BentoItem>
      </BentoGrid>

      {/* 热门商品 + 自然语言查询 - 底部区域 */}
      <BentoGrid cols={3} gap={16}>
        {/* 热门商品 - 占 2 列 */}
        <BentoItem span={2}>
          <GlassCard hoverable>
            <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
              <Flex align="center" gap={12}>
                <div
                  style={{
                    width: 4,
                    height: 24,
                    background: `linear-gradient(180deg, ${BRAND_PALETTE.accent}, #F472B6)`,
                    borderRadius: 2,
                  }}
                />
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    margin: 0,
                    color: '#fff',
                  }}
                >
                  热门商品
                </h3>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>TOP5</Text>
              </Flex>
              <Button type="link" style={{ color: BRAND_PALETTE.primary }}>
                查看全部 <ArrowRightOutlined />
              </Button>
            </Flex>

            <Table
              dataSource={hotProducts}
              rowKey="productId"
              pagination={false}
              style={{ fontFamily: "'Inter', sans-serif" }}
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
                        fontWeight: 600,
                        fontSize: 14,
                        background:
                          index === 0
                            ? `linear-gradient(135deg, ${RANKING_COLORS.gold.start}, ${RANKING_COLORS.gold.end})`
                            : index === 1
                              ? `linear-gradient(135deg, ${RANKING_COLORS.silver.start}, ${RANKING_COLORS.silver.end})`
                              : index === 2
                                ? `linear-gradient(135deg, ${RANKING_COLORS.bronze.start}, ${RANKING_COLORS.bronze.end})`
                                : RANKING_COLORS.default,
                        color: index < 3 ? '#18181B' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {index + 1}
                    </div>
                  ),
                },
                {
                  title: '商品名称',
                  dataIndex: 'productName',
                  render: (text: string) => <Text style={{ color: '#fff' }}>{text}</Text>,
                },
                {
                  title: '兑换次数',
                  dataIndex: 'exchangeCount',
                  render: (v: number) => <Text style={{ color: 'rgba(255,255,255,0.8)' }}>{v}</Text>,
                },
                {
                  title: '消耗积分',
                  dataIndex: 'totalPoints',
                  render: (v: number) => <Text style={{ color: 'rgba(255,255,255,0.8)' }}>{v}</Text>,
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
                        trailColor="rgba(255,255,255,0.06)"
                        showInfo={false}
                        strokeWidth={6}
                      />
                    );
                  },
                },
              ]}
            />
          </GlassCard>
        </BentoItem>

        {/* 自然语言查询 - 占 1 列 */}
        <BentoItem>
          <GlassCard hoverable style={{ height: '100%' }}>
            <Flex align="center" gap={12} style={{ marginBottom: 16 }}>
              <div
                style={{
                  width: 4,
                  height: 24,
                  background: `linear-gradient(180deg, ${BRAND_PALETTE.primary}, ${BRAND_PALETTE.secondary})`,
                  borderRadius: 2,
                }}
              />
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  margin: 0,
                  color: '#fff',
                }}
              >
                智能查询
              </h3>
            </Flex>
            <NaturalLanguageQuery
              onQuery={handleNaturalQuery}
              quickQueries={['今日签到数据', '本周新增用户', '热门商品排行']}
              theme="dark"
            />
          </GlassCard>
        </BentoItem>
      </BentoGrid>
    </div>
  );
};

export default EnterpriseDashboard;

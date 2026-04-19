/**
 * Carbon Point Design System - InsightBanner Component
 * 智能洞察横幅组件
 */

import React from 'react';
import { Alert, AlertProps, Typography, Button, Space } from 'antd';
import {
  BulbOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { CSSProperties } from 'react';

const { Text, Title } = Typography;

export interface InsightData {
  /**
   * 洞察类型
   */
  type: 'success' | 'warning' | 'info' | 'tip';
  /**
   * 洞察标题
   */
  title: string;
  /**
   * 洞察详情
   */
  description?: string;
  /**
   * 具体数值（可选）
   */
  metrics?: {
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
  }[];
  /**
   * 行动建议
   */
  action?: {
    label: string;
    onClick: () => void;
  };
  /**
   * 是否可关闭
   */
  closable?: boolean;
  /**
   * 关闭回调
   */
  onClose?: () => void;
}

export interface InsightBannerProps {
  /**
   * 洞察数据
   */
  insights: InsightData[];
  /**
   * 展示模式
   */
  mode?: 'single' | 'multiple' | 'carousel';
  /**
   * 自动轮播间隔（毫秒）
   */
  autoRotateInterval?: number;
  /**
   * 是否显示图标
   */
  showIcon?: boolean;
  /**
   * 主题
   */
  theme?: 'dark' | 'light';
}

/**
 * 根据类型获取图标
 */
const getIcon = (type: InsightData['type']) => {
  const iconStyle: CSSProperties = { fontSize: 18 };
  switch (type) {
    case 'success':
      return <CheckCircleOutlined style={{ ...iconStyle, color: '#10B981' }} />;
    case 'warning':
      return <WarningOutlined style={{ ...iconStyle, color: '#F59E0B' }} />;
    case 'tip':
      return <BulbOutlined style={{ ...iconStyle, color: '#6366F1' }} />;
    case 'info':
    default:
      return <ThunderboltOutlined style={{ ...iconStyle, color: '#3B82F6' }} />;
  }
};

/**
 * 根据类型获取渐变色
 */
const getGradient = (type: InsightData['type']) => {
  switch (type) {
    case 'success':
      return 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)';
    case 'warning':
      return 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)';
    case 'tip':
      return 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)';
    case 'info':
    default:
      return 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)';
  }
};

/**
 * 根据类型获取边框色
 */
const getBorderColor = (type: InsightData['type']) => {
  switch (type) {
    case 'success':
      return 'rgba(16, 185, 129, 0.3)';
    case 'warning':
      return 'rgba(245, 158, 11, 0.3)';
    case 'tip':
      return 'rgba(99, 102, 241, 0.3)';
    case 'info':
    default:
      return 'rgba(59, 130, 246, 0.3)';
  }
};

/**
 * InsightBanner - 智能洞察横幅组件
 */
export const InsightBanner: React.FC<InsightBannerProps> = ({
  insights,
  mode = 'multiple',
  showIcon = true,
  theme = 'dark',
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  // 自动轮播
  React.useEffect(() => {
    if (mode === 'carousel' && insights.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % insights.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [mode, insights.length]);

  const currentInsight = insights[currentIndex];

  if (!currentInsight) return null;

  // 渲染单个洞察
  const renderInsight = (insight: InsightData, index: number) => {
    const isActive = index === currentIndex;

    return (
      <div
        key={index}
        style={{
          background: getGradient(insight.type),
          border: `1px solid ${getBorderColor(insight.type)}`,
          borderRadius: 16,
          padding: '16px 20px',
          marginBottom: mode === 'multiple' ? 12 : 0,
          position: 'relative',
          overflow: 'hidden',
          opacity: mode === 'carousel' ? (isActive ? 1 : 0) : 1,
          transform: mode === 'carousel' ? (isActive ? 'translateY(0)' : 'translateY(10px)') : 'none',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* 背景装饰 */}
        <div
          style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: getGradient(insight.type),
            filter: 'blur(40px)',
            opacity: 0.5,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative' }}>
          {/* 图标 */}
          {showIcon && (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {getIcon(insight.type)}
            </div>
          )}

          {/* 内容 */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Title
                level={5}
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 600,
                  color: theme === 'dark' ? '#fff' : '#18181B',
                }}
              >
                {insight.title}
              </Title>
              {insight.closable && (
                <Button
                  type="text"
                  size="small"
                  onClick={insight.onClose}
                  style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.5)' }}
                >
                  ×
                </Button>
              )}
            </div>

            {insight.description && (
              <Text
                style={{
                  fontSize: 13,
                  color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                  display: 'block',
                  marginBottom: insight.metrics ? 12 : 0,
                }}
              >
                {insight.description}
              </Text>
            )}

            {/* 指标 */}
            {insight.metrics && insight.metrics.length > 0 && (
              <div style={{ display: 'flex', gap: 24, marginBottom: insight.action ? 12 : 0 }}>
                {insight.metrics.map((metric, i) => (
                  <div key={i}>
                    <Text
                      style={{
                        fontSize: 11,
                        color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {metric.label}
                    </Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: theme === 'dark' ? '#fff' : '#18181B',
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        {metric.value}
                      </Text>
                      {metric.trend && (
                        <span
                          style={{
                            fontSize: 12,
                            color:
                              metric.trend === 'up'
                                ? '#10B981'
                                : metric.trend === 'down'
                                ? '#EF4444'
                                : 'rgba(255,255,255,0.5)',
                          }}
                        >
                          {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '-'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 操作 */}
            {insight.action && (
              <Button
                type="link"
                onClick={insight.action.onClick}
                style={{
                  padding: 0,
                  height: 'auto',
                  color: '#6366F1',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {insight.action.label}
                <ArrowRightOutlined style={{ marginLeft: 4 }} />
              </Button>
            )}
          </div>
        </div>

        {/* 轮播指示器 */}
        {mode === 'carousel' && insights.length > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 6,
            }}
          >
            {insights.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentIndex(i)}
                style={{
                  width: i === currentIndex ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  background:
                    i === currentIndex
                      ? '#6366F1'
                      : 'rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return <div>{insights.map((insight, i) => renderInsight(insight, i))}</div>;
};

/**
 * 使用示例
 */
export const useInsightBanner = () => {
  const insights: InsightData[] = [
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
        onClick: () => console.log('View details'),
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
        onClick: () => console.log('restock'),
      },
    },
  ];

  return { insights, InsightBanner };
};

export default InsightBanner;

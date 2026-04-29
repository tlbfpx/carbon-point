/**
 * StatCard - Modern metric card for dashboard
 * White bg + subtle shadow, icon block, large number, trend indicator
 */

import React, { CSSProperties, useMemo } from 'react';
import { Skeleton } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

export interface StatCardProps {
  /** Metric label (e.g. "企业总数") */
  title: string;
  /** Core number value */
  value: string | number;
  /** Icon node to display */
  icon: React.ReactNode;
  /** Brand color for icon block background accent */
  iconColor: string;
  /** Optional trend data */
  trend?: {
    /** Percentage value (positive or negative) */
    value: number;
    /** Whether the trend is positive (up) or negative (down) */
    isPositive: boolean;
  };
  /** Optional suffix (e.g. "%") */
  suffix?: string;
  /** Show loading skeleton */
  loading?: boolean;
  /** Card click handler */
  onClick?: () => void;
  /** CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconColor,
  trend,
  suffix,
  loading = false,
  onClick,
  className,
  style,
}) => {
  const cardStyle = useMemo<CSSProperties>(() => ({
    background: '#ffffff',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    borderRadius: 12,
    padding: 20,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    minHeight: 140,
    ...style,
  }), [onClick, style]);

  const iconBlockStyle = useMemo<CSSProperties>(() => ({
    width: 48,
    height: 48,
    borderRadius: 12,
    background: `${iconColor}14`, // 8% opacity
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    color: iconColor,
    flexShrink: 0,
  }), [iconColor]);

  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;
    if (val >= 100000000) return `${(val / 100000000).toFixed(1)}亿`;
    if (val >= 10000) return `${(val / 10000).toFixed(1)}万`;
    return val.toLocaleString();
  };

  if (loading) {
    return (
      <div style={cardStyle} className={className}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Skeleton.Avatar active shape="square" size={48} />
          <div style={{ flex: 1 }}>
            <Skeleton active paragraph={false} title={{ width: '60%' }} />
            <Skeleton active paragraph={false} title={{ width: '40%' }} style={{ marginTop: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={cardStyle}
      className={className}
      onClick={onClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.06)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={iconBlockStyle}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13,
            color: '#94A3B8',
            marginBottom: 8,
            fontWeight: 400,
          }}>
            {title}
          </div>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#1E293B',
            fontFamily: "'Inter', 'Noto Sans SC', sans-serif",
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}>
            {formatValue(value)}
            {suffix && (
              <span style={{ fontSize: 16, fontWeight: 500, color: '#475569', marginLeft: 2 }}>{suffix}</span>
            )}
          </div>
          {trend && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 8,
              padding: '2px 8px',
              borderRadius: 6,
              background: trend.isPositive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              fontSize: 12,
              fontWeight: 500,
              color: trend.isPositive ? '#10B981' : '#EF4444',
            }}>
              {trend.isPositive ? <ArrowUpOutlined style={{ fontSize: 10 }} /> : <ArrowDownOutlined style={{ fontSize: 10 }} />}
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;

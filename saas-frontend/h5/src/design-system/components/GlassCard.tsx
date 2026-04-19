/**
 * Carbon Point Design System - GlassCard Component
 * 液态玻璃卡片组件
 */

import React, { useMemo } from 'react';
import { CSSProperties } from 'react';

export interface GlassCardProps {
  /**
   * 是否启用渐变边框
   */
  gradientBorder?: boolean;
  /**
   * 是否启用悬停动效
   */
  hoverable?: boolean;
  /**
   * 是否启用噪点纹理
   */
  noiseTexture?: boolean;
  /**
   * 自定义品牌色（会覆盖默认色）
   */
  brandColor?: string;
  /**
   * 玻璃态透明度（0-1）
   */
  glassOpacity?: number;
  /**
   * 模糊程度（px）
   */
  blurIntensity?: number;
  /**
   * 内边距
   */
  padding?: number | string;
}

/**
 * GlassCard - 液态玻璃态卡片组件
 * 基于 Ant Design Card 封装，应用 2026 前沿视觉语言
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  gradientBorder: enableGradientBorder = false,
  hoverable = true,
  noiseTexture: enableNoise = false,
  brandColor,
  glassOpacity = 0.6,
  blurIntensity = 12,
  padding = 24,
  style,
  className,
  children,
}) => {
  // 动态样式计算
  const glassStyles = useMemo(() => {
    const baseBg = brandColor
      ? `rgba(${hexToRgb(brandColor)}, ${glassOpacity * 0.15})`
      : `rgba(26, 26, 36, ${glassOpacity})`;

    const baseStyles: CSSProperties = {
      background: baseBg,
      backdropFilter: `blur(${blurIntensity}px) saturate(180%)`,
      WebkitBackdropFilter: `blur(${blurIntensity}px) saturate(180%)`,
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: 16,
      boxShadow: `
        0 8px 32px rgba(0, 0, 0, 0.3),
        0 2px 8px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.08),
        inset 0 -1px 0 rgba(0, 0, 0, 0.2)
      `,
      position: 'relative',
      overflow: 'hidden',
      padding: padding as number,
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    return baseStyles;
  }, [brandColor, glassOpacity, blurIntensity, padding]);

  // 伪元素样式（通过 CSS 变量注入）
  const pseudoElementStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};

    // 高光层
    styles['&::before'] = {
      content: '""',
      position: 'absolute' as const,
      inset: 0,
      background: `linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 50%, rgba(255, 255, 255, 0.04) 100%)`,
      borderRadius: 'inherit',
      pointerEvents: 'none' as const,
      zIndex: 0,
    };

    // 渐变边框
    if (enableGradientBorder) {
      styles['&::after'] = {
        content: '""',
        position: 'absolute' as const,
        inset: '-1px',
        borderRadius: '17px',
        padding: '1px',
        background: `linear-gradient(135deg, rgba(99, 102, 241, 0.6), rgba(139, 92, 246, 0.4), rgba(6, 182, 212, 0.5), rgba(99, 102, 241, 0.6))`,
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none' as const,
        zIndex: 0,
      };
    }

    // 噪点纹理
    if (enableNoise) {
      styles['& .cp-noise'] = {
        position: 'absolute' as const,
        inset: 0,
        background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        opacity: 0.03,
        pointerEvents: 'none' as const,
        zIndex: 1,
        mixBlendMode: 'overlay' as const,
      };
    }

    return styles;
  }, [enableGradientBorder, enableNoise]);

  // 悬停效果
  const hoverStyles: CSSProperties = hoverable
    ? {
        '&:hover': {
          border: '1px solid rgba(255, 255, 255, 0.18)',
          transform: 'translateY(-2px)',
          boxShadow: `
            0 12px 48px rgba(99, 102, 241, 0.15),
            0 4px 16px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            inset 0 -1px 0 rgba(0, 0, 0, 0.2)
          `,
        },
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }
    : {};

  // 合并所有样式
  const mergedStyles: CSSProperties = {
    ...glassStyles,
    ...pseudoElementStyles,
    ...hoverStyles,
    ...style,
  };

  // 确保内容在伪元素之上
  const contentStyle: CSSProperties = {
    position: 'relative',
    zIndex: 1,
  };

  return (
    <div
      style={mergedStyles}
      className={className}
    >
      {enableNoise && <div className="cp-noise" />}
      <div style={contentStyle}>{children}</div>
    </div>
  );
};

// 辅助函数
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '26, 26, 36';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

/**
 * GlassCard.Column - 双列布局的玻璃卡片
 */
export const GlassCardColumn: React.FC<{ left: React.ReactNode; right: React.ReactNode; ratio?: [number, number] }> = ({
  left,
  right,
  ratio = [1, 1],
}) => (
  <GlassCard padding={0} style={{ overflow: 'hidden' }}>
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: ratio[0], padding: 24, borderRight: '1px solid rgba(255,255,255,0.06)' }}>{left}</div>
      <div style={{ flex: ratio[1], padding: 24 }}>{right}</div>
    </div>
  </GlassCard>
);

/**
 * GlassCard.Stat - 统计卡片（专用于 Dashboard）
 */
export interface GlassCardStatProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
}

export const GlassCardStat: React.FC<GlassCardStatProps> = ({ label, value, icon, trend, color }) => (
  <GlassCard hoverable gradientBorder brandColor={color}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: `linear-gradient(135deg, ${color || '#6366F1'}20, ${color || '#6366F1'}10)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 600, color: '#fff', fontFamily: "'Inter', sans-serif" }}>{value}</div>
        {trend && (
          <div
            style={{
              fontSize: 12,
              color: trend.isPositive ? '#10B981' : '#EF4444',
              marginTop: 4,
            }}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </div>
  </GlassCard>
);

export default GlassCard;

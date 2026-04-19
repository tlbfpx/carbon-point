/**
 * Carbon Point Design System
 * 2026 前沿视觉 - 液态玻璃（Liquid Glass）设计系统
 *
 * @version 1.0.0
 * @description 企业级 SaaS 平台设计系统，提供现代化 UI 组件和设计令牌
 */

// ============================================================
// Theme / 设计令牌
// ============================================================

export {
  darkThemeTokens,
  lightThemeTokens,
  BRAND_PALETTE,
  FONT_FAMILY,
  BOX_SHADOWS,
} from './theme/tokens';

export {
  liquidGlassBase,
  liquidGlassHover,
  gradientBorder,
  noiseTexture,
  animatedGradientBg,
  breathingAnimation,
  floatingOrb,
  shimmerEffect,
  scrollParallax,
  glassLayerStack,
  liquidGlassStyles,
  createBrandedGlass,
  CSS_VAR_PREFIX,
} from './theme/liquid-glass';

export { hexToRgb } from './theme/liquid-glass';

// ============================================================
// Components / 组件
// ============================================================

// GlassCard - 液态玻璃卡片
export { GlassCard, GlassCardColumn, GlassCardStat } from './components/GlassCard';
export type { GlassCardProps, GlassCardStatProps } from './components/GlassCard';

// Note: AIAssistant, InsightBanner, NaturalLanguageQuery, EnterpriseLayout
// are desktop-only components (antd-based) — not included in h5 (antd-mobile)

// ============================================================
// 设计系统配置
// ============================================================

/**
 * Ant Design ConfigProvider 配置
 * 用于快速将整个应用接入设计系统
 */
export const designSystemConfig = {
  dark: {
    algorithm: 'darkAlgorithm' as const,
    token: {
      // 主色
      colorPrimary: '#6366F1',
      colorInfo: '#3B82F6',
      colorSuccess: '#10B981',
      colorWarning: '#F59E0B',
      colorError: '#EF4444',
      // 圆角
      borderRadius: 12,
      // 字体
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      // 颜色
      colorBgContainer: '#1a1a24',
      colorBgElevated: '#262630',
      colorBgLayout: '#0f0f14',
      colorBorder: 'rgba(255, 255, 255, 0.12)',
      colorText: '#ffffff',
      colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
      colorTextTertiary: 'rgba(255, 255, 255, 0.45)',
    },
    components: {
      Button: {
        primaryShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
        defaultBg: 'rgba(255, 255, 255, 0.04)',
        defaultBorderColor: 'rgba(255, 255, 255, 0.12)',
      },
      Card: {
        background: 'rgba(26, 26, 36, 0.6)',
        colorBorderSecondary: 'rgba(255, 255, 255, 0.08)',
      },
      Menu: {
        darkItemBg: 'transparent',
        darkSubMenuItemBg: 'transparent',
        darkItemSelectedBg: 'rgba(99, 102, 241, 0.15)',
        darkItemHoverBg: 'rgba(255, 255, 255, 0.04)',
      },
      Input: {
        colorBgContainer: 'rgba(0, 0, 0, 0.2)',
        colorBorder: 'rgba(255, 255, 255, 0.1)',
        activeBorderColor: '#6366F1',
        hoverBorderColor: 'rgba(99, 102, 241, 0.5)',
      },
      Modal: {
        contentBg: 'rgba(15, 15, 20, 0.95)',
        headerBg: 'rgba(15, 15, 20, 0.95)',
      },
    },
  },
  light: {
    algorithm: 'defaultAlgorithm' as const,
    token: {
      colorPrimary: '#6366F1',
      colorInfo: '#3B82F6',
      colorSuccess: '#10B981',
      colorWarning: '#F59E0B',
      colorError: '#EF4444',
      borderRadius: 12,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      colorBgContainer: '#ffffff',
      colorBgElevated: '#ffffff',
      colorBgLayout: '#f5f5f5',
      colorBorder: 'rgba(0, 0, 0, 0.08)',
      colorText: '#18181B',
      colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
      colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
    },
    components: {
      Button: {
        primaryShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
      },
    },
  },
};

/**
 * 全局 CSS 样式（可注入到 index.html 或全局样式文件）
 */
export const globalStyles = `
  /* 字体平滑 */
  * {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* 自定义滚动条 - 暗色 */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  /* 布局动画 */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  /* 液态玻璃类 */
  .cp-glass {
    background: rgba(26, 26, 36, 0.6);
    backdrop-filter: blur(12px) saturate(180%);
    -webkit-backdrop-filter: blur(12px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    position: relative;
    overflow: hidden;
  }

  .cp-glass:hover {
    border-color: rgba(255, 255, 255, 0.18);
    transform: translateY(-2px);
    box-shadow: 0 12px 48px rgba(99, 102, 241, 0.15), 0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }

  /* 渐变边框 */
  .cp-glass-gradient-border {
    position: relative;
  }

  .cp-glass-gradient-border::before {
    content: '';
    position: absolute;
    inset: 0;
    padding: 1px;
    border-radius: inherit;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.6), rgba(139, 92, 246, 0.4), rgba(6, 182, 212, 0.5));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  /* 动态背景 */
  .cp-bg-animated {
    background: linear-gradient(-45deg, #0f0f14, #1a1a24, #0f0f14, #1a1a24);
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
  }

  /* 呼吸动画 */
  .cp-breathe {
    animation: cp-breathing 3s ease-in-out infinite;
  }

  /* 悬浮球 */
  .cp-orb {
    position: relative;
  }

  .cp-orb::before {
    content: '';
    position: absolute;
    width: 60%;
    height: 60%;
    top: 20%;
    left: 20%;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.4), rgba(139, 92, 246, 0.2), transparent 70%);
    filter: blur(20px);
    animation: cp-float 6s ease-in-out infinite;
  }
`;

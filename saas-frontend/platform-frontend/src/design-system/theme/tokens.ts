/**
 * Carbon Point Design System - Design Tokens
 * 2026 前沿美学：液态玻璃（Liquid Glass）视觉语言
 */

import type { ThemeConfig } from 'antd';

// ============================================
// 品牌色板（可动态替换）
// ============================================
export const BRAND_PALETTE = {
  // 主品牌色
  primary: '#6366F1',        // Indigo 柔和版
  secondary: '#8B5CF6',      // Violet
  accent: '#06B6D4',         // Cyan 强调色

  // 渐变色组合
  gradientPrimary: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #06B6D4 100%)',
  gradientSecondary: 'linear-gradient(160deg, #1e1e2e 0%, #2d2d44 100%)',
  gradientGlass: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.08) 50%, rgba(6, 182, 212, 0.12) 100%)',

  // 暗色主题背景
  darkBg: '#0F0F14',
  darkSurface: '#1A1A24',
  darkCard: 'rgba(26, 26, 36, 0.7)',

  // 亮色主题背景
  lightBg: '#F8F7F4',
  lightSurface: '#FFFFFF',
  lightCard: 'rgba(255, 255, 255, 0.7)',

  // 语义色
  success: '#10B981',        // Emerald
  warning: '#F59E0B',        // Amber
  error: '#EF4444',          // Red
  info: '#3B82F6',           // Blue
} as const;

// ============================================
// 暗色主题 Tokens（首要设计目标）
// ============================================
export const darkThemeTokens = {
  // 品牌色
  colorPrimary: BRAND_PALETTE.primary,
  colorSuccess: BRAND_PALETTE.success,
  colorWarning: BRAND_PALETTE.warning,
  colorError: BRAND_PALETTE.error,
  colorInfo: BRAND_PALETTE.info,

  // 背景与表面
  colorBgBase: BRAND_PALETTE.darkBg,
  colorBgContainer: BRAND_PALETTE.darkCard,
  colorBgElevated: 'rgba(42, 42, 58, 0.9)',
  colorBgLayout: BRAND_PALETTE.darkBg,
  colorBgSpotlight: 'rgba(99, 102, 241, 0.12)',

  // 文字颜色
  colorText: '#E4E4E7',
  colorTextSecondary: '#A1A1AA',
  colorTextTertiary: '#71717A',
  colorTextQuaternary: '#52525B',

  // 边框与分割
  colorBorder: 'rgba(255, 255, 255, 0.08)',
  colorBorderSecondary: 'rgba(255, 255, 255, 0.04)',

  // 液态玻璃效果
  colorGlassBg: 'rgba(26, 26, 36, 0.6)',
  colorGlassBorder: 'rgba(255, 255, 255, 0.12)',
  colorGlassHighlight: 'rgba(255, 255, 255, 0.06)',

  // 圆角系统 - 更大更现代
  borderRadius: 16,
  borderRadiusLG: 24,
  borderRadiusSM: 8,
  borderRadiusXS: 4,

  // 字体系统
  fontFamily: "'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif",
  fontFamilyCode: "'JetBrains Mono', 'Fira Code', monospace",
  fontSize: 14,
  fontSizeHeading1: 38,
  fontSizeHeading2: 30,
  fontSizeHeading3: 24,
  fontSizeHeading4: 20,
  fontSizeHeading5: 16,

  // 行高
  lineHeight: 1.6,
  lineHeightHeading1: 1.2,
  lineHeightHeading2: 1.3,
  lineHeightHeading3: 1.4,

  // 阴影系统 - 玻璃态阴影
  boxShadow: `
    0 4px 24px rgba(0, 0, 0, 0.4),
    0 1px 2px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05)
  `,
  boxShadowSecondary: `
    0 8px 32px rgba(0, 0, 0, 0.5),
    0 2px 8px rgba(0, 0, 0, 0.3)
  `,
  // 玻璃态专用阴影
  boxShadowGlass: `
    0 8px 32px rgba(0, 0, 0, 0.3),
    0 2px 8px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2)
  `,
  boxShadowGlassHover: `
    0 12px 48px rgba(99, 102, 241, 0.15),
    0 4px 16px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2)
  `,

  // 间距
  padding: 16,
  paddingLG: 24,
  paddingSM: 12,
  paddingXS: 8,
  paddingXXS: 4,

  margin: 16,
  marginLG: 24,
  marginSM: 12,
  marginXS: 8,

  // 控制项
  controlHeight: 40,
  controlHeightLG: 48,
  controlHeightSM: 32,

  // 动画
  motionDurationFast: '0.15s',
  motionDurationMid: '0.25s',
  motionDurationSlow: '0.4s',
  motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  motionEaseOut: 'cubic-bezier(0, 0, 0.2, 1)',
  motionEaseIn: 'cubic-bezier(0.4, 0, 1, 1)',

  // Z-Index 层级
  zIndexBase: 0,
  zIndexPopupBase: 1000,
  zIndexDrawer: 1100,
  zIndexModal: 1200,
  zIndexFloatButton: 1300,
};

// ============================================
// 亮色主题 Tokens（现代轻量商务风）
// ============================================
export const lightThemeTokens = {
  ...darkThemeTokens,

  // 品牌色
  colorPrimary: BRAND_PALETTE.primary,
  colorSuccess: '#10B981',
  colorWarning: '#F59E0B',
  colorError: '#EF4444',
  colorInfo: '#3B82F6',

  // 背景层级 — 三层灰阶
  colorBgBase: '#FFFFFF',
  colorBgContainer: '#FFFFFF',
  colorBgElevated: '#FFFFFF',
  colorBgLayout: '#F5F5F7',        // 页面底层：冷调浅灰
  colorBgSpotlight: 'rgba(99, 102, 241, 0.06)',

  // 文字层级 — 四级 slate 灰阶
  colorText: '#1E293B',             // 标题：深 slate
  colorTextSecondary: '#475569',    // 正文：中 slate
  colorTextTertiary: '#94A3B8',     // 辅助：浅 slate
  colorTextQuaternary: '#CBD5E1',   // 禁用：极浅 slate

  // 边框
  colorBorder: 'rgba(0, 0, 0, 0.06)',
  colorBorderSecondary: 'rgba(0, 0, 0, 0.03)',

  // 圆角 — 12-16px 柔和圆角
  borderRadius: 12,
  borderRadiusLG: 16,
  borderRadiusSM: 8,
  borderRadiusXS: 4,

  // 字体
  fontFamily: "'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif",

  // 亮色玻璃效果 — 不再使用深色玻璃
  colorGlassBg: 'rgba(255, 255, 255, 0.95)',
  colorGlassBorder: 'rgba(0, 0, 0, 0.06)',
  colorGlassHighlight: 'rgba(255, 255, 255, 1)',

  // 阴影系统 — 极淡柔和
  boxShadow: `
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 1px 2px rgba(0, 0, 0, 0.02)
  `,
  boxShadowSecondary: `
    0 1px 3px rgba(0, 0, 0, 0.06),
    0 4px 12px rgba(0, 0, 0, 0.04)
  `,
  // 卡片阴影
  boxShadowGlass: `
    0 1px 3px rgba(0, 0, 0, 0.06),
    0 4px 12px rgba(0, 0, 0, 0.04)
  `,
  // 卡片悬停阴影
  boxShadowGlassHover: `
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 8px 24px rgba(0, 0, 0, 0.06)
  `,
};

// ============================================
// 组件级别覆盖
// ============================================
export const componentTokens = {
  // 按钮
  Button: {},

  // 菜单
  Menu: {},

  // 输入框
  Input: {},

  // 模态框
  Modal: {},

  // 抽屉
  Drawer: {
    colorBgElevated: BRAND_PALETTE.darkSurface,
  },
};

// ============================================
// 字体
// ============================================
export const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

// ============================================
// 阴影系统
// ============================================
export const BOX_SHADOWS = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.15)',
  md: '0 8px 32px rgba(0, 0, 0, 0.3)',
  lg: '0 12px 48px rgba(0, 0, 0, 0.4)',
  glass: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  glow: '0 0 20px rgba(99, 102, 241, 0.4)',
} as const;

// ============================================
// 导出完整主题配置
// ============================================
export const createThemeConfig = (algorithm: 'dark' | 'light'): ThemeConfig => ({
  token: algorithm === 'dark' ? darkThemeTokens : lightThemeTokens,
  components: componentTokens,
  algorithm: algorithm === 'dark'
    ? undefined // 使用暗色算法
    : undefined, // 使用亮色算法
  cssVar: {
    key: 'carbon-design',
  },
});

export default {
  darkTheme: createThemeConfig('dark'),
  lightTheme: createThemeConfig('light'),
  tokens: {
    dark: darkThemeTokens,
    light: lightThemeTokens,
  },
  palette: BRAND_PALETTE,
};

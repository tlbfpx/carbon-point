/**
 * Carbon Point Design System - Liquid Glass Effects
 * 2026 年前沿视觉：液态玻璃（Liquid Glass）效果
 */

/**
 * CSS 变量前缀
 */
export const CSS_VAR_PREFIX = '--cp-glass';

/**
 * 液态玻璃效果基础样式
 */
export const liquidGlassBase = {
  // 背景
  background: `rgba(var(--glass-rgb, 26, 26, 36), 0.6)`,
  backdropFilter: 'blur(12px) saturate(180%)',
  WebkitBackdropFilter: 'blur(12px) saturate(180%)',

  // 边框
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '16px',

  // 阴影
  boxShadow: `
    0 8px 32px rgba(0, 0, 0, 0.3),
    0 2px 8px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2)
  `,

  // 渐变叠加层
  position: 'relative' as const,
  overflow: 'hidden' as const,

  '&::before': {
    content: '""',
    position: 'absolute' as const,
    inset: 0,
    background: `linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.08) 0%,
      rgba(255, 255, 255, 0.02) 50%,
      rgba(255, 255, 255, 0.04) 100%
    )`,
    borderRadius: 'inherit',
    pointerEvents: 'none' as const,
    zIndex: 0,
  },

  '& > *': {
    position: 'relative' as const,
    zIndex: 1,
  },
};

/**
 * 液态玻璃悬停效果
 */
export const liquidGlassHover = {
  // 高光增强
  '&::after': {
    content: '""',
    position: 'absolute' as const,
    inset: '-1px',
    background: `linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.2) 0%,
      rgba(139, 92, 246, 0.1) 50%,
      rgba(6, 182, 212, 0.15) 100%
    )`,
    borderRadius: 'inherit',
    opacity: 0,
    transition: 'opacity 0.25s ease',
    pointerEvents: 'none' as const,
    zIndex: 0,
  },

  '&:hover': {
    border: '1px solid rgba(255, 255, 255, 0.18)',
    boxShadow: `
      0 12px 48px rgba(99, 102, 241, 0.15),
      0 4px 16px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.12),
      inset 0 -1px 0 rgba(0, 0, 0, 0.2)
    `,
    transform: 'translateY(-2px)',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',

    '&::after': {
      opacity: 1,
    },
  },
};

/**
 * 渐变边框效果
 */
export const gradientBorder = {
  position: 'relative' as const,

  '&::before': {
    content: '""',
    position: 'absolute' as const,
    inset: 0,
    padding: '1px',
    borderRadius: 'inherit',
    background: `linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.6) 0%,
      rgba(139, 92, 246, 0.4) 30%,
      rgba(6, 182, 212, 0.5) 70%,
      rgba(99, 102, 241, 0.6) 100%
    )`,
    WebkitMask:
      'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
    pointerEvents: 'none' as const,
    zIndex: 0,
  },
};

/**
 * 噪点纹理效果
 */
export const noiseTexture = {
  '&::after': {
    content: '""',
    position: 'absolute' as const,
    inset: 0,
    background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
    opacity: 0.03,
    pointerEvents: 'none' as const,
    zIndex: 1,
    mixBlendMode: 'overlay' as const,
  },
};

/**
 * 动态背景渐变
 */
export const animatedGradientBg = {
  background: `
    linear-gradient(
      -45deg,
      rgba(15, 15, 20, 1) 0%,
      rgba(26, 26, 36, 0.95) 25%,
      rgba(15, 15, 20, 1) 50%,
      rgba(26, 26, 36, 0.95) 75%,
      rgba(15, 15, 20, 1) 100%
    )
  `,
  backgroundSize: '400% 400%',
  animation: 'gradientShift 15s ease infinite',
};

/**
 * 呼吸动画效果（用于 AI 助手）
 */
export const breathingAnimation = {
  animation: 'breathing 3s ease-in-out infinite',

  '@keyframes breathing': {
    '0%, 100%': {
      transform: 'scale(1)',
      opacity: 0.9,
    },
    '50%': {
      transform: 'scale(1.05)',
      opacity: 1,
    },
  },
};

/**
 * 悬浮球效果
 */
export const floatingOrb = {
  position: 'relative' as const,

  '&::before': {
    content: '""',
    position: 'absolute' as const,
    width: '60%',
    height: '60%',
    top: '20%',
    left: '20%',
    borderRadius: '50%',
    background: `radial-gradient(
      circle at 30% 30%,
      rgba(99, 102, 241, 0.4) 0%,
      rgba(139, 92, 246, 0.2) 40%,
      transparent 70%
    )`,
    filter: 'blur(20px)',
    animation: 'float 6s ease-in-out infinite',
  },

  '@keyframes float': {
    '0%, 100%': {
      transform: 'translateY(0) rotate(0deg)',
    },
    '50%': {
      transform: 'translateY(-10px) rotate(5deg)',
    },
  },
};

/**
 * 微光扫射效果（用于 Skeleton）
 */
export const shimmerEffect = {
  position: 'relative' as const,
  overflow: 'hidden' as const,

  '&::after': {
    content: '""',
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent)',
    transform: 'translateX(-100%)',
    animation: 'shimmer 2s infinite',
  },

  '@keyframes shimmer': {
    '100%': {
      transform: 'translateX(100%)',
    },
  },
};

/**
 * 滚动视差效果
 */
export const scrollParallax = {
  transition: 'transform 0.1s ease-out',

  '&[data-scrolled="true"]': {
    transform: 'translateY(-5px)',
  },
};

/**
 * 玻璃态模糊层叠
 */
export const glassLayerStack = [
  // 背景层
  {
    position: 'absolute' as const,
    inset: 0,
    background: `linear-gradient(180deg, rgba(15, 15, 20, 0.8) 0%, rgba(26, 26, 36, 0.6) 100%)`,
    backdropFilter: 'blur(4px)',
    zIndex: 0,
  },
  // 内容层
  {
    position: 'relative' as const,
    zIndex: 1,
  },
  // 顶层光泽
  {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%)',
    pointerEvents: 'none' as const,
    zIndex: 2,
  },
];

/**
 * 导出完整 CSS 样式对象
 */
export const liquidGlassStyles = `
  /* 液态玻璃容器 */
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

  .cp-glass::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 50%, rgba(255, 255, 255, 0.04) 100%);
    border-radius: inherit;
    pointer-events: none;
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
    animation: cp-gradient-shift 15s ease infinite;
  }

  @keyframes cp-gradient-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  /* 呼吸动画 */
  .cp-breathe {
    animation: cp-breathing 3s ease-in-out infinite;
  }

  @keyframes cp-breathing {
    0%, 100% { transform: scale(1); opacity: 0.9; }
    50% { transform: scale(1.05); opacity: 1; }
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

  @keyframes cp-float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-10px) rotate(5deg); }
  }
`;

/**
 * 生成带品牌色的玻璃态样式
 */
export const createBrandedGlass = (primaryColor: string) => ({
  background: `rgba(${hexToRgb(primaryColor)}, 0.1)`,
  backdropFilter: 'blur(12px)',
  border: `1px solid rgba(${hexToRgb(primaryColor)}, 0.2)`,
  boxShadow: `0 8px 32px rgba(${hexToRgb(primaryColor)}, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
});

/**
 * 辅助函数：Hex 转 RGB
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '26, 26, 36';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

export { hexToRgb };

# Carbon Point 设计系统迁移指南

## 概述

本指南帮助您将现有企业后台管理系统 (`enterprise-frontend`) 从 Ant Design 5 默认样式迁移到 Carbon Point 设计系统 v1.0.0。

**迁移时间预估**: 2-4 小时（取决于页面数量）
**破坏性变更**: 无（所有组件均提供向后兼容）

---

## 设计系统亮点

- **液态玻璃（Liquid Glass）** — 2026 前沿视觉：毛玻璃质感、渐变边框、流光动效
- **深色模式优先** — 默认深色主题，辅以亮色模式
- **AI 原生组件** — AIAssistant、NaturalLanguageQuery、InsightBanner 开箱即用
- **企业级布局** — EnterpriseLayout 提供完整后台框架

---

## 迁移步骤

### Step 1: 安装设计系统包

```bash
cd apps/enterprise-frontend
pnpm add @carbon-point/design-system
```

### Step 2: 配置 ConfigProvider

在 `src/App.tsx` 或 `src/main.tsx` 中引入设计系统配置：

```tsx
import { ConfigProvider, theme } from 'antd';
import { designSystemConfig } from '@carbon-point/design-system';

function App() {
  return (
    <ConfigProvider theme={designSystemConfig.dark}>
      {/* 您的应用内容 */}
    </ConfigProvider>
  );
}
```

### Step 3: 全局样式注入

在 `src/main.tsx` 或 `src/index.tsx` 入口文件中：

```tsx
import { globalStyles } from '@carbon-point/design-system';

// 注入全局样式（一次性）
const styleEl = document.createElement('style');
styleEl.textContent = globalStyles;
document.head.appendChild(styleEl);
```

或在 `index.html` 中引入 CDN 版本（推荐用于快速体验）。

---

## 组件替换清单

### 优先级 P0 — 核心视觉升级

| 现有组件 | 替换为 | 说明 |
|----------|--------|------|
| `<Card>` | `<GlassCard>` | 液态玻璃卡片，支持 gradientBorder、hoverable |
| 默认 Layout | `<EnterpriseLayout>` | 完整后台框架，含侧边栏、头部、AI 助手 |

### 优先级 P1 — 交互体验升级

| 现有组件 | 替换为 | 说明 |
|----------|--------|------|
| `<Table>` | `<Table>` + glass 样式 | 继续使用 antd Table，配合 GlassCard 包裹 |
| `<Modal>` | `<Modal>` | antd Modal，通过 ConfigProvider 统一样式 |
| `<Input>` | `<Input>` | antd Input，通过 ConfigProvider 统一样式 |

### 优先级 P2 — AI 增强（可选）

| 新增组件 | 说明 |
|----------|------|
| `<AIAssistant>` | 右下角悬浮 AI 助手 |
| `<NaturalLanguageQuery>` | 自然语言数据查询组件 |
| `<InsightBanner>` | 智能洞察横幅，支持轮播 |

---

## 组件使用示例

### GlassCard

```tsx
import { GlassCard } from '@carbon-point/design-system';

// 基础用法
<GlassCard>
  <p>内容</p>
</GlassCard>

// 带渐变边框
<GlassCard gradientBorder hoverable>
  <p>带边框和悬停效果</p>
</GlassCard>

// 统计卡片
<GlassCardStat
  label="今日签到"
  value="1,247"
  icon={<CheckCircleOutlined />}
  trend={{ value: 12.5, isPositive: true }}
  color="#6366F1"
/>
```

### EnterpriseLayout

```tsx
import { EnterpriseLayout } from '@carbon-point/design-system';

<EnterpriseLayout
  brandName="Carbon Point"
  selectedKeys={['dashboard']}
  user={{
    name: '管理员',
    role: '超级管理员',
  }}
  notificationCount={3}
  insights={[
    {
      type: 'tip',
      title: '签到率提升机会',
      description: '周末签到率相比工作日下降 12%',
      metrics: [
        { label: '工作日', value: '85%', trend: 'up' },
        { label: '周末', value: '73%', trend: 'down' },
      ],
    },
  ]}
  onMenuClick={(key) => console.log('Navigate to:', key)}
  onLogout={() => navigate('/login')}
>
  {/* 页面内容 */}
  <DashboardPage />
</EnterpriseLayout>
```

### AIAssistant

```tsx
import { AIAssistant } from '@carbon-point/design-system';

// 基础用法（已在 EnterpriseLayout 中内置）
// 如需单独使用：
<AIAssistant
  defaultOpen={false}
  quickQuestions={['今日概览', '用户趋势', '热门商品']}
  onSendMessage={async (msg) => {
    // 调用您的 AI API
    const res = await api.post('/ai/chat', { message: msg });
    return res.data.reply;
  }}
/>
```

### NaturalLanguageQuery

```tsx
import { NaturalLanguageQuery } from '@carbon-point/design-system';

<NaturalLanguageQuery
  onQuery={async (query) => {
    const res = await api.get('/analytics/nl', { params: { q: query } });
    return res.data;
  }}
  quickQueries={['今日签到数据', '本周新增用户']}
/>
```

---

## 主题定制

### 方式一：使用预设配置

```tsx
import { designSystemConfig } from '@carbon-point/design-system';

// 暗色主题（默认）
<ConfigProvider theme={designSystemConfig.dark}>

// 亮色主题
<ConfigProvider theme={designSystemConfig.light}>
```

### 方式二：自定义 Token

```tsx
<ConfigProvider
  theme={{
    algorithm: theme.darkAlgorithm,
    token: {
      colorPrimary: '#8B5CF6', // 替换主色
      borderRadius: 8,         // 自定义圆角
    },
  }}
>
```

### 方式三：自定义品牌色

```tsx
<GlassCard brandColor="#10B981" gradientBorder>
  <p>使用绿色品牌</p>
</GlassCard>
```

---

## 设计令牌参考

### 颜色系统

```ts
// 主色
colorPrimary: '#6366F1'  // 靛蓝紫

// 功能色
colorSuccess: '#10B981'  // 翠绿
colorWarning: '#F59E0B'  // 琥珀
colorError: '#EF4444'    // 红色
colorInfo: '#3B82F6'     // 蓝色

// 渐变
gradientPrimary: 'linear-gradient(135deg, #6366F1, #8B5CF6)'
gradientAccent: 'linear-gradient(135deg, #06B6D4, #10B981)'
```

### 字体

```ts
fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
```

### 阴影

```ts
shadowSm: '0 2px 8px rgba(0, 0, 0, 0.15)'
shadowMd: '0 8px 32px rgba(0, 0, 0, 0.3)'
shadowLg: '0 12px 48px rgba(0, 0, 0, 0.4)'
shadowGlass: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
```

---

## 布局系统

### EnterpriseLayout 结构

```
┌─────────────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌────────────────────────────────────────────┐ │
│ │          │ │ Header                                     │ │
│ │  Sider   │ │  [≡] [Logo] Brand    [Actions] [🔔] [Avatar]│ │
│ │          │ ├────────────────────────────────────────────┤ │
│ │  Logo    │ │ Insight Banner (可选)                      │ │
│ │  ────    │ ├────────────────────────────────────────────┤ │
│ │  Menu    │ │                                            │ │
│ │  Item    │ │ Content Area                               │ │
│ │  Item    │ │                                            │ │
│ │  Item ▼  │ │                                            │ │
│ │    ├─    │ │                                            │ │
│ │    └─    │ │                                            │ │
│ │          │ ├────────────────────────────────────────────┤ │
│ │          │ │ Footer                                     │ │
│ └──────────┘ └────────────────────────────────────────────┘ │
│                                                   [🤖 AI]   │
└─────────────────────────────────────────────────────────────┘
```

### Bento Grid 布局

```tsx
import { BentoGrid, BentoItem, GlassCard } from '@carbon-point/design-system';

<BentoGrid cols={3} gap={16}>
  <BentoItem span={2}>
    <GlassCard>主要内容（占 2 列）</GlassCard>
  </BentoItem>
  <BentoItem>
    <GlassCard>侧边栏（1 列）</GlassCard>
  </BentoItem>
  <BentoItem rowSpan={2}>
    <GlassCard>长卡片（占 2 行）</GlassCard>
  </BentoItem>
</BentoGrid>
```

---

## 常见问题

### Q: 迁移会影响现有功能吗？

**A**: 不会。设计系统只是改变了视觉呈现，API 和业务逻辑完全不受影响。

### Q: 可以只迁移部分页面吗？

**A**: 可以。ConfigProvider 支持嵌套，可以在特定区域使用不同主题。

### Q: 如何在迁移过程中验证？

**A**: 建议逐页面迁移，每迁移一个页面后刷新浏览器验证。

### Q: 旧组件还能用吗？

**A**: 可以。所有 antd 组件继续可用，只是视觉上使用设计系统的 Token。

---

## 更新日志

### v1.0.0 (2026-04-18)

- ✨ 初始发布
- 🎨 液态玻璃视觉效果
- 🤖 AI 原生组件（AIAssistant, NaturalLanguageQuery, InsightBanner）
- 🏢 EnterpriseLayout 企业级布局
- 🎯 设计令牌系统
- 🌙 深色/亮色主题支持

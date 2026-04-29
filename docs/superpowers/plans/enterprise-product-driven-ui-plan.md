# Enterprise Admin Product-Driven UI — Implementation Plan

**Based on spec**: `docs/superpowers/specs/2026-04-28-enterprise-product-driven-ui-design.md`

---

## Phase 0: Prerequisites (do first, no dependencies)

### P0-1. Add `hideHeader` prop to existing page components

Each of these full-page components renders a `<div style={{ marginBottom: 24 }}>` page header block. Add `hideHeader?: boolean` prop and conditionally skip it.

**Files to modify**:

| File | Change |
|------|--------|
| `src/pages/Products.tsx` | Add `interface Props { hideHeader?: boolean }` to component props. Wrap the `<h1>产品管理</h1>` header div with `{!hideHeader && (...)}` |
| `src/pages/Orders.tsx` | Same pattern. Wrap page header with `{!hideHeader && (...)}` |
| `src/pages/MallShelf.tsx` | Same pattern |
| `src/pages/MallReports.tsx` | Same pattern |
| `src/pages/quiz/QuizManagement.tsx` | Same pattern — wrap the `<h1>答题管理</h1>` block |

**Pattern**:
```tsx
interface PageProps {
  hideHeader?: boolean;
}

const PageName: React.FC<PageProps> = ({ hideHeader = false }) => {
  // ... existing code ...

  return (
    <div>
      {!hideHeader && (
        <div style={{ marginBottom: 24 }}>
          <h1>页面标题</h1>
          <p>页面描述</p>
        </div>
      )}
      {/* ... rest of content unchanged ... */}
    </div>
  );
};
```

### P0-2. Ensure `featureStore` is loaded on app mount

**File**: `src/App.tsx`

In the `EnterpriseContent` component, add `featureStore.load()` call after auth hydration:
```tsx
import { useFeatureStore } from '@/store/featureStore';

// Inside EnterpriseContent, after the auth hydrate effect:
useEffect(() => {
  if (isAuthenticated) {
    useFeatureStore.getState().load();
  }
}, [isAuthenticated]);
```

---

## Phase 1: Create Product Pages (can be done in parallel)

### P1-1. StairClimbingPage — `src/pages/product/StairClimbingPage.tsx`

**Imports**: React state hooks, `Tabs` from antd, rule config components from `../rules/`, `useFeatureStore`, `useQuery` + reports API for overview, `useBranding`

**Structure**:
```tsx
import React, { useMemo } from 'react';
import { Tabs, Empty, Spin, Row, Col } from 'antd';
import { useBranding } from '@/components/BrandingProvider';
import { useFeatureStore } from '@/store/featureStore';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, getCheckInTrend, getPointsTrend } from '@/api/reports';
import TimeSlotTab from '../rules/TimeSlotTab';
import ConsecutiveTab from '../rules/ConsecutiveTab';
import LevelTab from '../rules/LevelTab';
import SpecialTab from '../rules/SpecialTab';
import DailyCapTab from '../rules/DailyCapTab';
import WorkdayFilterTab from '../rules/WorkdayFilterTab';

const StairClimbingPage: React.FC = () => {
  const { primaryColor } = useBranding();
  const { isEnabled } = useFeatureStore();

  // Fetch overview data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stair-stats'],
    queryFn: () => getDashboardStats(),
  });

  // Tab definitions with feature gating
  const tabs = useMemo(() => {
    const items = [
      { key: 'overview', label: '数据概览', children: <OverviewContent /> },
    ];
    if (isEnabled('time_slot'))
      items.push({ key: 'timeslot', label: '规则配置', children: <TimeSlotTab /> });
    if (isEnabled('consecutive_reward'))
      items.push({ key: 'consecutive', label: '连续奖励', children: <ConsecutiveTab /> });
    if (isEnabled('special_date'))
      items.push({ key: 'special', label: '特殊日期', children: <SpecialTab /> });
    if (isEnabled('level_coefficient'))
      items.push({ key: 'level', label: '等级系数', children: <LevelTab /> });
    if (isEnabled('daily_cap'))
      items.push({ key: 'dailycap', label: '每日上限', children: <DailyCapTab /> });
    if (isEnabled('workday_filter'))
      items.push({ key: 'workday', label: '工作日过滤', children: <WorkdayFilterTab /> });
    return items;
  }, [isEnabled]);

  return (
    <div>
      {/* Page header */}
      <h1>爬楼积分管理</h1>
      <p>管理爬楼签到规则与数据</p>
      <Tabs items={tabs} />
    </div>
  );
};
```

**Overview tab content**: 3 GlassCardStat cards (今日签到/今日积分/本月签到) + trend chart using `getCheckInTrend` data. Show `<Empty description="暂无数据" />` if API returns no data or 404.

### P1-2. WalkingPage — `src/pages/product/WalkingPage.tsx`

**Imports**: StepCalcConfig, FunEquivalenceConfig, useFeatureStore

**Structure**: Same pattern as StairClimbingPage. Tabs:
- `overview` — 数据概览 (walking stats)
- `step-config` — 步数换算 (gated by `walking.step_tier`, renders `<StepCalcConfig />`)
- `fun-equiv` — 趣味等价物 (gated by `walking.fun_conversion`, renders `<FunEquivalenceConfig />`)

**Key**: Import StepCalcConfig and FunEquivalenceConfig directly. These are self-contained components (no page header of their own).

### P1-3. QuizPage — `src/pages/product/QuizPage.tsx`

**Imports**: QuizManagement component

**Structure**: Tabs:
- `overview` — 数据概览 (quiz stats, empty state if no API)
- `questions` — 题库管理 (renders `<QuizManagement hideHeader />` but force shows questions tab)
- `config` — 答题配置 (renders quiz config section)

**Note**: QuizManagement has internal tabs (questions/config). For the product page, we want to expose these as top-level tabs. Two options:
- **Option A (recommended)**: Import QuizManagement with `hideHeader` and let it manage its own internal tabs
- **Option B**: Extract the question table and config form into separate components — too much refactoring for now

Go with **Option A**: render `<QuizManagement hideHeader />` as the sole content (it already has its own tab switcher).

### P1-4. MallPage — `src/pages/product/MallPage.tsx`

**Imports**: Products, Orders, MallShelf, MallReports — all with `hideHeader`

**Structure**: Tabs using Ant Design `<Tabs>`:
- `overview` — 数据概览 (renders `<MallReports hideHeader />` which has charts)
- `products` — 商品管理 (renders `<Products hideHeader />`)
- `shelf` — 商品上架 (renders `<MallShelf hideHeader />`, gated by `mall.shelf`)
- `orders` — 订单管理 (renders `<Orders hideHeader />`)

### P1-5. SettingsPage — `src/pages/SettingsPage.tsx`

**No existing component to reuse. Build from scratch.**

```tsx
import React from 'react';
import { Row, Col, Card, Button, Typography } from 'antd';
import {
  SafetyOutlined, SkinOutlined, AppstoreOutlined,
  BookOutlined, FileTextOutlined, RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useBranding } from '@/components/BrandingProvider';

const settingsItems = [
  { key: '/roles', icon: <SafetyOutlined />, title: '角色管理', desc: '管理企业角色和权限分配' },
  { key: '/branding', icon: <SkinOutlined />, title: '品牌配置', desc: '自定义企业Logo和主题颜色' },
  { key: '/feature-matrix', icon: <AppstoreOutlined />, title: '功能点阵', desc: '查看已开通功能列表' },
  { key: '/dict-management', icon: <BookOutlined />, title: '字典管理', desc: '管理系统数据字典' },
  { key: '/operation-log', icon: <FileTextOutlined />, title: '操作日志', desc: '查看系统操作记录' },
];

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { primaryColor } = useBranding();

  return (
    <div>
      <h1>系统设置</h1>
      <p>管理系统配置</p>
      <Row gutter={[16, 16]}>
        {settingsItems.map(item => (
          <Col xs={24} sm={12} md={8} key={item.key}>
            <Card hoverable onClick={() => navigate(item.key)} style={{ borderRadius: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 28, color: primaryColor }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <Typography.Text strong>{item.title}</Typography.Text>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>{item.desc}</Typography.Text>
                </div>
                <RightOutlined style={{ color: '#999' }} />
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};
```

---

## Phase 2: Navigation & Routing (depends on Phase 1)

### P2-1. Update routes in App.tsx

**File**: `src/App.tsx`

Add new imports:
```tsx
import StairClimbingPage from '@/pages/product/StairClimbingPage';
import WalkingPage from '@/pages/product/WalkingPage';
import QuizPage from '@/pages/product/QuizPage';
import MallPage from '@/pages/product/MallPage';
import SettingsPage from '@/pages/SettingsPage';
```

**New routes** (add before the `*` catch-all):
```tsx
{/* New product pages */}
<Route path="/product/stair-climbing" element={<PermissionGuard perm="enterprise:rule:view"><StairClimbingPage /></PermissionGuard>} />
<Route path="/product/walking" element={<PermissionGuard perm="enterprise:walking:view"><WalkingPage /></PermissionGuard>} />
<Route path="/product/quiz" element={<PermissionGuard perm="enterprise:quiz:view"><QuizPage /></PermissionGuard>} />
<Route path="/product/mall" element={<PermissionGuard perm="enterprise:product:list"><MallPage /></PermissionGuard>} />
<Route path="/settings" element={<PermissionGuard><SettingsPage /></PermissionGuard>} />

{/* Old route redirects */}
<Route path="/rules" element={<Navigate to="/product/stair-climbing" replace />} />
<Route path="/walking" element={<Navigate to="/product/walking" replace />} />
<Route path="/walking/step-config" element={<Navigate to="/product/walking" replace />} />
<Route path="/walking/fun-equiv" element={<Navigate to="/product/walking" replace />} />
<Route path="/quiz" element={<Navigate to="/product/quiz" replace />} />
<Route path="/products" element={<Navigate to="/product/mall" replace />} />
<Route path="/orders" element={<Navigate to="/product/mall" replace />} />
<Route path="/mall/shelf" element={<Navigate to="/product/mall" replace />} />
<Route path="/mall/reports" element={<Navigate to="/product/mall" replace />} />
<Route path="/product-config" element={<Navigate to="/product/stair-climbing" replace />} />
```

**Note on PermissionGuard**: Check if it accepts a `perm` prop. If not, we need to add that. The current implementation likely reads from `ENTERPRISE_PERMISSION_MAP` based on route. Update it to also accept an explicit `perm` prop.

### P2-2. Update static menu items

Replace `EnterpriseMenuItems` with:

```tsx
const EnterpriseMenuItems: MenuProps['items'] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '数据看板' },
  { key: '/members', icon: <TeamOutlined />, label: '员工管理' },
  // Product menus — filtered dynamically below
  { key: '/product/stair-climbing', icon: <RiseOutlined />, label: '爬楼积分管理' },
  { key: '/product/walking', icon: <WomanOutlined />, label: '走路积分管理' },
  { key: '/product/quiz', icon: <BookOutlined />, label: '答题管理' },
  { key: '/product/mall', icon: <ShopOutlined />, label: '积分商城' },
  // Operations
  { key: '/points', icon: <TrophyOutlined />, label: '积分运营' },
  { key: '/point-expiration', icon: <ClockCircleOutlined />, label: '积分过期配置' },
  { key: '/reports', icon: <BarChartOutlined />, label: '数据报表' },
  // Settings
  {
    key: 'settings-group',
    icon: <SettingOutlined />,
    label: '系统设置',
    children: [
      { key: '/roles', label: '角色管理' },
      { key: '/branding', label: '品牌配置' },
      { key: '/feature-matrix', label: '功能点阵' },
      { key: '/dict-management', label: '字典管理' },
      { key: '/operation-log', label: '操作日志' },
    ],
  },
];
```

### P2-3. Update product-based menu filtering

**Replace the `hasWalkingProduct` check** with a comprehensive product check:

```tsx
// Map product codes to menu keys
const PRODUCT_MENU_MAP: Record<string, string> = {
  'stair_climbing': '/product/stair-climbing',
  'stairs_climbing': '/product/stair-climbing',
  'walking': '/product/walking',
  'quiz': '/product/quiz',
  'mall': '/product/mall',
};

const tenantProductKeys = useMemo(() => {
  if (!tenantProducts) return new Set<string>();
  return new Set(
    tenantProducts
      .map(p => PRODUCT_MENU_MAP[p.productCode] || PRODUCT_MENU_MAP[p.category])
      .filter(Boolean)
  );
}, [tenantProducts]);
```

In the static menu filter:
```tsx
.filter(item => {
  const key = String((item as any).key);
  // Hide product menus if tenant hasn't purchased the product
  if (key.startsWith('/product/') && !tenantProductKeys.has(key)) {
    return false;
  }
  // Check permissions for leaf items
  const perm = ENTERPRISE_PERMISSION_MAP[key];
  return !perm || permissions.includes(perm);
})
```

### P2-4. Update mapBackendPathToFrontend

Add new mappings:
```tsx
const pathMap: Record<string, string> = {
  '/dashboard': '/dashboard',
  '/mall': '/product/mall',
  '/users': '/members',
  '/reports': '/reports',
  '/settings': '/settings',
};

// Product paths
if (backendPath.startsWith('/product/')) {
  const parts = backendPath.split('/');
  const productCode = parts[2]; // stair_climbing, walking, quiz, etc.
  const codeToRoute: Record<string, string> = {
    'stair_climbing': '/product/stair-climbing',
    'stairs_climbing': '/product/stair-climbing',
    'walking': '/product/walking',
    'quiz': '/product/quiz',
    'mall': '/product/mall',
  };
  return codeToRoute[productCode] || '/dashboard';
}
```

### P2-5. Update ENTERPRISE_PERMISSION_MAP

```tsx
const ENTERPRISE_PERMISSION_MAP: Record<string, string | undefined> = {
  '/dashboard': 'enterprise:dashboard:view',
  '/members': 'enterprise:member:list',
  // Product pages
  '/product/stair-climbing': 'enterprise:rule:view',
  '/product/walking': 'enterprise:walking:view',
  '/product/quiz': 'enterprise:quiz:view',
  '/product/mall': 'enterprise:product:list',
  // Operations
  '/points': 'enterprise:point:query',
  '/point-expiration': 'enterprise:point:query',
  '/reports': 'enterprise:report:view',
  // Settings sub-pages
  '/roles': 'enterprise:role:list',
  '/branding': undefined,
  '/feature-matrix': 'enterprise:feature:view',
  '/dict-management': 'enterprise:dict:view',
  '/operation-log': 'enterprise:log:query',
  // Legacy redirects (keep for PermissionGuard on old URLs)
  '/rules': 'enterprise:rule:view',
  '/walking': 'enterprise:walking:view',
  '/walking/step-config': 'enterprise:walking:config',
  '/walking/fun-equiv': 'enterprise:walking:config',
  '/quiz': 'enterprise:quiz:view',
  '/products': 'enterprise:product:list',
  '/orders': 'enterprise:order:list',
  '/mall/shelf': 'enterprise:mall:shelf',
  '/mall/reports': 'enterprise:mall:report',
  '/product-config': 'enterprise:product:config',
};
```

---

## Phase 3: Dashboard & Reports (independent, can run parallel with Phase 1-2)

### P3-1. Dashboard — Multi-product stat cards

**File**: `src/pages/Dashboard.tsx`

**Change 1**: Import `getTenantProducts` and `useQuery` to fetch tenant products.

**Change 2**: Replace the hardcoded `STAT_CONFIG` array with a dynamic one:
```tsx
const productStatConfigs: Record<string, StatConfigItem[]> = {
  stair_climbing: [
    { key: 'checkin', label: '今日签到', icon: <TeamOutlined />, color: BRAND_PALETTE.primary },
    { key: 'points', label: '今日积分', icon: <TrophyOutlined />, color: BRAND_PALETTE.success },
  ],
  walking: [
    { key: 'walkers', label: '今日走路', icon: <WomanOutlined />, color: BRAND_PALETTE.warning },
    { key: 'walk-points', label: '走路积分', icon: <RiseOutlined />, color: BRAND_PALETTE.accent },
  ],
  quiz: [
    { key: 'quizzers', label: '今日答题', icon: <BookOutlined />, color: '#8b5cf6' },
  ],
  mall: [
    { key: 'exchanges', label: '今日兑换', icon: <ShoppingOutlined />, color: BRAND_PALETTE.secondary },
  ],
};
```

**Change 3**: In the stat cards section, map over `tenantProducts` and render stat configs for each purchased product.

**Change 4**: Re-enable commented-out multi-product chart code. Find the commented block and un-comment it, adjusting any variable references.

### P3-2. Dashboard — Product overview cards

Add a new section after stat cards: "产品概览" with one card per purchased product. Each card shows:
- Product icon + name
- Key metric (from getProductStats)
- "进入管理" button linking to `/product/{code}`

### P3-3. Reports — Replace hardcoded product names

**File**: `src/pages/Reports.tsx`

**Find and replace** the hardcoded product arrays. Search for strings like:
- `'爬楼打卡'`, `'走路积分'`, `'商城兑换'`
- Any static product distribution chart data

**Replace with**:
```tsx
const { data: tenantProducts } = useQuery({
  queryKey: ['tenant-products'],
  queryFn: getTenantProducts,
});

const productNameMap = useMemo(() => {
  if (!tenantProducts) return {};
  return Object.fromEntries(
    tenantProducts.map(p => [p.category || p.productCode, p.productName])
  );
}, [tenantProducts]);
```

Then use `productNameMap['stair_climbing'] || '爬楼打卡'` etc. with fallbacks.

---

## Phase 4: Cleanup

### P4-1. Remove ProductConfig route and page

The `/product-config` route redirects to `/product/stair-climbing`. The `ProductConfig` page component file can stay (not imported anymore).

Remove from App.tsx:
- `import ProductConfig from '@/pages/ProductConfig';`

### P4-2. Update sidebar defaultOpenKeys

Change from:
```tsx
defaultOpenKeys={dynamicMenu ? [] : ['stair-group', 'walking-group', 'mall-group']}
```
To:
```tsx
defaultOpenKeys={dynamicMenu ? [] : ['settings-group']}
```

### P4-3. Remove stale imports

Remove any imports that are no longer used after the route changes (old page imports that are only used via redirect).

---

## Execution Order

```
Phase 0 (prerequisites):
  P0-1: hideHeader prop    ──┐
  P0-2: featureStore load   ──┤
                              │
Phase 1 (product pages):      │ (depends on P0-1)
  P1-1: StairClimbingPage  ──┤
  P1-2: WalkingPage        ──┤  (all parallel)
  P1-3: QuizPage           ──┤
  P1-4: MallPage           ──┤
  P1-5: SettingsPage       ──┤
                              │
Phase 2 (navigation):         │ (depends on Phase 1)
  P2-1: Routes             ──┤
  P2-2: Menu items         ──┤  (sequential: P2-1 → P2-2 → P2-3 → P2-4 → P2-5)
  P2-3: Product filtering  ──┤
  P2-4: Path mapping       ──┤
  P2-5: Permission map     ──┤
                              │
Phase 3 (content fixes):      │ (independent, can start after P0)
  P3-1: Dashboard stats    ──┤
  P3-2: Dashboard overview ──┤
  P3-3: Reports fix        ──┤
                              │
Phase 4 (cleanup):            │ (depends on Phase 2)
  P4-1: Remove ProductConfig │
  P4-2: Update defaultKeys   │
  P4-3: Remove stale imports─┘
```

**Critical path**: P0 → P1 → P2 → P4
**Parallel track**: P3 can start as soon as P0 is done

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| PermissionGuard doesn't accept explicit `perm` prop | Blocks P2-1 | Check component first; if needed, add `perm` prop |
| Feature keys mismatch between backend and frontend | Wrong tabs shown | Use fallback: try featureStore, then tenantProducts.featureConfig |
| Rule config tabs (TimeSlotTab etc.) need props not visible in import | Runtime error | Read each tab component to verify they work standalone |
| Old bookmarks/links break | User confusion | All old routes have `<Navigate>` redirects |
| Mall page tries to show 4 full-page components | Layout breakage | `hideHeader` prop tested in P0-1 |

## Verification Checklist

After all phases complete:

1. `pnpm --filter @carbon-point/enterprise-frontend dev` starts without errors
2. Navigate to `/enterprise/dashboard` — shows dynamic stat cards
3. Navigate to `/enterprise/rules` — redirects to `/enterprise/product/stair-climbing`
4. Navigate to `/enterprise/product/stair-climbing` — shows tabbed page with rule config
5. Navigate to `/enterprise/product/walking` — shows step config + fun equiv tabs
6. Navigate to `/enterprise/product/quiz` — shows quiz management
7. Navigate to `/enterprise/product/mall` — shows 4 tabs (overview/products/shelf/orders)
8. Navigate to `/enterprise/settings` — shows card grid linking to system pages
9. Navigate to `/enterprise/reports` — shows dynamic product names
10. Old routes all redirect correctly: `/walking/*`, `/quiz`, `/products`, `/orders`, `/mall/*`, `/product-config`

# Enterprise Admin Product-Driven UI Redesign

**Date**: 2026-04-28
**Status**: Draft
**Scope**: `saas-frontend/enterprise-frontend/`
**Path convention**: All routes are relative to `basename="/enterprise"`. Backend menu API returns paths WITHOUT the `/enterprise` prefix (e.g., `/product/stair-climbing`), and React Router handles the basename internally.

## Context

The enterprise admin frontend has a mismatch between its menu system and page content. The backend already provides a dynamic menu API (`GET /api/menus`) that returns menus based on the tenant's purchased package, and a tenant products API (`GET /api/tenant/products`) that lists available products. However, the frontend:

1. Uses a static fallback menu that shows ALL items regardless of purchased products
2. Dashboard only shows stair-climbing data (multi-product charts are commented out)
3. Reports page hardcodes product names instead of reading from tenant products
4. Product configuration is scattered across multiple pages (`Rules`, `WalkingManagement`, `QuizManagement`, `Products`, `Orders`, `MallShelf`, etc.)
5. No unified entry point per product — admin must navigate across different menus

**Goal**: Restructure the enterprise admin so each purchased product is a first-class menu entry with all its configuration, data, and management in one page.

## Menu Structure

### New Layout

```
📊 数据看板                /dashboard
👥 员工管理                /members
───────── 产品管理（动态）──────────
🏢 爬楼积分管理             /product/stair-climbing    ← only if purchased
🚶 走路积分管理             /product/walking           ← only if purchased
📝 答题管理                /product/quiz              ← only if purchased
🛒 积分商城                /product/mall              ← only if purchased
───────── 运营管理 ──────────
🏆 积分运营                /points
⏰ 积分过期配置             /point-expiration
📈 数据报表                /reports
───────── 系统设置 ──────────
⚙️ 系统设置                /settings
   ├── 角色管理            /roles
   ├── 品牌配置            /branding
   ├── 功能点阵            /feature-matrix
   ├── 字典管理            /dict-management
   └── 操作日志            /operation-log
```

### Route Mapping

| Old Route | New Route | Component |
|-----------|-----------|-----------|
| `/rules` | `/product/stair-climbing` | `StairClimbingPage` (new) |
| `/walking/*` | `/product/walking` | `WalkingPage` (new) |
| `/quiz` | `/product/quiz` | `QuizPage` (new) |
| `/products` + `/orders` + `/mall/*` | `/product/mall` | `MallPage` (new) |
| `/product-config` | (removed) | Merged into product pages |
| (none) | `/settings` | `SettingsPage` (new) |

Old routes redirect to new routes for backwards compatibility.

### Menu Filtering Logic

1. **Dynamic mode** (preferred): Use `GET /api/menus` response, map backend paths via updated `mapBackendPathToFrontend()`
2. **Static fallback**: Filter `EnterpriseMenuItems` using `tenantProducts` — only show product groups for products the tenant has purchased. Apply same filter to quiz, mall, walking.

## Page Designs

### 1. Dashboard `/dashboard`

**Change**: Multi-product awareness.

- **Stat cards**: Dynamically generated based on purchased products
  - Stair climbing: 今日签到人数, 今日发放积分
  - Walking: 今日走路人数, 今日走路积分
  - Quiz: 今日答题人数
  - Mall: 今日兑换数
- **Product overview cards**: One card per purchased product with key metrics + "进入管理" link to `/product/{code}`
- **Trend charts**: Filter by product dimension
- **Leaderboard**: Cross-product ranking

**API**: Existing `getCrossProductOverview()` and `getProductStats()` — re-enable the commented-out chart rendering.

### 2. Stair Climbing Page `/product/stair-climbing`

**Merges**: `Rules` page (stair climbing tabs only)

**Tab structure**:
- **数据概览**: Stair climbing stats (check-in count, points issued, trend chart)
- **规则配置**: Time slot configuration (reuse `TimeSlotConfig` component)
- **连续奖励**: Consecutive check-in rewards (reuse `ConsecutiveRewardConfig`)
- **特殊日期**: Special date multiplier (reuse `SpecialDateConfig`)
- **等级系数**: Level coefficient (reuse `LevelCoefficientConfig`)
- **每日上限**: Daily cap (reuse `DailyCapConfig`)
- **工作日过滤**: Workday filter (reuse `WorkdayFilterConfig`)

**Feature gating**: Tabs hidden based on `featureConfig` from `getTenantProducts()`.

### 3. Walking Page `/product/walking`

**Merges**: `WalkingManagement` + `StepCalcConfig` + `FunEquivalenceConfig`

**Tab structure**:
- **数据概览**: Walking stats
- **步数换算**: Step-tier to points mapping (reuse `StepCalcConfig`)
- **趣味等价物**: Fun conversions (reuse `FunEquivalenceConfig`)

### 4. Quiz Page `/product/quiz`

**Merges**: `QuizManagement`

**Tab structure**:
- **数据概览**: Quiz stats
- **题库管理**: Question CRUD (reuse `QuizManagement` question bank tab)
- **答题配置**: Daily limit, points per answer (reuse `QuizManagement` config tab)

### 5. Mall Page `/product/mall`

**Merges**: `Products` + `Orders` + `MallShelf` + `MallReports`

**Tab structure**:
- **数据概览**: Exchange stats (reuse `MallReports` charts)
- **商品管理**: Virtual product CRUD (reuse `Products` component logic)
- **商品上架**: Platform product selection (reuse `MallShelf`)
- **订单管理**: Exchange orders (reuse `Orders` component logic)

### 6. Reports Page `/reports`

**Change**: Remove hardcoded product names, use tenant products.

- "产品积分分布" chart: Read from `tenantProducts` instead of hardcoded array
- "产品数据统计" table: Dynamically generate columns from tenant products
- Cross-product distribution: Dynamic based on purchased products

### 7. Settings Page `/settings`

**New page**: Card-based layout linking to system management pages.

- **角色管理** → navigates to `/roles`
- **品牌配置** → navigates to `/branding`
- **功能点阵** → navigates to `/feature-matrix`
- **字典管理** → navigates to `/dict-management`
- **操作日志** → navigates to `/operation-log`

Each card shows: icon, title, description, "进入" button. Uses `PageHeader` from design system.

## Feature System Unification

**Problem**: Rules page reads features from `tenantProducts.featureConfig` while `FeatureGuard` reads from `GET /api/enterprise/features`. These can diverge.

**Solution**: Use `featureStore` (Zustand, reads from `GET /api/enterprise/features`) as the single source of truth for feature gating. Product pages use `useFeatureStore().isFeatureEnabled(code)` to determine which tabs to show.

**Feature key mapping** (feature code → tab visibility):

| Product | Feature Code | Tab Gated |
|---------|-------------|-----------|
| Stair climbing | `time_slot` | 规则配置 tab |
| Stair climbing | `consecutive_reward` | 连续奖励 tab |
| Stair climbing | `special_date` | 特殊日期 tab |
| Stair climbing | `daily_cap` | 每日上限 tab |
| Stair climbing | `level_coefficient` | 等级系数 tab |
| Stair climbing | `workday_filter` | 工作日过滤 tab |
| Walking | `walking.step_tier` | 步数换算 tab |
| Walking | `walking.fun_conversion` | 趣味等价物 tab |
| Quiz | `quiz.enabled` | 答题管理 menu visibility |
| Mall | `mall.shelf` | 商品上架 tab |
| Mall | `mall.reports` | 商城报表 tab |

**Note**: The backend `GET /api/enterprise/features` returns feature codes from `features.code` joined via `package_product_features`. These codes must match the keys above. If there's a mismatch between `featureConfig` keys in `tenantProducts` and `features.code`, the backend needs to be aligned. For now, product pages will try `featureStore` first, and fall back to `tenantProducts.featureConfig` if the feature key is not found in the store.

## Tab Content Strategy

**Problem**: Existing pages (Products, Orders, MallShelf, etc.) are full page-level components with their own headers, cards, and layout. They cannot be directly embedded as tab content.

**Solution**: Each product page wraps existing components using one of two approaches:

1. **Direct import** (for components that are already tab-friendly):
   - Rule config components (`TimeSlotConfig`, `ConsecutiveRewardConfig`, etc.) are already self-contained — import directly into Tabs
   - `StepCalcConfig`, `FunEquivalenceConfig` — already self-contained

2. **Header suppression via prop** (for full-page components):
   - `Products`, `Orders`, `MallShelf`, `MallReports` are full pages
   - Add a `hideHeader?: boolean` prop to each, which suppresses the `PageHeader` / `GlassCard` wrapper
   - When `hideHeader={true}`, only the table/form content renders, suitable for tab embedding
   - This is minimal change — no component extraction needed

## Data Overview Tab — API Sources

| Product Page | API Functions | Source |
|-------------|--------------|--------|
| Stair Climbing | `getDashboardStats()`, `getCheckInTrend()`, `getPointsTrend()` | Existing `src/api/reports.ts` |
| Walking | `getProductStats('walking')` | Existing `src/api/reports.ts` — `getProductStats()` |
| Quiz | `getProductStats('quiz')` | New — backend endpoint may not exist yet. Show empty state with "暂无数据" if API returns 404 |
| Mall | `getProductStats('mall')` + `getMallExchangeStats()` | Existing `src/api/reports.ts` + `src/api/mall.ts` |

**Fallback behavior**: If product-specific stats API returns error/404, the data overview tab shows an `Empty` component with descriptive text ("该产品的统计数据功能即将上线").

## Permission Mapping

New route → permission mapping. Redirect routes reuse the old route's permission:

| Route | Permission |
|-------|-----------|
| `/product/stair-climbing` | `enterprise:rule:view` (same as old `/rules`) |
| `/product/walking` | `enterprise:walking:view` (same as old `/walking`) |
| `/product/quiz` | `enterprise:quiz:view` (same as old `/quiz`) |
| `/product/mall` | `enterprise:product:list` (same as old `/products`) |
| `/settings` | No permission (hub page) |
| `/roles` | `enterprise:role:list` |
| `/branding` | No permission |
| `/feature-matrix` | `enterprise:feature:view` |
| `/dict-management` | `enterprise:dict:view` |
| `/operation-log` | `enterprise:log:query` |

## Out of Scope

- `BadgeManagement` and `DepartmentManagement` — currently stub pages with no API integration. Not included in this redesign. They remain accessible via direct URL if needed.
- Backend API changes — this spec assumes the existing backend APIs are sufficient. New product-specific stats endpoints are nice-to-have, not blocking.

## Implementation Plan

### Phase 1: New Pages & Routing (core structure)

1. Create `StairClimbingPage` — wrapper with Tabs, reusing existing rule config components
2. Create `WalkingPage` — wrapper with Tabs, reusing walking config components
3. Create `QuizPage` — wrapper with Tabs, reusing quiz components
4. Create `MallPage` — wrapper with Tabs, reusing products/orders/shelf/reports
5. Create `SettingsPage` — card layout linking to system pages
6. Update `App.tsx` routes: add new routes, add redirect from old routes
7. Update `mapBackendPathToFrontend()` for new product paths

### Phase 2: Menu & Navigation

8. Update `EnterpriseMenuItems` static fallback with new structure
9. Add product-based filtering to static menu (quiz, mall, walking all conditional)
10. Ensure dynamic menu path mapping works for new routes
11. Update sidebar rendering — "系统设置" as expandable group

### Phase 3: Page Content Fixes

12. Dashboard: re-enable multi-product charts, dynamic stat cards
13. Reports: replace hardcoded product names with tenant products
14. Delete or deprecate `ProductConfig` page (merged into product pages)

### Phase 4: Cleanup

15. Remove unused imports and old page references
16. Update `ENTERPRISE_PERMISSION_MAP` for new routes
17. Test all routes, redirects, and product-based filtering

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/product/StairClimbingPage.tsx` | Stair climbing management (tabs) |
| `src/pages/product/WalkingPage.tsx` | Walking management (tabs) |
| `src/pages/product/QuizPage.tsx` | Quiz management (tabs) |
| `src/pages/product/MallPage.tsx` | Mall management (tabs) |
| `src/pages/SettingsPage.tsx` | System settings hub |

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Routes, menu items, path mapping, imports |
| `src/pages/Dashboard.tsx` | Multi-product stats, re-enable charts |
| `src/pages/Reports.tsx` | Dynamic product data |
| `src/utils/iconMapper.tsx` | New icon mappings for product pages |
| `src/api/menu.ts` | Updated path mapping if needed |

## Files Unchanged (reused as tab content)

- `src/pages/rules/*.tsx` — All rule config components
- `src/pages/walking/StepCalcConfig.tsx`
- `src/pages/walking/FunEquivalenceConfig.tsx`
- `src/pages/quiz/QuizManagement.tsx`
- `src/pages/Products.tsx`
- `src/pages/Orders.tsx`
- `src/pages/MallShelf.tsx`
- `src/pages/MallReports.tsx`

## Verification

1. **Menu dynamic test**: Login as tenant with only stair climbing → only stair climbing product menu visible
2. **Menu dynamic test 2**: Login as tenant with all products → all product menus visible
3. **Route test**: Navigate to `/product/stair-climbing` → sees tab-based config page with all rule tabs
4. **Route test**: Navigate to `/product/mall` → sees 4 tabs (overview, products, shelf, orders)
5. **Redirect test**: Navigate to `/rules` → redirects to `/product/stair-climbing`
6. **Dashboard test**: Dashboard shows dynamic stat cards based on purchased products
7. **Reports test**: Reports shows dynamic product names in charts
8. **Feature gate test**: Tenant without `consecutive_reward` feature → tab not shown
9. **Settings test**: Navigate to `/settings` → sees card layout with links to all system pages
10. **Static fallback test**: If dynamic menu API is down → static menu still filters by tenant products

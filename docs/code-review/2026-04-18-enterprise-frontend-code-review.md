# Code Review 完整汇总 — enterprise-frontend

> 审查日期: 2026/04/18
> 审查范围: apps/enterprise-frontend, apps/h5, packages/
> 审查团队: 5 位 reviewer（reviewer-ui, reviewer-state, reviewer-config, api-reviewer, infra-reviewer）

---

## 问题分类统计

| 严重程度 | 问题数 | 代表性问题 |
|---------|-------|-----------|
| 🔴 严重/高 | ~15 | Token refresh race condition、Stub API、硬编码凭证、API 响应不一致 |
| 🟡 中等 | ~25 | `any` 类型泛滥、组件未 memoize、重复 CSS 代码、localStorage token 明文 |
| 🟢 低 | ~15 | Magic number、`.env` 默认密码、内联 `<style>` 标签 |

---

## 高优先级问题（需立即修复）

### 1. Token Refresh Race Condition（严重）

**文件**: `apps/enterprise-frontend/src/api/request.ts:62-79`

多个 API 请求同时收到 401 时，每个都独立触发 `refreshToken`，没有 mutex 队列，可能导致瀑布流式的重复刷新和 logout。

```typescript
// 问题代码
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    // 多个请求同时 401 时，每个都调用 refreshToken
    const originalRequest = error.config;
    if (error.response?.status === 401) {
      await refreshToken(); // 无 mutex，可能多次调用
      return apiClient(originalRequest);
    }
  }
);
```

**修复方案**: 添加 `isRefreshing` 标志 + 重试队列：

```typescript
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await refreshToken();
          refreshQueue.forEach(cb => cb(newToken));
          refreshQueue = [];
        } catch {
          refreshQueue.forEach(cb => cb(''));
          refreshQueue = [];
          logout();
        } finally {
          isRefreshing = false;
        }
      }
      return new Promise((resolve) => {
        refreshQueue.push((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(originalRequest));
        });
      });
    }
  }
);
```

---

### 2. `rules.ts` API 全是 Stub（严重）

**文件**: `apps/enterprise-frontend/src/api/rules.ts`

以下 API 函数返回空数组或假数据，无任何后端调用：

- `getConsecutiveRewards` → `return []`
- `updateConsecutiveRewards` → `return []`
- `getSpecialDates` → `return []`
- `createSpecialDate` → `return null`
- `deleteSpecialDate` → `return null`
- `getLevelCoefficients` → `return []`
- `updateLevelCoefficients` → `return []`
- `getDailyCap` → `return []`
- `updateDailyCap` → `return []`

**影响**: 页面功能无法实际使用，数据全假。

**修复**: 删除 stub 实现或添加 `// TODO: connect to backend` 注释并抛出错误。

---

### 3. E2E 测试硬编码凭证（严重）

**文件**: `apps/enterprise-frontend/e2e/helpers.ts:103`

```typescript
const loginAsEnterpriseAdmin = async () => {
  await page.goto(LOGIN_URL);
  await page.getByRole('textbox', { name: '请输入手机号' }).fill('13800138001');
  await page.getByRole('textbox', { name: '请输入密码' }).fill('password123');
  // ...
};
```

同时 `e2e/helpers.ts:98-99` 注释记录了 UI bug workaround：
```typescript
// Login API has a response format bug in the UI (checks res.code instead of res.data.code)
// This test bypasses the UI login form entirely
```

**修复**:
1. 创建 `.env.e2e` 文件存储测试凭证
2. 在 `global-setup.ts` 和 `helpers.ts` 中从环境变量加载
3. 将 UI bug 追踪到 issue tracker，不在代码中注释

---

### 4. `packages/api` 完全未被使用（高）

**问题**: enterprise-frontend 自建 API 层，与 `packages/api` 重复。

- `packages/api/src/` — 通用 API 包（含 auth/user/tenant/checkin/points/mall/report/notification）
- `apps/enterprise-frontend/src/api/` — 企业前端专用 API（重复实现）

**修复**: enterprise-frontend 应基于 `packages/api` 构建，仅在 `src/api/` 中做覆盖/扩展。

---

### 5. API 响应格式处理三套做法（高）

| 层级 | 拦截器解包 | 返回值 |
|------|-----------|--------|
| `packages/api/request.ts` | ✅ 解包 `res.data` | `resolve(data)` |
| `enterprise-frontend/request.ts` | ❌ 无解包 | `return res` |
| `h5/src/api/request.ts` | ❌ 无解包 | `return res` |

**调用方差异**:
- `Member.tsx`: `data?.data?.records`（两层 data）
- `Dashboard.tsx`: `extractArray<T>` 手动解包
- `BrandingProvider.tsx`: `res.data.data` 直接取
- `auth.ts` (enterprise): `res.data` 取

**修复**: 统一在拦截器层解包，所有调用方直接拿 `data` 字段。

---

## 组件层问题

### 大组件需拆分

| 文件 | 行数 | 问题 |
|------|------|------|
| `Rules.tsx` | 1126 | 5个 Tab 内容全在一个文件 |
| `Branding.tsx` | 762 | 样式定义 ~300 行内联 |
| `Dashboard.tsx` | 717 | 统计卡片、图表、表格全在一起 |

**建议拆分**:
- `Rules.tsx` → `TimeSlotTab.tsx`, `ConsecutiveTab.tsx`, `LevelTab.tsx`, `SpecialTab.tsx`, `DailyCapTab.tsx`
- `Branding.tsx` → `BrandingConfigPanel.tsx`, `MiniDashboardPreview.tsx`, `branding.styles.ts`
- `Dashboard.tsx` → `StatCards.tsx`, `CheckInTrendChart.tsx`, `HotProductsTable.tsx`

---

### 性能问题

| 问题 | 文件 | 修复 |
|------|------|------|
| Table columns 未 useMemo | 所有页面 | 用 `useMemo` 包裹 columns 数组 |
| `customMenuItems` 每次渲染重新创建 | `App.tsx` | 用 `useMemo` |
| `hasPermission` / `hasAnyPermission` 未 memoize | `usePermission.ts:7-8` | 用 `useCallback` 包装 |
| Dashboard 4 个并行 useQuery | `Dashboard.tsx` | 可考虑 `useQueries` 或后端合并接口 |
| 表格 hover 用 JS 事件 | `Member.tsx` | 改用 CSS `:hover` |
| LoginPage 内联 `<style>` 标签 | `LoginPage.tsx` | 迁移到 CSS Module |

---

### TypeScript 类型问题

| 问题 | 文件 | 建议 |
|------|------|------|
| `res: any` 登录响应 | `LoginPage.tsx:63` | 定义 `LoginResponse` 类型 |
| `data: any` 参数 | `rules.ts` 多处 | 定义 proper 参数类型 |
| `error.response?.data as any` | `request.ts:50` | 定义 `ErrorResponse` 接口 |
| `ApiResponse.code` 类型不一致 | `branding.ts:24` 用 `string`，其他用 `number` | 统一为 `number` |
| `AdminUser` 接口重复定义 | `auth.ts` 和 `authStore.ts` | 抽取到 `types/api.ts` |
| `Logger` 接口用 `any[]` | `logger.ts:12` | 改用 `unknown[]` |

---

### UI/UX 问题

| 问题 | 文件 | 修复 |
|------|------|------|
| Table 无 empty state | Orders、Products、Points、Rules | 添加 `<Table locale={{ emptyText: '暂无数据' }}>` |
| 5 个 useQuery 无 onError 处理 | `Rules.tsx:70-102` | 统一错误处理 |
| 裸 `<button>` 而非 `<Button>` | Rules、Branding Tab 切换 | 使用 Ant Design 组件 |
| 无 ARIA 属性 | 自定义 Tab 按钮 | 添加 `aria-selected`、`aria-controls` |
| `href="#"` 链接 | `LoginPage.tsx:537-543` | 改用 `<button>` 或 `role="button"` |
| 硬编码字体名 | 多处 | 使用 CSS 变量 `--font-heading` / `--font-body` |
| CSS 变量系统未被使用 | 多处 | 使用 CSS 变量替代硬编码颜色 |
| 重复 CSS 覆盖代码 | 4+ 个页面 | 提取共享 `TableStyles` 组件 |

---

## 配置/基础设施问题

### 严重配置问题

| 问题 | 文件 | 修复 |
|------|------|------|
| `deepClone` 用 `JSON.parse(JSON.stringify())` | `utils/index.ts` | 改用 `structuredClone()` |
| Logger 实现三份重复 | packages/utils, enterprise, h5 | 统一使用 `packages/utils` |
| H5 test config 端口不一致 | `vite.test.config.ts` | main=3002, test=8081 需统一 |
| 缺少 Prettier 配置 | 项目根目录 | 添加 `.prettierrc` |

### Vite 配置

| 问题 | 建议 |
|------|------|
| `target: 'es2015'` 过低 | 改为 `es2020` 或 `esnext` |
| 缺少 `chunkSizeWarningLimit` | 添加警告阈值 |
| 无 CSS chunk 提取 | antd CSS 应单独提取 |
| `noUnusedLocals: false` 全局关闭 | 开启或按文件关闭 |

### E2E 测试问题

| 问题 | 文件 | 修复 |
|------|------|------|
| auth cache 无 worker 隔离 | `global-setup.ts:26` | 添加 worker index: `.auth-token.${workerIndex}.json` |
| `waitForTimeout` 硬编码 | 多处 | 改用 Playwright DOM 等待 |
| CSS 选择器不健壮 | `helpers.ts:53-58` | 改用 `getByLabel()` 或 `data-testid` |
| `Date.now()` 精度不足 | `member.spec.ts:79-80` | 用 `uniqueId()` 替代 |
| 数据修改测试无 cleanup | `points.spec.ts:217,231` | 标记为 `test.skip` 或单独 suite |

---

## 修复路线图

### P0（立即修复）

1. **Token refresh race condition** — 添加 mutex（见上文方案）
2. **`rules.ts` stub API** — 删除或标记 TODO
3. **E2E 凭证移至环境变量** — 创建 `.env.e2e`
4. **统一 API 响应解包** — 拦截器层统一处理

### P1（短期内，1-2 周）

1. 提取共享 `useApiResponse<T>()` hook
2. 所有 API 响应定义 proper 类型，消除 `any`
3. `Rules.tsx` / `Branding.tsx` 拆分子组件
4. Table 添加 empty state + 统一错误处理
5. 统一 logger 到 `packages/utils`
6. `deepClone` → `structuredClone`
7. 添加 Prettier 配置 + import 排序规则
8. `usePermission` hook 用 `useCallback` memoize
9. Table columns 用 `useMemo`
10. 修复 `operatorId` 客户端发送问题（`points.ts:54-62`）

### P2（持续改进，1 个月+）

1. `packages/api` 作为底层 API 层
2. React Query 全局 ErrorBoundary
3. CSS 变量系统替代内联 style
4. 提取共享 `TableCard` 组件
5. ARIA 属性补全
6. E2E 改用 `getByLabel` / `data-testid` 选择器
7. H5 位置验证逻辑确认业务预期
8. Playwright 改用 network-idle 等待替代 `waitForTimeout`
9. 开启 `noUnusedLocals` / `noUnusedParameters`

---

## 整体评价

代码库**架构设计良好**：React Query + Zustand 组合使用得当，`BrandingProvider` 主题系统设计出色，组件分层清晰，E2E 测试覆盖全面（170+ 测试用例）。

主要问题集中在：

1. **类型安全不足** — `any` 类型泛滥，API 响应类型不统一
2. **代码复用性差** — 重复的 CSS、重复的 API 响应处理逻辑、logger 三份重复
3. **性能优化缺失** — 大量 `useMemo`/`React.memo`/(`useCallback` 未使用)
4. **基础设施不完善** — 缺少 Prettier、测试配置不一致

建议优先修复 token refresh race condition 和 stub API 问题，这两个是功能正确性的根本隐患。

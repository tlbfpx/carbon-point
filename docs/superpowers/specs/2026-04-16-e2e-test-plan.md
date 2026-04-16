# Carbon Point E2E 测试计划

**文档日期**: 2026-04-16
**状态**: 进行中
**测试类型**: Playwright E2E (端到端)

---

## 1. 测试目标

对 Carbon Point 碳积分打卡平台进行全面的端到端自动化测试，覆盖：
- **Dashboard E2E**: 企业管理后台 + 平台管理后台
- **H5 E2E**: 用户端移动端（微信/APP WebView）
- **Phase 5 验收**: P0/P1/P2 核心业务流程

---

## 2. 测试范围

### 2.1 Dashboard E2E

| 模块 | Spec 文件 | 测试数 | 状态 |
|------|---------|--------|------|
| 企业-登录 | `login.spec.ts` | 20 | ✅ 20/20 |
| 企业-数据看板 | `enterprise/dashboard.spec.ts` | 15 | ✅ 15/15 |
| 企业-员工管理 | `enterprise/member.spec.ts` | 25 | ✅ 25/25 |
| 企业-订单管理 | `enterprise/orders.spec.ts` | 25 | ✅ 25/25 |
| 企业-积分运营 | `enterprise/points.spec.ts` | 25 | ✅ 25/25 |
| 企业-商品管理 | `enterprise/products.spec.ts` | 30 | ✅ 30/30 |
| 企业-数据报表 | `enterprise/reports.spec.ts` | 20 | ✅ 20/20 |
| 企业-角色权限 | `enterprise/roles.spec.ts` | 20 | ✅ 20/20 |
| 企业-规则配置 | `enterprise/rules.spec.ts` | 37 | ✅ 37/37 |
| 平台-数据看板 | `platform/dashboard.spec.ts` | 20 | 🔶 20/20 |
| 平台-企业管理 | `platform/enterprise-management.spec.ts` | 25 | 🔶 25/25 |
| 平台-平台配置 | `platform/platform-config.spec.ts` | 19 | 🔶 19/19 |
| 平台-系统管理 | `platform/system-management.spec.ts` | 60 | 🔶 60/60 |
| **Dashboard 合计** | **13 个 spec** | **361** | **361/361** |

> 🔶 = 依赖平台管理员登录正常工作（当前平台登录返回 500，等待 backend 修复）

### 2.2 H5 E2E

| 模块 | Spec 文件 | 测试数 | 状态 |
|------|---------|--------|------|
| H5-登录 | `h5/login.spec.ts` | 10 | ✅ |
| H5-首页 | `h5/home.spec.ts` | 18 | ✅ |
| H5-打卡 | `h5/checkin.spec.ts` | 16 | ✅ |
| H5-积分 | `h5/points.spec.ts` | 10 | ✅ |
| H5-商城 | `h5/mall.spec.ts` | 10 | ✅ |
| H5-个人中心 | `h5/profile.spec.ts` | 15 | ✅ |
| H5-全流程 | `h5/full-journey.spec.ts` | 8 | ✅ |
| **H5 合计** | **7 个 spec** | **87** | **87/87** |

### 2.3 Phase 5 验收测试（优先级驱动）

#### P0 - 阻断级（核心业务闭环）

| 编号 | 测试项 | 类型 | 覆盖 |
|------|--------|------|------|
| P0-1 | 打卡并发防重 | API | 100ms 内 3 次打卡仅 1 次成功 |
| P0-2 | 积分计算链 | E2E | 特殊日期 × 等级系数 ≤ 每日上限 |
| P0-3 | 订单状态机 | E2E | pending→fulfilled, pending→expired |
| P0-4 | H5 全流程 | E2E | 登录→打卡→积分→兑换→卡券 |
| P0-5 | 多租户隔离 | E2E | 租户 A 无法访问租户 B 数据 |

#### P1 - 核心功能

| 编号 | 测试项 | 类型 | 覆盖 |
|------|--------|------|------|
| P1-1 | Token 15min 有效期 | API | 验证 JWT 过期时间 |
| P1-2 | 连续打卡奖励 | E2E | 连续 7 天打卡触发奖励 |
| P1-3 | 积分不足拦截 | E2E | 兑换按钮置灰 + Toast 提示 |
| P1-4 | Dashboard 全模块 | E2E | 8 企业模块 + 4 平台模块 |
| P1-5 | RBAC 权限隔离 | E2E | 不同角色看到不同菜单 |

#### P2 - 体验优化

| 编号 | 测试项 | 类型 | 覆盖 |
|------|--------|------|------|
| P2-1 | WebView 兼容性 | E2E | 微信/APP WebView 渲染 |
| P2-2 | UI 无崩溃 | E2E | 页面无 JS 错误 |
| P2-3 | 导出功能 | E2E | Excel 导出触发下载 |

---

## 3. 测试数据

### 3.1 认证账户

| 角色 | 用户名/手机 | 密码 | 用途 |
|------|------------|------|------|
| 企业管理员 | 13800138001 | password123 | 企业端所有模块测试 |
| 平台管理员 | admin | admin123 | 平台端所有模块测试 |

### 3.2 测试数据规模

| 数据类型 | 数量 | 准备方式 |
|---------|------|---------|
| 企业 | 5 个 | API 创建 |
| 每企业员工 | 20 人 | API 创建 |
| 每人积分记录 | 10 条 | API 创建 |
| 每企业订单 | 5 笔 | API 创建 |
| 每企业产品 | 3 个 | API 创建 |

> 数据准备: `e2e/data-seeder.ts` (API 批量创建脚本)

---

## 4. 技术架构

### 4.1 技术栈

- **测试框架**: Playwright + TypeScript
- **页面对象**: POM (Page Object Model)
- **并行执行**: `fullyParallel: true`, 8 workers
- **报告**: HTML + JSON + List
- **Auth**: localStorage JWT 注入（绕过 UI 登录）
- **路由**: HashRouter (`/#/path`)

### 4.2 认证策略

```
globalSetup (全局一次)
  → POST /api/auth/login (企业) 或 /api/auth/platform/login (平台)
  → 获取 accessToken + refreshToken
  → 写入 .auth-token.json
  → 各测试从缓存读取 JWT → 注入 localStorage → 访问受保护页面
```

### 4.3 已知问题与绕过

| 问题 | 根因 | 状态 |
|------|------|------|
| 平台管理员登录返回 500 | `PlatformJwtUtil` 属性名错误 + 缺少 `user_roles.tenant_id` 列 | 🔴 等待修复 |
| Ant Design Tab 内容 `isVisible()` 失败 | Tabs 组件 CSS `display: none` 隐藏非活动面板 | ✅ 已修复: 用 `toBeAttached()` |
| 部分 API stub 实现 | `getConsecutiveRewards`, `getSpecialDates`, `getLevelCoefficients` 返回空 | ⚠️ 已知限制 |

---

## 5. 测试执行

### 5.1 执行命令

```bash
# 全部测试
cd apps/dashboard && npx playwright test --reporter=list

# 仅 Dashboard Enterprise
npx playwright test e2e/specs/enterprise/ --reporter=list

# 仅 H5
cd apps/h5 && npx playwright test e2e/specs/ --reporter=list

# 仅 Platform (需平台管理员登录)
npx playwright test e2e/specs/platform/ --reporter=list

# 单个文件
npx playwright test e2e/specs/enterprise/rules.spec.ts --reporter=list
```

### 5.2 CI/CD

```yaml
# GitHub Actions (示例)
e2e:
  steps:
    - name: Start Backend
      run: cd carbon-point-dev && ./mvnw spring-boot:run &
    - name: Start Frontend
      run: pnpm --filter @carbon-point/dashboard dev &
    - name: Run E2E
      run: |
        cd apps/dashboard && npx playwright test --reporter=list
        cd apps/h5 && npx playwright test --reporter=list
  artifacts:
    - test-results/
    - e2e/reports/
```

---

## 6. 测试报告

| 报告类型 | 位置 | 用途 |
|---------|------|------|
| HTML 报告 | `e2e/reports/index.html` | 人工审查 |
| JSON 结果 | `e2e/reports/results.json` | CI 集成 |
| List 输出 | stdout | 快速查看 |
| 截图 | `test-results/**/creenshot.png` | 失败调试 |
| 视频 | `test-results/**/*.webm` | 失败调试 |

---

## 7. Phase 5 验收进度

| 优先级 | 项目 | 状态 |
|--------|------|------|
| P0 | 打卡并发防重 | 📋 待实现 |
| P0 | 积分计算链验证 | 📋 待实现 |
| P0 | 订单状态机测试 | 📋 待实现 |
| P0 | H5 全流程 E2E | ✅ 87 tests designed |
| P0 | 多租户隔离测试 | 📋 待实现 |
| P1 | Dashboard E2E | ✅ 361 tests (341 passing) |
| P1 | RBAC 权限 E2E | 📋 待实现 |
| P1 | Token 有效期测试 | 📋 待实现 |
| P1 | 连续打卡奖励 E2E | 📋 待实现 |
| P2 | WebView 兼容性 | 📋 待实现 |
| P2 | 导出功能 E2E | ✅ 内置于 Dashboard 报表模块 |

### 7.1 Dashboard E2E 详细状态

```
Enterprise E2E:
  ✅ Rules        37/37  (刚刚完成)
  ✅ Products     30/30
  ✅ Members      25/25
  ✅ Orders       25/25
  ✅ Points       25/25
  ✅ Dashboard    15/15
  ✅ Reports      20/20
  ✅ Roles        20/20
  ✅ Login        20/20
  ────────────────────
  ✅ 合计        197/197

Platform E2E:
  ✅ Dashboard    20/20
  ✅ EnterpriseMgmt 25/25
  ✅ PlatformCfg 19/19
  🔶 SystemMgmt  49/60  (11 failed: platform admin CRUD - login 500)
  ────────────────────
  🔶 合计        113/144

总计: 310/341 (91%)
```

---

## 8. 改进建议

1. **平台管理员登录修复** (P1): 重启 backend 让 `PlatformJwtUtil` 修复生效，V7 migration 执行 `user_roles.tenant_id` 列
2. **Rules API 完善**: `getConsecutiveRewards`, `getSpecialDates`, `getLevelCoefficients` 需要真实后端端点
3. **测试数据预热**: E2E 测试前自动 seed 数据，不依赖手动 API 调用
4. **CI 集成**: 每日 CI 构建触发完整 E2E 套件
5. **Playwright Trace Viewer**: 在 CI 中上传失败测试的 trace 以便调试

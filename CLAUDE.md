# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Carbon Point (碳积分打卡平台) — a multi-tenant SaaS platform that incentivizes corporate employees to exercise by climbing stairs and walking, rewarding them with points redeemable for virtual goods. **Current stage: implementation, multi-product architecture live.**

All business specs and implementation plans live in `openspec/`. Key directories:
- `openspec/PLANS/` — Implementation plans
- `openspec/specs/` — Design specifications and improvement docs
- `openspec/changes/` — OpenSpec change management
- `openspec/review/ddl/` — Database schema files

## Planned Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3.x + Java 21, Maven multi-module |
| ORM | MyBatis-Plus with TenantLineInnerInterceptor (multi-tenant via `tenant_id` column) |
| Frontend | React 18 + TypeScript + Ant Design 5 + Vite, pnpm monorepo |
| State | React Query (server) + Zustand (client) |
| Data | MySQL + Redis + OSS |
| Auth | JWT (access_token + refresh_token); payload carries `user_id`, `tenant_id`, `roles` |
| Password Hashing | Argon2id (not BCrypt) |

## Backend Module Layout

```
carbon-common     # Shared: Result<T>, error codes, global exception handler, security utils
carbon-system     # Tenants, users, RBAC, JWT auth, packages, platform admin
carbon-platform   # Product SPI/registry, rule chain engine, trigger abstraction
carbon-stair      # Stair climbing check-in (replaces carbon-checkin)
carbon-walking    # Walking steps integration, step→points conversion
carbon-points     # Point accounts, level progression, PointsEventBus
carbon-mall       # Virtual products (coupon/recharge/privilege), exchange orders
carbon-report     # Dashboards, trend reports, Excel export
carbon-honor      # Honor system (levels, badges, leaderboards)
carbon-app        # Spring Boot application entry point, Flyway migrations
```

Base package: `com.carbonpoint`

## Frontend Structure

```
saas-frontend/
├── enterprise-frontend/   # Enterprise admin (port 3000)
├── h5/                  # User-facing H5 mobile (port 3002, base: /h5/)
└── platform-frontend/    # Platform admin (port 3001)
 
 
```
Note: `packages/` has been inlined into each app — design-system, utils, and api layers are now local to each app for independent deployment.

## Architecture Decisions (Key)

1. **Multi-tenancy**: Shared database, `tenant_id` column isolation. Platform admin queries bypass the tenant interceptor via `@InterceptorIgnore` with manual permission checks in the service layer.
2. **Admin dashboards merged**: Enterprise admin and platform admin share one frontend codebase; login identity determines which menus are shown.
3. **Point rule engine**: JSON config per rule type in `point_rules` table, executed as a fixed-order chain: time-slot match → random base → special-date multiplier → level coefficient → rounding → daily cap → consecutive reward.
4. **RBAC**: Per-tenant independent roles, 3-level control (menu + button + API). `@RequirePerm` AOP annotation for API-level checks. At least one super-admin must remain per tenant.
5. **Check-in concurrency guard**: Database unique index (`user_id` + date + time-slot rule ID) + Redis distributed lock.
6. **Virtual product types**: Coupon (券码, generates unique code), Recharge (直充, user provides phone), Privilege (权益, activates directly). MVP uses self-built virtual products; Ping An Health integration is Phase 2.
7. **User level system**: Based on accumulated points (total_points), not check-in days. Authoritative definition is in `point-engine/spec.md`. Levels: Lv.1 Bronze (0-999) → Lv.2 Silver (1,000+) → Lv.3 Gold (5,000+) → Lv.4 Platinum (20,000+) → Lv.5 Diamond (50,000+).
8. **Order state machine**: pending (frozen points) → fulfilled → used/expired/cancelled (unfrozen on cancel).

## Where to Find Things

| Need | Location |
|------|----------|
| Product vision & scope | `openspec/changes/carbon-point-platform/proposal.md` |
| Architecture decisions (12 total) | `openspec/changes/carbon-point-platform/design.md` |
| Implementation task list (15 groups, ~110+ items) | `openspec/changes/carbon-point-platform/tasks.md` |
| Module-level specs (Given-When-Then, 13 modules) | `openspec/changes/carbon-point-platform/specs/{module}/spec.md` |
| Honor system (levels, badges, leaderboards) | `openspec/specs/2026-04-08-honor-system-mvp-design.md` |
| Phased implementation plan | `openspec/PLANS/2026-04-08-carbon-point-full.md` |
| TDD chunk-based implementation plan | `openspec/PLANS/2026-04-10-carbon-point-platform-full-implementation.md` |
| UX / technical / business / product improvements | `openspec/specs/` |
| Complete DDL with indexes and partitioning | `openspec/review/ddl/carbon-point-schema.sql` |
| Platform review report (4-expert audit) | `openspec/review/2026-04-11-platform-review.md` |

## Project Structure

```
saas-backend/              # 后端多模块 Maven 项目
saas-frontend/             # 前端独立应用（enterprise-frontend / h5 / platform-frontend）
openspec/                  # 业务规范文档
```

## Build & Start Commands

```bash
# 后端 — 必须始终跳过测试编译
cd saas-backend
./mvnw clean package -Dmaven.test.skip=true   # 打包（跳过测试）
java -jar carbon-app/target/carbon-app-1.0.0-SNAPSHOT.jar --spring.profiles.active=dev

# 前端 — 各自独立启动
cd saas-frontend
pnpm --filter @carbon-point/enterprise-frontend dev   # 企业前端 :3000
pnpm --filter @carbon-point/platform-frontend dev     # 平台前端 :3001
pnpm --filter @carbon-point/h5 dev                   # H5 用户端 :3002
```

## Automated Testing Workflow

**TDD / 批量测试原则：先跑完全部测试，再统一修复，不要边测边改。**

1. 运行全部测试（后端优先）：
   ```bash
   cd saas-backend
   ./mvnw test                          # 运行全部模块测试
   cd ../saas-frontend
   pnpm -r test                        # 运行全部前端测试
   ```
2. 收集所有失败的测试用例，不要逐个修复
3. 按优先级排序（阻断性错误 > 功能性错误 > 警告）
4. 从最根本的原因开始修复，修复后重新运行全部测试验证
5. 重复直到全部通过

**禁止**：在一个测试失败后立即修改代码再去跑下一个测试，这会导致测试顺序依赖和修复优先级混乱。

## Unit Test Execution Protocol

执行后端单元测试时必须严格遵循以下规则：

### Serial Execution

- **严禁**并行运行多个 Maven 测试进程
- 一次只执行一个测试类，等待完全结束再启动下一个
- 必须使用单点测试：`./mvnw test -pl <module> -am -Dtest=<ClassName>`

### Batch Processing

- 超过 5 个测试文件时分批执行，每批不超过 3 个
- 每个文件只提取 Surefire 统计行、失败断言和退出码
- 生成结构化摘要后立即丢弃原始 Maven 输出：

```
[文件] <ClassName> | 运行: R | 失败: F | 错误: E | 跳过: S
失败详情: <第一条失败消息，≤200字符>
```

### Resource Checks

- 启动测试前检查：无其他 Maven/Java 测试进程（`pgrep -f surefire`）
- 若系统已有测试进程，等待其结束后再执行
- **禁止**使用固定 `sleep`，使用条件等待

### Command Rules

- **禁止** `./mvnw test`（全量无 `-Dtest`）
- **禁止** `./mvnw test -T`（并行执行）
- 只允许：`./mvnw test -pl <module> -am -Dtest=<ClassName> -q ; echo "EXIT_CODE=$?"`
- 用 `-pl <module> -am` 跳过无关模块
- 用 `-q` 减少日志噪音
- 每个命令后必须捕获退出码

### Exception Handling

- 测试挂起超过 60 秒：`jps -l` 找到进程后 `kill -9`
- 连续 3 个文件失败：暂停执行，报告用户检查环境
- 记录超时文件为"超时失败"后继续下一个

### Context Management

- 每完成一个文件，清理其原始日志
- 上下文 token 超过 70% 时生成检查点（已完成列表、失败清单、待处理队列）
- 清理历史，仅保留检查点

## OpenSpec Workflow

This project uses OpenSpec for specification-driven development. The workflow is:

```
explore → new → continue → apply → verify → archive
```

Available as Claude skills: `openspec-explore`, `openspec-new`, `openspec-continue`, `openspec-ff`, `openspec-propose`, `openspec-apply`, `openspec-verify`, `openspec-archive`, `openspec-sync-specs`.

## Spec Conventions

- Module specs use Given-When-Then format (Requirement → Scenario)
- Design documents record: choice, rationale, alternatives, risks
- Task lists are flat checkbox lists grouped by functional module
- Spec documents are authoritative over implementation plans when they conflict

## Playwright E2E Testing Guidelines

### Locator Priority (high → low)

`getByRole` → `getByLabel` → `getByPlaceholder` → `getByText` → `getByTestId` → avoid CSS/XPath

- **禁止**使用动态 ID、深层级 CSS、索引选择器（如 `:nth-child`）

### Waiting

- **禁止** `page.waitForTimeout()` / `sleep()`
- 依赖自动等待 + `waitForResponse` / `waitForURL` / `expect().toPass()`

### Test Isolation

- 每个测试独立，不共享状态；使用 `beforeEach` 重置环境
- 测试数据必须唯一（时间戳/UUID），测试后清理（`afterEach`）

### Assertions

- 始终使用 `expect(locator).toBeVisible()` 等自动重试断言
- **禁止**手动 `waitForSelector` + 普通断言

### Page Object Design

- 方法只做动作（click/fill），不写断言
- 返回 `Locator` 或 `Promise<void>`，不返回内部数据
- 方法名用动词开头（`addUser`, `clickSubmit`）

### Config Requirements

- 设置 `baseURL`，测试中只用相对路径
- 开启 `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`
- 合理配置 `timeout`（通常 60s）和 `retries`

### File Uploads

- 使用 `page.setInputFiles()` 模拟真实文件
- 测试图片放在 `test-resources` 或临时生成

### Navigation & Network

- 点击触发跳转：`await Promise.all([page.waitForNavigation(), page.click('...')])`
- 等待 API 响应：`await page.waitForResponse(resp => resp.url().includes('/api/...'))`

### Form Validation Testing

- 先填正确数据，再改单个字段触发错误提示
- 验证错误信息可见 + 提交按钮状态变化

### Login State Reuse

- 使用 `storageState` 保存已登录状态
- 避免每个测试重复登录

### Debugging

- 本地调试用 `await page.pause()` 或 `--debug`
- 失败时自动截图 + 录屏 + trace

### Code Maintainability

- 常量（URL、角色名、错误文案）提取到配置文件
- 复杂测试数据生成封装到 `utils/test-data.ts`
- 测试用例命名清晰（如 "应该能添加新用户并在列表中显示"）

### Anti-Patterns (禁止)

- 在测试中直接修改 `localStorage` / `sessionStorage`（除非绝对必要）
- 依赖测试用例的执行顺序
- 使用 `page.evaluate()` 代替 Playwright 原生方法

## Key Domain Rules

- Point calculation chain order is fixed and must not be reordered
- One user belongs to exactly one tenant (1:1 binding)
- Tenant onboarding auto-creates preset role templates and default time-slot rules
- Leaderboard data is cached in Redis with hourly refresh
- H5 must be compatible with WeChat Mini Program WebView and APP WebView (mind older kernel versions)

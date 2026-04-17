# Carbon Point Full Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Carbon Point multi-tenant SaaS carbon credit check-in platform.

**Current Status (2026-04-13):** Phase 0 评审修复已完成大部分，Phase 1 实现进行中。详见 [tasks.md](../openspec/changes/carbon-point-platform/tasks.md)。

> ⚠️ **Note:** Phase 0 评审修复项已大部分完成但仍有遗留项（见 tasks.md），Phase 1 实现 checklist 列出了当前待完成的 7 项关键任务。

**Architecture:** Maven multi-module backend (7 modules) + pnpm Monorepo frontend (2 apps + 4 packages). Multi-tenant isolation via tenant_id field. JWT auth. Point rule chain engine.

**Tech Stack:** Spring Boot 3.3.x / Java 21 / MyBatis-Plus / MySQL+Redis / React 18 / Ant Design 5 / Vite / pnpm

---

## Execution Order

Each phase produces testable, deployable increments. Phases marked ⚡ can run in parallel.

```
Phase 1: Backend Foundation        (sequential, everything depends on this)
Phase 2: Auth + Multi-tenant       (sequential, depends on Phase 1)
  ⚡ Phase 3A: User + RBAC          (parallel with 3B, depends on Phase 2)
  ⚡ Phase 3B: Point Engine         (parallel with 3A, depends on Phase 2)
Phase 4: Check-in System           (depends on 3A + 3B)
Phase 5: Point Accounts            (depends on Phase 4)
  ⚡ Phase 6A: Virtual Mall         (parallel with 6B, depends on Phase 5)
  ⚡ Phase 6B: Reporting            (parallel with 6A, depends on Phase 5)
  ⚡ Phase 6C: Platform Admin       (parallel with 6A/6B, depends on Phase 2)
  ⚡ Phase 7A: Frontend Foundation  (parallel with backend phases)
  ⚡ Phase 7B: Frontend Pages       (depends on 7A)
Phase 8: Integration Tests         (depends on all backend)
```

---

## Phase 1: Backend Foundation

### Task 1.1: Maven Multi-Module Skeleton

**Create:**
- `pom.xml` (parent POM: groupId=com.carbon, artifactId=carbon-point, java 21, Spring Boot 3.3.5)
- `carbon-common/pom.xml`
- `carbon-system/pom.xml`
- `carbon-checkin/pom.xml`
- `carbon-points/pom.xml`
- `carbon-mall/pom.xml`
- `carbon-report/pom.xml`
- `carbon-app/pom.xml` (depends on all modules)

**Dependency versions:**
- spring-boot: 3.3.5
- mybatis-plus-spring-boot3-starter: 3.5.9
- jjwt (io.jsonwebtoken): 0.12.6
- hutool-all: 5.8.34

- [ ] Create parent pom.xml with dependencyManagement
- [ ] Create each module pom.xml with appropriate dependencies
- [ ] Verify: `mvn clean compile` succeeds

### Task 1.2: carbon-common Module

**Create:**
- `com.carbon.common.result.Result<T>` — code(int), message(String), data(T), static ok()/fail()
- `com.carbon.common.result.ResultCode` — enum: SUCCESS(0), PARAM_ERROR(400), UNAUTHORIZED(401), FORBIDDEN(403), NOT_FOUND(404), INTERNAL_ERROR(500), TENANT_SUSPENDED(1001), DUPLICATE_CHECKIN(2001), NO_ACTIVE_TIMESLOT(2002), INSUFFICIENT_POINTS(3001), STOCK_EMPTY(3002), EXCHANGE_LIMIT(3003)
- `com.carbon.common.exception.BusinessException` — extends RuntimeException, resultCode, data
- `com.carbon.common.exception.GlobalExceptionHandler` — @RestControllerAdvice, handle BusinessException → Result, handle MethodArgumentNotValidException → Result, handle Exception → Result
- `com.carbon.common.entity.BaseEntity` — id(Long), createdAt(LocalDateTime), updatedAt(LocalDateTime), tenantId(Long)
- `com.carbon.common.model.PageQuery` — pageNum(default 1), pageSize(default 20)
- `com.carbon.common.model.PageResult<T>` — list(List<T>), total(long), pageNum, pageSize

- [ ] Create Result, ResultCode, BusinessException, GlobalExceptionHandler
- [ ] Create BaseEntity, PageQuery, PageResult
- [ ] Verify: `mvn clean compile -pl carbon-common` succeeds

### Task 1.3: Application Config + Spring Boot Main

**Create:**
- `carbon-app/src/main/resources/application.yml` — server.port=8080, spring.profiles.active=dev
- `carbon-app/src/main/resources/application-dev.yml` — H2 datasource, Redis mock
- `carbon-app/src/main/resources/application-prod.yml` — MySQL, Redis config placeholders
- `carbon-app/src/main/java/com/carbon/app/CarbonPointApplication.java` — @SpringBootApplication

**Create Flyway migrations in carbon-app:**
- `db/migration/V1__init_schema.sql` — ALL table DDLs:
  - tenant, platform_admins
  - users, tenant_invitations, batch_imports
  - roles, permissions, role_permissions, user_roles
  - point_rules
  - check_in_records, point_transactions
  - products, exchange_orders
  - departments, user_departments
  - user_levels, badge_definitions, user_badges
  - operation_logs
- `db/migration/V2__init_data.sql` — permissions seed data (7 modules × ~4 ops = ~28 permission rows)

- [ ] Create application configs
- [ ] Create Flyway V1 (all DDL)
- [ ] Create Flyway V2 (permissions seed)
- [ ] Create CarbonPointApplication main class
- [ ] Verify: `mvn spring-boot:run -pl carbon-app` starts (will fail on Redis, that's OK for now)

---

## Phase 2: Auth + Multi-tenant

### Task 2.1: TenantContext

**Create:**
- `com.carbon.common.context.TenantContext` — ThreadLocal<Long> tenantId, static set/get/clear

### Task 2.2: Multi-tenant Interceptor

**Create:**
- `com.carbon.common.config.MybatisPlusConfig` — @Configuration, register TenantLineInnerInterceptor
- TenantLineHandler impl: getTenantId() from TenantContext, ignore tables: tenant, platform_admins, permissions, badge_definitions
- Verify @InterceptorIgnore works on platform admin queries

### Task 2.3: JWT Auth

**Create:**
- `com.carbon.system.config.SecurityConfig` — Spring Security filter chain, permit /api/v1/auth/**
- `com.carbon.system.util.JwtUtil` — generateAccessToken(userId, tenantId, roles), generateRefreshToken(), parseToken(), isTokenExpired()
- `com.carbon.system.filter.JwtAuthenticationFilter` — OncePerRequestFilter, extract Bearer token, parse, set SecurityContext + TenantContext
- `com.carbon.system.dto.TokenResponse` — accessToken, refreshToken, expiresIn
- Properties: carbon.jwt.secret, carbon.jwt.access-expire=7200, carbon.jwt.refresh-expire=604800

- [ ] Implement TenantContext
- [ ] Implement MybatisPlusConfig with tenant interceptor
- [ ] Implement JwtUtil, JwtAuthenticationFilter, SecurityConfig
- [ ] Verify: application starts, JWT filter active on protected endpoints

---

## Phase 3A: User + RBAC

### Task 3A.1: User Entities + Mappers

**Create in carbon-system:**
- entities: User, Tenant, PlatformAdmin, TenantInvitation, BatchImport, Role, Permission, RolePermission, UserRole
- mappers: UserMapper, TenantMapper, PlatformAdminMapper, etc.
- MyBatis-Plus auto-fill handler for createdAt, updatedAt, tenantId

### Task 3A.2: Auth Service

**Create:**
- `AuthService` — login(phone, password) → TokenResponse, register(phone, password, invitationCode) → User, refreshToken(refreshToken) → TokenResponse, platformLogin(username, password) → TokenResponse
- `AuthController` — POST /api/v1/auth/login, /register, /refresh, /platform-login

### Task 3A.3: User CRUD

**Create:**
- `UserService` — listUsers(pageQuery, keyword), getUser(id), updateUser(id, dto), updateUserStatus(id, status), batchImport(tenantId, file)
- `UserController` — GET/POST/PUT endpoints

### Task 3A.4: Invitation Management

**Create:**
- `InvitationService` — createInvitation(tenantId, maxUses, expiresIn), validateCode(code)
- `InvitationController`

### Task 3A.5: RBAC

**Create:**
- `RoleService` — CRUD roles, assignPermissions, assignRoles
- `PermissionService` — getUserPermissions(userId) with Redis cache, refreshCache on role change
- `@RequirePerm` annotation + `PermissionAspect` AOP
- Super admin protection logic
- `RoleController`, `PermissionController`

- [ ] All entities + mappers
- [ ] Auth (login/register/refresh) + controller
- [ ] User CRUD + controller
- [ ] Invitation + controller
- [ ] RBAC (roles, permissions, cache, @RequirePerm)
- [ ] Verify: can register, login, access protected API with correct role

---

## Phase 3B: Point Rule Engine

### Task 3B.1: Point Rule Entities

**Create in carbon-points:**
- `PointRule` entity — id, tenantId, type(enum: TIME_SLOT, CONSECUTIVE, SPECIAL_DATE, LEVEL, DAILY_CAP), name, config(JSON String), enabled, sortOrder
- `PointRuleMapper`
- Config DTOs: TimeSlotConfig, ConsecutiveConfig, SpecialDateConfig, LevelConfig, DailyCapConfig

### Task 3B.2: Rule CRUD

**Create:**
- `PointRuleService` — createRule, updateRule, deleteRule, toggleRule, listRules(type)
- Time overlap validation for TIME_SLOT rules
- `PointRuleController` — CRUD endpoints

### Task 3B.3: Point Calculation Engine

**Create:**
- `PointCalculationEngine` — calculate(userId, tenantId) → PointCalculationResult
  1. Find enabled TIME_SLOT rules → match current time → random base points
  2. Check SPECIAL_DATE rules → apply multiplier
  3. Check LEVEL rules → find user level tier → apply coefficient
  4. Math.round()
  5. Check DAILY_CAP → get today's total → truncate if needed
  6. Return result (basePoints, multiplier, coefficient, finalPoints, capped, consecutiveBonus)

- [ ] PointRule entity + mapper + config DTOs
- [ ] Rule CRUD with time overlap validation
- [ ] PointCalculationEngine with full chain
- [ ] Verify: given rules config, calculation produces correct results

---

## Phase 4: Check-in System

### Task 4.1: Check-in Core

**Create in carbon-checkin:**
- `CheckInRecord` entity, `CheckInRecordMapper`
- `DistributedLock` utility (Redis SETNX)
- `CheckInService`:
  - checkIn(userId) → CheckInResponse
    1. Redis lock: `checkin:lock:{userId}:{date}`
    2. Find matching time slot rule
    3. Check DB unique constraint (userId + date + ruleId)
    4. Call PointCalculationEngine
    5. Insert check_in_records
    6. Update point_transactions + user balance (atomic)
    7. Check consecutive days → update user.consecutiveDays
    8. Check CONSECUTIVE rules → add bonus if tier hit
    9. Release lock
    10. Return result
- `CheckInController` — POST /api/v1/checkin, GET /today, GET /records, GET /consecutive

- [ ] CheckInRecord entity + mapper
- [ ] DistributedLock utility
- [ ] CheckInService with full flow
- [ ] Verify: check-in succeeds, points calculated correctly, duplicate rejected

---

## Phase 5: Point Accounts

### Task 5.1: Point Account Management

**Create in carbon-points:**
- `PointTransaction` entity, `PointTransactionMapper`
- `PointAccountService`:
  - addPoints(userId, amount, type, relatedId, remark) — atomic balance update + transaction record
  - deductPoints(userId, amount, type, relatedId, remark) — verify balance, atomic deduct
  - getBalance(userId) → {total, available}
  - getTransactions(userId, pageQuery, typeFilter)
  - getStats(userId)
  - grantPoints(userId, amount, remark) — admin manual, requires point:add
  - deductPointsAdmin(userId, amount, remark) — admin manual, requires point:deduct
- `PointAccountController`

- [ ] PointTransaction entity + mapper
- [ ] PointAccountService with atomic balance management
- [ ] Verify: points added/deducted correctly, transactions recorded

---

## Phase 6A: Virtual Mall

### Task 6A.1: Product Management

**Create in carbon-mall:**
- `Product` entity (type enum: COUPON, RECHARGE, PRIVILEGE), `ProductMapper`
- `ProductService` — CRUD, on/off sale, stock management
- `ProductController`

### Task 6A.2: Exchange Flow

**Create:**
- `ExchangeOrder` entity (status enum: PENDING, FULFILLED, USED, EXPIRED, CANCELLED), `ExchangeOrderMapper`
- `ExchangeService`:
  - exchange(userId, productId) → ExchangeOrder
    1. Verify product on sale, in stock, user limit
    2. Verify user balance sufficient
    3. Atomic: deduct points + deduct stock + create order (PENDING→FULFILLED)
    4. Generate fulfillment: coupon→UUID code, recharge→record phone, privilege→activate
  - confirmUse(orderId) — user self-confirm
  - redeemOrder(orderId) — admin redeem
  - listOrders, getCoupons
- `ExchangeController`

### Task 6A.3: Auto-expire Scheduled Task

**Create:**
- `CouponExpireTask` — @Scheduled, mark expired orders

- [ ] Product entity + CRUD
- [ ] Exchange flow with state machine
- [ ] Coupon/recharge/privilege fulfillment
- [ ] Auto-expire task
- [ ] Verify: exchange works, stock deducted, coupons generated

---

## Phase 6B: Reporting

### Task 6B.1: Enterprise Dashboard

**Create in carbon-report:**
- `ReportService` — getEnterpriseDashboard(tenantId): todayCheckinCount, todayPointsIssued, weeklyTrend, activeUsers, hotProducts
- `ReportController`

### Task 6B.2: Platform Dashboard

**Create:**
- `PlatformReportService` — getPlatformDashboard(): totalTenants, activeTenants, totalUsers, totalPoints, totalExchanges
- `PlatformReportController` (uses @InterceptorIgnore)

### Task 6B.3: Trend + Export

**Create:**
- getPointTrend(tenantId, startDate, endDate, groupBy) — daily/weekly/monthly
- exportReport(tenantId, type) — Excel via Apache POI

- [ ] Enterprise dashboard aggregation queries
- [ ] Platform dashboard (bypasses tenant interceptor)
- [ ] Trend reports + Excel export
- [ ] Verify: dashboard returns correct aggregated data

---

## Phase 6C: Platform Admin

### Task 6C.1: Tenant CRUD

**Create in carbon-system:**
- `TenantService` — CRUD tenants (bypass tenant interceptor), activate/suspend, auto-initialization (create preset roles + default rules)
- `TenantController` (under /api/v1/platform/tenants)

### Task 6C.2: Platform Admin Management

**Create:**
- `PlatformAdminService` — CRUD platform admins
- `OperationLog` entity + `@LogOperation` annotation + AOP aspect
- `PlatformAdminController`

### Task 6C.3: Platform Config

**Create:**
- `PlatformConfig` entity — default rule templates, feature toggles
- `PlatformConfigController`

- [ ] Tenant CRUD with auto-initialization
- [ ] Platform admin CRUD + operation logs
- [ ] Platform config management
- [ ] Verify: can create tenant, preset roles auto-created, platform admin can login

---

## Phase 7A: Frontend Foundation

### Task 7A.1: pnpm Monorepo Setup

**Create:**
- `pnpm-workspace.yaml` — packages: ['apps/*', 'packages/*']
- Root `package.json` — scripts: dev:h5, dev:dashboard, build:all
- `tsconfig.base.json`
- `.npmrc` — shamefully-hoist=true

### Task 7A.2: Shared Packages

**Create packages/utils:** token.ts, format.ts, storage.ts, index.ts
**Create packages/api:** client.ts (axios + JWT interceptor), auth.ts, user.ts, checkin.ts, points.ts, products.ts, exchange.ts, reports.ts, platform.ts
**Create packages/hooks:** useAuth.ts, usePermission.ts, usePagination.ts
**Create packages/ui:** shared components (Loading, Empty, etc.)

### Task 7A.3: Dashboard App Scaffold

**Create apps/dashboard:**
- Vite + React + TypeScript + Ant Design setup
- AdminLayout (sidebar + header + content)
- Router with scope-based menus (enterprise vs platform)
- Login page
- Permission framework

### Task 7A.4: H5 App Scaffold

**Create apps/h5:**
- Vite + React + TypeScript + Ant Design Mobile setup
- Bottom tab navigation (5 tabs)
- Mobile viewport meta
- Babel config for WebView compatibility

- [ ] Monorepo init
- [ ] Shared packages (utils, api, hooks, ui)
- [ ] Dashboard app with layout + routing + auth
- [ ] H5 app with bottom nav + mobile config
- [ ] Verify: `pnpm dev:h5` and `pnpm dev:dashboard` both start

---

## Phase 7B: Frontend Pages

### Dashboard Pages (apps/dashboard)
- Dashboard statistics page (cards + charts)
- Members page (table + search + add + import + invitation)
- Rules page (tabs per rule type, CRUD forms)
- Products page (table + form with type config)
- Orders page (table + status filter + redeem)
- Points page (query + grant/deduct + transaction list)
- Roles page (list + permission tree assignment)
- Reports page (charts + export)
- Tenants page (platform scope, table + create + status)
- Platform Admins page
- Operation Logs page
- Platform Config page

### H5 Pages (apps/h5)
- Home (today status, balance, consecutive days, level, shortcuts)
- Check-in (time slot cards, one-click button, result animation)
- Points (balance, level progress, history, rank)
- Mall (product grid, detail, exchange confirm, my coupons)
- Profile (avatar, nickname, settings)
- Rank (leaderboard with tabs: today/week/history)
- Badge center

- [ ] All dashboard pages
- [ ] All H5 pages
- [ ] Verify: full flow works end-to-end (login → check-in → earn points → exchange product)

---

## Phase 8: Integration Tests

### Task 8.1: Test Infrastructure

**Create:**
- `application-test.yml` — H2 + embedded Redis
- `BaseIntegrationTest` — @SpringBootTest setup, create test tenant/user/rules

### Task 8.2: Core Business Tests
- Check-in flow test (happy path, invalid time, duplicate, point calculation)
- Multi-tenant isolation test
- Concurrency test (Redis lock + DB unique index)
- Permission test (RBAC, super admin protection)
- Exchange flow test (all 3 product types, insufficient balance, out of stock)

### Task 8.3: Deployment Config
- `Dockerfile` (multi-stage: Maven build → JRE run)
- `docker-compose.yml` (backend + MySQL + Redis + Nginx)
- `nginx.conf` (frontend serving + API proxy)

- [ ] Test infrastructure
- [ ] All integration test classes pass
- [ ] Docker + compose config
- [ ] Verify: `mvn verify` passes all tests

---

## File Count Estimate

| Module | Files | Description |
|--------|-------|-------------|
| carbon-common | ~15 | Result, exceptions, entities, config |
| carbon-system | ~30 | Auth, users, tenants, RBAC, JWT |
| carbon-checkin | ~12 | Check-in, records, lock |
| carbon-points | ~18 | Rules, engine, accounts, transactions |
| carbon-mall | ~15 | Products, orders, exchange |
| carbon-report | ~10 | Dashboards, trends, export |
| carbon-app | ~8 | Main class, configs, Flyway migrations |
| apps/dashboard | ~40 | Pages, layouts, components, router |
| apps/h5 | ~35 | Pages, components, router |
| packages/* | ~20 | Shared utils, api, hooks, ui |
| **Total** | **~203** | |

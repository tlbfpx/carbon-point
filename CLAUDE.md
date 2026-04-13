# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Carbon Point (碳积分打卡平台) — a multi-tenant SaaS platform that incentivizes corporate employees to exercise by climbing stairs, rewarding them with points redeemable for virtual goods. **Current stage: specification only, no source code yet.**

All business specs live in `openspec/`. Implementation plans and supplementary specs live in `docs/superpowers/`.

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

## Backend Module Layout (Planned)

```
carbon-common     # Shared: Result<T> response wrapper, error codes, global exception handler, constants
carbon-system     # Tenants, users, RBAC, JWT authentication
carbon-checkin    # Check-in logic, time-slot rules, concurrency guard
carbon-points     # Point rule engine, point accounts, level progression
carbon-mall       # Virtual products (coupon/recharge/privilege), exchange orders
carbon-report     # Dashboards, trend reports, Excel export
carbon-app        # Spring Boot application entry point
```

Base package: `com.carbonpoint`

## Frontend Structure (Planned)

```
apps/h5/           # User-facing H5 mobile (embedded in WeChat/APP WebView)
apps/dashboard/    # Enterprise admin + Platform admin (single app, role-scoped menus)
packages/ui/       # Shared UI components
packages/api/      # Shared API layer
packages/hooks/    # Shared React hooks
packages/utils/    # Shared utilities
```

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
| Phased implementation plan | `docs/superpowers/plans/2026-04-08-carbon-point-full.md` |
| TDD chunk-based implementation plan | `docs/superpowers/plans/2026-04-10-carbon-point-platform-full-implementation.md` |
| UX / technical / business / product improvements | `docs/superpowers/specs/` |
| Complete DDL with indexes and partitioning | `docs/review/ddl/carbon-point-schema.sql` |
| Platform review report (4-expert audit) | `docs/review/2026-04-11-platform-review.md` |

## Planned Build & Test Commands (Once Code Exists)

```bash
# Backend (Maven)
./mvnw clean install                    # Build all modules
./mvnw test -pl carbon-checkin          # Run tests for a single module
./mvnw test -Dtest=CheckInServiceTest   # Run a single test class
./mvnw spring-boot:run -pl carbon-app   # Start the application

# Frontend (pnpm monorepo)
pnpm install                            # Install all workspace dependencies
pnpm --filter @carbon-point/h5 dev      # Start H5 dev server
pnpm --filter @carbon-point/dashboard dev  # Start dashboard dev server
pnpm -r build                           # Build all apps
pnpm -r test                            # Run all tests
```

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

## Key Domain Rules

- Point calculation chain order is fixed and must not be reordered
- One user belongs to exactly one tenant (1:1 binding)
- Tenant onboarding auto-creates preset role templates and default time-slot rules
- Leaderboard data is cached in Redis with hourly refresh
- H5 must be compatible with WeChat Mini Program WebView and APP WebView (mind older kernel versions)

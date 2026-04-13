# Carbon Point E2E Tests

## Overview

This directory contains Playwright-based E2E tests for the Carbon Point dashboard application.

## Test Suites

| File | Description | User Type |
|------|-------------|-----------|
| `package-management.spec.ts` | CRUD operations for permission packages (platform admin) | Platform Admin |
| `role-management.spec.ts` | CRUD operations for enterprise roles | Enterprise Super Admin |
| `permission-filtering.spec.ts` | Menu/button visibility based on user permissions | Enterprise Admin/Operator |

## Setup

### 1. Install Dependencies

```bash
cd apps/dashboard
pnpm install
pnpm playwright:install
```

### 2. Configure Environment

```bash
cp .env.e2e.example .env.e2e
# Edit .env.e2e with your test credentials
```

### 3. Start Backend

Ensure the Spring Boot backend is running on port 8081:

```bash
# Backend
cd carbon-app
./mvnw spring-boot:run
```

### 4. Start Frontend (optional - Playwright can start it automatically)

```bash
pnpm dev
```

## Running Tests

### Run all E2E tests

```bash
pnpm --filter @carbon-point/dashboard test:e2e
```

### Run with UI mode (interactive)

```bash
pnpm --filter @carbon-point/dashboard test:e2e:ui
```

### Run with headed browser

```bash
pnpm --filter @carbon-point/dashboard test:e2e:headed
```

### Run specific test suite

```bash
pnpm --filter @carbon-point/dashboard test:e2e:package    # Package management tests
pnpm --filter @carbon-point/dashboard test:e2e:role      # Role management tests
pnpm --filter @carbon-point/dashboard test:e2e:permission  # Permission filtering tests
```

### Run specific test

```bash
npx playwright test package-management.spec.ts --project chromium-platform
```

## Test Users

Create test users in the database:

### Platform Admin

```sql
INSERT INTO platform_admins (username, password_hash, phone, status, created_at)
VALUES ('admin', '$argon2id$...', '13800000000', 'active', NOW());
```

### Enterprise Super Admin

```sql
INSERT INTO users (tenant_id, phone, password_hash, nickname, status, created_at)
VALUES (1, '13800138001', '$argon2id$...', '企业管理员', 'active', NOW());
```

### Enterprise Operator (limited permissions)

```sql
INSERT INTO users (tenant_id, phone, password_hash, nickname, status, created_at)
VALUES (1, '13800138002', '$argon2id$...', '运营专员', 'active', NOW());
```

## Architecture

### Page Objects

Page object classes are in `pages/`:
- `platform-login.ts` - Platform admin login
- `enterprise-login.ts` - Enterprise user login
- `package-management.ts` - Platform package management page
- `role-management.ts` - Enterprise role management page
- `enterprise-dashboard.ts` - Enterprise sidebar navigation

### Authentication

Each test suite uses a specific auth state stored in `e2e/.auth/`:
- `platform-admin.json` - Platform admin session
- `enterprise-admin.json` - Enterprise super admin session
- `enterprise-operator.json` - Enterprise operator session

Auth states are created by running the setup files:
```bash
npx playwright test --project=setup-platform-admin
npx playwright test --project=setup-enterprise-admin
npx playwright test --project=setup-enterprise-operator
```

### Test Configuration

- `playwright.config.ts` - Playwright configuration
- `tsconfig.json` - TypeScript configuration for tests
- `helpers.ts` - Common test utility functions

## CI/CD

In CI environments, set:
```bash
export CI=true
export PLAYWRIGHT_BASE_URL=https://staging.example.com
```

## Debugging

### View traces

```bash
npx playwright show-trace e2e/reports/traces/<trace-id>.zip
```

### View HTML report

```bash
npx playwright show-report e2e/reports
```

## Notes

- Tests are designed to be idempotent (can run multiple times)
- Each test creates its own test data and cleans up
- API responses follow the `Result<T>` wrapper pattern: `{ data, code, message }`
- Ant Design components are used throughout, selectors target `.ant-*` classes

# Platform E2E Tests

## Running Tests

```bash
# Run all platform tests
pnpm playwright test --project=platform

# Run specific test file
pnpm playwright test tests/e2e/platform/login.spec.ts --project=platform

# Run with UI
pnpm playwright test --project=platform --ui

# Run headed (see browser)
pnpm playwright test --project=platform --headed

# Run with trace on failure
pnpm playwright test --project=platform --trace=on-first-retry
```

## Test Files

- `login.spec.ts` - Platform admin login page tests
- `dashboard.spec.ts` - Platform dashboard tests
- `tenants.spec.ts` - Enterprise management tests
- `system.spec.ts` - System config, users, and roles tests

## Page Objects

- `pages/LoginPage.ts` - Platform login page
- `pages/DashboardPage.ts` - Platform dashboard
- `pages/TenantsPage.ts` - Enterprise management page
- `pages/SystemPage.ts` - System config, users, and roles

## Prerequisites

1. Start the backend API:
   ```bash
   cd saas-backend
   ./mvnw spring-boot:run -pl carbon-app
   ```

2. Start the platform frontend:
   ```bash
   cd saas-frontend
   pnpm --filter @carbon-point/platform-frontend dev
   ```

3. Ensure platform admin credentials exist in the database:
   - Default: username `admin`, password `admin123`

## Test Credentials

Platform admin credentials are configured in `config.ts`:
- Username: `admin`
- Password: `admin123`

These can be overridden via environment variables:
- `PLAYWRIGHT_PLATFORM_BASE_URL` - Platform frontend URL (default: http://localhost:3001)
- `PLAYWRIGHT_API_BASE_URL` - API base URL (default: http://localhost:8080)

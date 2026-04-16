# Carbon Point H5 E2E Tests

Playwright E2E tests for the H5 mobile app.

## Test Coverage

| Spec File | Description | Test Count |
|-----------|-------------|------------|
| `specs/h5/login.spec.ts` | Login page rendering, form validation, auth flow | 10 |
| `specs/h5/home.spec.ts` | Home page, greeting, quick entries, TabBar | 18 |
| `specs/h5/checkin.spec.ts` | Check-in flow, time slots, success overlay | 16 |
| `specs/h5/mall.spec.ts` | Mall page, search, product list, navigation | 10 |
| `specs/h5/points.spec.ts` | Points page, level progress, leaderboard | 10 |
| `specs/h5/profile.spec.ts` | Profile page, settings, logout | 15 |
| `specs/h5/full-journey.spec.ts` | Complete user journey, TabBar navigation | 8 |

**Total: ~87 test cases**

## Prerequisites

H5 app is served via nginx at `http://localhost:80/h5`. The backend must be running at `http://localhost:8080`.

## Setup

```bash
cd apps/h5/e2e
pnpm install
playwright install chromium
```

## Run Tests

```bash
# All H5 tests
pnpm test

# Headed mode
pnpm test:headed

# Specific spec
pnpm test specs/h5/login.spec.ts
```

## Test Credentials

- Enterprise Admin: `13800138001` / `password123`
- Test User: `13900000001` / `Test1234!`

## Architecture

- `config.ts` - Base URLs and test credentials
- `helpers.ts` - Auth injection, navigation helpers
- `pages/` - Page Object Models (POM) for each H5 page
- `specs/h5/` - Playwright test specs

## Notes

- Tests use iPhone 13 viewport (375×812)
- Auth bypass: tokens are fetched via API and injected into localStorage
- Some tests are conditional (e.g., skip if already checked in today)

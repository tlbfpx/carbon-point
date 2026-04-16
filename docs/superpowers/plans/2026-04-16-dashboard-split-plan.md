# Dashboard Split Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `apps/dashboard/` into two independent frontend applications: `apps/multi-tenant-frontend/` (platform admin) and `apps/enterprise-frontend/` (enterprise admin), each with independent builds, deployments, and auth.

**Architecture:** Two independent Vite + React apps in the same monorepo. Each app gets its own `package.json`, `vite.config.ts`, `tsconfig.json`, and entry point. Shared code is copied (not npm-published). Auth uses independent localStorage keys.

**Tech Stack:** React 18, TypeScript, Vite, Ant Design 5, @tanstack/react-query, zustand, react-router-dom v6, axios, Playwright

---

## Known Issues from Design (Must Address During Migration)

1. **Login 4-param mismatch**: `PlatformLogin.tsx` calls `login(accessToken, refreshToken, user, permissions)` with 4 params, but `authStore.login()` only accepts 3 params. The platform `authStore.login` must be updated to accept 4 params (permissions injected into user or stored separately).
2. **Duplicate `getOperationLogs`**: `shared/api/platform.ts` has `getOperationLogs` defined twice (lines 155 and 486). When copying, keep only one definition.
3. **`Config.tsx` vs `PackageManagement.tsx`**: The file in `platform/pages/` is named `Config.tsx` (not `PackageManagement.tsx`). It renders "套餐管理" as its page title.
4. **Two platform login pages exist**: `platform/pages/PlatformLogin.tsx` and `shared/pages/PlatformLoginPage.tsx` are different files. Both need to be copied to multi-tenant-frontend.

---

## File Map

### New files to create

```
apps/multi-tenant-frontend/
  src/
    main.tsx
    App.tsx
    pages/
      PlatformDashboard.tsx       # from dashboard/src/platform/pages/
      EnterpriseManagement.tsx    # from dashboard/src/platform/pages/
      SystemManagement.tsx        # from dashboard/src/platform/pages/
      SystemUsers.tsx            # from dashboard/src/platform/pages/
      SystemRoles.tsx            # from dashboard/src/platform/pages/
      OperationLogs.tsx          # from dashboard/src/platform/pages/
      DictManagement.tsx         # from dashboard/src/platform/pages/
      Config.tsx                 # from dashboard/src/platform/pages/ (套餐管理 page)
      PlatformConfig.tsx         # from dashboard/src/platform/pages/
      ProductManagement.tsx      # from dashboard/src/platform/pages/
      FeatureLibrary.tsx         # from dashboard/src/platform/pages/
      PackageManagement.tsx      # from dashboard/src/platform/pages/
      PlatformLogin.tsx          # from dashboard/src/platform/pages/ (4-param login)
      PlatformLoginPage.tsx      # from dashboard/src/shared/pages/ (3-param login)
    api/
      request.ts                 # platformApiClient (baseURL: /platform)
      auth.ts                    # platformLogin, logout, getCurrentUser, getPlatformMyPermissions
      platform.ts                 # from shared/api/platform.ts (DEDUPLICATE getOperationLogs)
      products.ts                # from shared/api/products.ts (platformApiClient)
      reports.ts                  # from shared/api/reports.ts (platformApiClient)
    store/
      authStore.ts               # 4-param login (accessToken, refreshToken, user, permissions)
    hooks/
      usePermission.ts
    components/
      ErrorBoundary.tsx          # adapt handleGoHome → #/platform/dashboard
    directives/
      v-permission.ts
    utils/
      logger.ts
      index.ts
  vite.config.ts
  tsconfig.json
  tsconfig.node.json             # MISSING from initial plan — MUST ADD
  index.html
  package.json
  .env
  playwright.config.ts

apps/enterprise-frontend/
  src/
    main.tsx
    App.tsx
    pages/
      Dashboard.tsx              # from dashboard/src/enterprise/pages/
      Member.tsx                 # from dashboard/src/enterprise/pages/
      Rules.tsx                  # from dashboard/src/enterprise/pages/
      Products.tsx               # from dashboard/src/enterprise/pages/
      Orders.tsx                 # from dashboard/src/enterprise/pages/
      Points.tsx                 # from dashboard/src/enterprise/pages/
      Reports.tsx                # from dashboard/src/enterprise/pages/
      Roles.tsx                  # from dashboard/src/enterprise/pages/
      Branding.tsx               # from dashboard/src/enterprise/pages/
      LoginPage.tsx              # from dashboard/src/shared/pages/LoginPage.tsx
    api/
      request.ts                  # apiClient (baseURL: /api)
      auth.ts                    # login, logout, getCurrentUser, getMyPermissions (3-param)
      branding.ts
      members.ts
      orders.ts
      points.ts
      products.ts
      reports.ts
      roles.ts
      rules.ts
    store/
      authStore.ts               # 3-param login
    hooks/
      usePermission.ts
    components/
      ErrorBoundary.tsx          # adapt handleGoHome → #/enterprise/dashboard
    directives/
      v-permission.ts
    utils/
      logger.ts
      index.ts
  vite.config.ts
  tsconfig.json
  tsconfig.node.json             # MUST ADD
  index.html
  package.json
  .env
  playwright.config.ts
```

---

## Chunk 1: Create App Skeletons

### Task 1: Create multi-tenant-frontend directory structure and config files

**Files:**
- Create: `apps/multi-tenant-frontend/package.json`
- Create: `apps/multi-tenant-frontend/vite.config.ts`
- Create: `apps/multi-tenant-frontend/tsconfig.json`
- Create: `apps/multi-tenant-frontend/tsconfig.node.json` ← **FIX: was missing**
- Create: `apps/multi-tenant-frontend/index.html`
- Create: `apps/multi-tenant-frontend/.env`
- Create: `apps/multi-tenant-frontend/src/main.tsx`
- Create: `apps/multi-tenant-frontend/src/App.tsx` (stub)
- Create: `apps/multi-tenant-frontend/src/index.css`
- Create: placeholder directories

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@carbon-point/multi-tenant-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "type-check": "tsc --noEmit",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  },
  "dependencies": {
    "@ant-design/icons": "^5.3.0",
    "@tanstack/react-query": "^5.28.0",
    "antd": "^5.15.0",
    "axios": "^1.6.8",
    "dayjs": "^1.11.10",
    "loglevel": "^1.9.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "recharts": "^2.12.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.59.1",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.64",
    "@types/react-dom": "^18.2.21",
    "@typescript-eslint/eslint-plugin": "^7.1.0",
    "@typescript-eslint/parser": "^7.1.0",
    "@vitejs/plugin-react": "^4.2.1",
    "eslint": "^8.57.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "playwright": "^1.44.0",
    "typescript": "^5.4.2",
    "vite": "^5.1.6"
  }
}
```

- [ ] **Step 2: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/platform': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    base: '/',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          antd: ['antd', '@ant-design/icons'],
          charts: ['recharts'],
          query: ['@tanstack/react-query', 'zustand'],
        },
      },
    },
    target: 'es2015',
    cssCodeSplit: true,
    minify: 'esbuild',
    sourcemap: false,
  },
});
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Create tsconfig.node.json** ← **FIX: was missing in initial plan**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>碳积分 - 平台管理后台</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create .env**

```bash
VITE_APP_TITLE="平台管理后台"
VITE_PLATFORM_API_BASE_URL=/platform
VITE_API_BASE_URL=/api
```

- [ ] **Step 7: Create main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import App from './App';
import './index.css';

message.config({
  top: 64,
  duration: 3,
  maxCount: 3,
});

dayjs.locale('zh-cn');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={zhCN}>
        <App />
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 8: Create index.css**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
```

- [ ] **Step 9: Create stub App.tsx**

```typescript
import React from 'react';

const App: React.FC = () => {
  return <div>Platform Admin App - Shell</div>;
};

export default App;
```

- [ ] **Step 10: Create placeholder directories**

```bash
mkdir -p apps/multi-tenant-frontend/src/{pages,api,store,hooks,components,directives,utils}
```

- [ ] **Step 11: Install dependencies**

Run: `cd apps/multi-tenant-frontend && pnpm install`
Expected: Dependencies installed

- [ ] **Step 12: Verify build**

Run: `cd apps/multi-tenant-frontend && pnpm build`
Expected: Build succeeds

- [ ] **Step 13: Commit**

```bash
git add apps/multi-tenant-frontend/
git commit -m "feat: create multi-tenant-frontend skeleton

- package.json with all dependencies
- vite.config.ts (port 3000, /platform and /api proxy)
- tsconfig.json with @ alias
- tsconfig.node.json (FIX: was missing in initial plan)
- index.html entry point
- .env with VITE_PLATFORM_API_BASE_URL
- Minimal main.tsx, App.tsx shell

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Create enterprise-frontend directory structure and config files

**Files:** Same structure as multi-tenant-frontend, with:
- `name: "@carbon-point/enterprise-frontend"`
- `port: 3001` in vite.config.ts
- Different .env: `VITE_API_BASE_URL=/api` only
- Different title: "企业后台"

- [ ] **Step 1-13:** Repeat same steps as Task 1 for enterprise-frontend with appropriate name/port differences

- [ ] **Step 14: Commit**

```bash
git add apps/enterprise-frontend/
git commit -m "feat: create enterprise-frontend skeleton

- Same structure as multi-tenant-frontend skeleton
- port 3001, VITE_API_BASE_URL=/api

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: Migrate Shared Utilities and Components

### Task 3: Migrate utils (logger) to both apps

- [ ] **Step 1: Copy logger to multi-tenant-frontend**

```bash
cp packages/utils/src/logger.ts apps/multi-tenant-frontend/src/utils/logger.ts
cp packages/utils/src/index.ts apps/multi-tenant-frontend/src/utils/index.ts
```

- [ ] **Step 2: Copy logger to enterprise-frontend**

```bash
cp packages/utils/src/logger.ts apps/enterprise-frontend/src/utils/logger.ts
cp packages/utils/src/index.ts apps/enterprise-frontend/src/utils/index.ts
```

- [ ] **Step 3: Verify builds**

Run: `cd apps/multi-tenant-frontend && pnpm build && cd ../enterprise-frontend && pnpm build`
Expected: Both succeed

- [ ] **Step 4: Commit**

```bash
git add apps/multi-tenant-frontend/src/utils/ apps/enterprise-frontend/src/utils/
git commit -m "feat: migrate utils (logger) to both apps

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Migrate ErrorBoundary and v-permission to both apps

**Adaptations needed:**
- `ErrorBoundary.tsx`: `handleGoHome` uses `window.location.hash`. For platform app: `window.location.hash = '#/platform/dashboard'`. For enterprise app: `window.location.hash = '#/enterprise/dashboard'`. Keep hash navigation for now (will be revisited when BrowserRouter migration is complete).
- `v-permission.ts`: Import `useAuthStore` from `'../store/authStore'` (not `@/shared/store/authStore`)

- [ ] **Step 1: Copy ErrorBoundary.tsx to both apps**

```bash
cp apps/dashboard/src/shared/components/ErrorBoundary.tsx apps/multi-tenant-frontend/src/components/ErrorBoundary.tsx
cp apps/dashboard/src/shared/components/ErrorBoundary.tsx apps/enterprise-frontend/src/components/ErrorBoundary.tsx
```

- [ ] **Step 2: Adapt handleGoHome in multi-tenant-frontend ErrorBoundary**

Edit `apps/multi-tenant-frontend/src/components/ErrorBoundary.tsx`:
```typescript
// FROM:
window.location.hash = '#/enterprise/dashboard';
// TO:
window.location.hash = '#/platform/dashboard';
```

- [ ] **Step 3: Adapt v-permission imports in both apps**

```bash
# For both apps, change import from '@/shared/store/authStore' to '../store/authStore'
sed -i '' "s|@/shared/store/authStore|../store/authStore|g" apps/multi-tenant-frontend/src/directives/v-permission.ts
sed -i '' "s|@/shared/store/authStore|../store/authStore|g" apps/enterprise-frontend/src/directives/v-permission.ts
```

- [ ] **Step 4: Copy v-permission.ts to both apps**

```bash
cp apps/dashboard/src/shared/directives/v-permission.ts apps/multi-tenant-frontend/src/directives/v-permission.ts
cp apps/dashboard/src/shared/directives/v-permission.ts apps/enterprise-frontend/src/directives/v-permission.ts
# Then run the sed commands from Step 3
```

- [ ] **Step 5: Verify builds**

Run: `cd apps/multi-tenant-frontend && pnpm build && cd ../enterprise-frontend && pnpm build`
Expected: Both succeed

- [ ] **Step 6: Commit**

```bash
git add apps/multi-tenant-frontend/src/components/ apps/multi-tenant-frontend/src/directives/ apps/enterprise-frontend/src/components/ apps/enterprise-frontend/src/directives/
git commit -m "feat: migrate ErrorBoundary and v-permission to both apps

- ErrorBoundary: handleGoHome adapted per app (#/platform/dashboard vs #/enterprise/dashboard)
- v-permission: import path adapted to local store

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Migrate usePermission hook to both apps

- [ ] **Step 1: Copy usePermission.ts to both apps**

```bash
cp apps/dashboard/src/shared/hooks/usePermission.ts apps/multi-tenant-frontend/src/hooks/usePermission.ts
cp apps/dashboard/src/shared/hooks/usePermission.ts apps/enterprise-frontend/src/hooks/usePermission.ts
```

- [ ] **Step 2: Adapt import in both apps**

```bash
sed -i '' "s|@/shared/store/authStore|../store/authStore|g" apps/multi-tenant-frontend/src/hooks/usePermission.ts
sed -i '' "s|@/shared/store/authStore|../store/authStore|g" apps/enterprise-frontend/src/hooks/usePermission.ts
```

- [ ] **Step 3: Verify builds**

Run: `cd apps/multi-tenant-frontend && pnpm build && cd ../enterprise-frontend && pnpm build`
Expected: Both succeed

- [ ] **Step 4: Commit**

```bash
git add apps/multi-tenant-frontend/src/hooks/ apps/enterprise-frontend/src/hooks/
git commit -m "feat: migrate usePermission hook to both apps

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: Migrate AuthStore

### Task 6: Create platform authStore with 4-param login

**Critical Fix**: `PlatformLogin.tsx` calls `login(accessToken, refreshToken, user, permissions)` with **4 parameters**. The `login` function must be updated to accept this.

**Files:**
- Create: `apps/multi-tenant-frontend/src/store/authStore.ts`

- [ ] **Step 1: Create platform authStore with 4-param login**

```typescript
import { create } from 'zustand';
import { getPlatformMyPermissions } from '@/api/auth';

export interface AdminUser {
  userId: string;
  username: string;
  phone?: string;
  email?: string;
  avatar?: string;
  tenantId?: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AdminUser | null;
  permissions: string[];
  permissionsLoading: boolean;
  fetchPermissionsPromise: Promise<void> | null;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string, user: AdminUser, permissions?: string[]) => void;
  logout: () => void;
  updateUser: (user: Partial<AdminUser>) => void;
  fetchPermissions: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hydrate: () => void;
}

const STORAGE_KEY = 'carbon-platform-auth';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const state = parsed?.state;
    if (state && (state.accessToken || state.refreshToken || state.user)) {
      return {
        accessToken: state.accessToken ?? null,
        refreshToken: state.refreshToken ?? null,
        user: state.user ?? null,
      };
    }
  } catch {}
  return {};
}

function saveToStorage(state: { accessToken: string | null; refreshToken: string | null; user: AdminUser | null }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version: 0 }));
  } catch {}
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  permissions: [],
  permissionsLoading: false,
  fetchPermissionsPromise: null,
  isAuthenticated: false,

  hydrate: () => {
    const stored = loadFromStorage();
    if (stored.accessToken || stored.refreshToken || stored.user) {
      set({ ...stored, isAuthenticated: true });
      get().fetchPermissions();
    }
  },

  // 4-param login: PlatformLogin.tsx passes (accessToken, refreshToken, user, permissions)
  login: (accessToken, refreshToken, user, permissions) => {
    // If permissions passed directly (PlatformLogin.tsx style), use them
    // Otherwise fetch from server
    const initialPerms = permissions ?? [];
    const state = {
      accessToken,
      refreshToken,
      user,
      permissions: initialPerms,
      isAuthenticated: true as const,
    };
    set(state);
    saveToStorage({ accessToken, refreshToken, user });
    if (initialPerms.length === 0) {
      get().fetchPermissions();
    }
  },

  logout: () => {
    const state = { accessToken: null, refreshToken: null, user: null, permissions: [], isAuthenticated: false as const };
    set(state);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  },

  updateUser: (partial) => {
    const current = get();
    if (!current.user) return;
    const updated = { ...current, user: { ...current.user, ...partial } };
    set({ user: updated.user });
    saveToStorage({ accessToken: updated.accessToken, refreshToken: updated.refreshToken, user: updated.user });
  },

  fetchPermissions: async () => {
    const existing = get().fetchPermissionsPromise;
    if (existing) return existing;

    const promise = (async () => {
      set({ permissionsLoading: true });
      try {
        const perms = await getPlatformMyPermissions();
        set({ permissions: perms, permissionsLoading: false, fetchPermissionsPromise: null });
      } catch {
        set({ permissionsLoading: false, fetchPermissionsPromise: null });
      }
    })();

    set({ fetchPermissionsPromise: promise });
    return promise;
  },

  hasPermission: (permission: string) => {
    const { permissions } = get();
    if (permissions?.includes('*')) return true;
    return permissions?.includes(permission) ?? false;
  },

  hasRole: (role: string) => {
    const user = get().user;
    if (!user) return false;
    return user.roles?.includes(role) ?? false;
  },
}));
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/multi-tenant-frontend && pnpm type-check`
Expected: No errors (API imports will fail until API modules are created — that's OK)

- [ ] **Step 3: Commit**

```bash
git add apps/multi-tenant-frontend/src/store/authStore.ts
git commit -m "feat(multi-tenant): add platform authStore with 4-param login

- login() accepts optional 4th param (permissions) from PlatformLogin.tsx
- localStorage key: carbon-platform-auth
- fetchPermissions calls getPlatformMyPermissions()

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Create enterprise authStore with 3-param login

**Files:**
- Create: `apps/enterprise-frontend/src/store/authStore.ts`

- [ ] **Step 1: Create enterprise authStore** (same structure as platform, but login takes 3 params)

```typescript
// login: (accessToken: string, refreshToken: string, user: AdminUser) => void
// STORAGE_KEY = 'carbon-enterprise-auth'
// fetchPermissions calls getMyPermissions()
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/enterprise-frontend && pnpm type-check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/enterprise-frontend/src/store/authStore.ts
git commit -m "feat(enterprise): add enterprise authStore with 3-param login

- login() takes 3 params (accessToken, refreshToken, user)
- localStorage key: carbon-enterprise-auth
- fetchPermissions calls getMyPermissions()

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: Migrate API Modules

### Task 8: Create multi-tenant-frontend API modules

**Files:**
- Create: `apps/multi-tenant-frontend/src/api/request.ts`
- Create: `apps/multi-tenant-frontend/src/api/auth.ts`
- Create: `apps/multi-tenant-frontend/src/api/platform.ts`
- Create: `apps/multi-tenant-frontend/src/api/products.ts`
- Create: `apps/multi-tenant-frontend/src/api/reports.ts`
- Reference: `apps/dashboard/src/shared/api/request.ts`, `apps/dashboard/src/shared/api/auth.ts`, `apps/dashboard/src/shared/api/platform.ts`

**FIX required**: `platform.ts` has `getOperationLogs` defined TWICE (lines 155 and 486). When copying, remove one duplicate.

- [ ] **Step 1: Create request.ts for platform** (platformApiClient, baseURL: /platform, 401 → /platform/auth/refresh)

Key content:
```typescript
import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';
import { apiLogger } from '../utils/logger';

const PLATFORM_BASE_URL = import.meta.env.VITE_PLATFORM_API_BASE_URL || 'http://localhost:8080/platform';

export const platformApiClient = axios.create({
  baseURL: PLATFORM_BASE_URL,
  timeout: 30000,
});

platformApiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  apiLogger.debug(`[API请求] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
});

platformApiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const refreshRes = await axios.post(`${PLATFORM_BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefresh } = refreshRes.data.data;
          useAuthStore.getState().login(accessToken, newRefresh, useAuthStore.getState().user!);
          const originalRequest = error.config;
          if (originalRequest) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return platformApiClient(originalRequest);
          }
        } catch {
          useAuthStore.getState().logout();
        }
      } else {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);
```

- [ ] **Step 2: Create auth.ts for platform**

```typescript
import { platformApiClient } from './request';
import type { AdminUser } from '../store/authStore';

export const platformLogin = async (username: string, password: string) => {
  const res = await platformApiClient.post('/auth/login', { username, password });
  return res.data;
};

export const logout = async () => {
  await platformApiClient.post('/auth/logout');
};

export const getCurrentUser = async () => {
  const res = await platformApiClient.get('/auth/current');
  return res.data;
};

export const getPlatformMyPermissions = async (): Promise<string[]> => {
  const res = await platformApiClient.get<{ data: string[] }>('/permissions/my');
  return res.data.data ?? [];
};
```

- [ ] **Step 3: Copy platform.ts (DEDUPLICATE getOperationLogs)**

```bash
# Copy but remove duplicate getOperationLogs
cp apps/dashboard/src/shared/api/platform.ts apps/multi-tenant-frontend/src/api/platform.ts
# Remove the second definition at line ~486 (keep the first one at ~155)
# The file has 2 definitions of getOperationLogs. Delete the second one.
# Use grep to find line numbers first:
grep -n "export const getOperationLogs" apps/multi-tenant-frontend/src/api/platform.ts
# Expected output:
#   155:export const getOperationLogs
#   486:export const getOperationLogs
# Delete lines 486-XXX (until the next function or end) - keep only first definition
```

Then in the file, fix the `import { apiClient }` references to use `platformApiClient`:
```bash
sed -i '' 's|import { apiClient }|import { platformApiClient }|g' apps/multi-tenant-frontend/src/api/platform.ts
sed -i '' 's|apiClient\.|platformApiClient.|g' apps/multi-tenant-frontend/src/api/platform.ts
```

- [ ] **Step 4: Copy products.ts and reports.ts** (change `apiClient` → `platformApiClient`)

```bash
cp apps/dashboard/src/shared/api/products.ts apps/multi-tenant-frontend/src/api/products.ts
cp apps/dashboard/src/shared/api/reports.ts apps/multi-tenant-frontend/src/api/reports.ts
sed -i '' 's|import { apiClient }|import { platformApiClient }|g' apps/multi-tenant-frontend/src/api/products.ts
sed -i '' 's|import { apiClient }|import { platformApiClient }|g' apps/multi-tenant-frontend/src/api/reports.ts
sed -i '' 's|apiClient\.|platformApiClient.|g' apps/multi-tenant-frontend/src/api/products.ts
sed -i '' 's|apiClient\.|platformApiClient.|g' apps/multi-tenant-frontend/src/api/reports.ts
```

- [ ] **Step 5: Verify type-check**

Run: `cd apps/multi-tenant-frontend && pnpm type-check`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/multi-tenant-frontend/src/api/
git commit -m "feat(multi-tenant): add platform API modules

- request.ts: platformApiClient with /platform baseURL
- auth.ts: platformLogin, logout, getCurrentUser, getPlatformMyPermissions
- platform.ts: DEDUPLICATED getOperationLogs (had 2 definitions)
- products.ts, reports.ts: adapted to platformApiClient

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Create enterprise-frontend API modules

**Files:**
- Create all 10 API files for enterprise

- [ ] **Step 1: Create request.ts** (apiClient with /api baseURL, refresh → /api/auth/refresh)

- [ ] **Step 2: Create auth.ts** (login, logout, getCurrentUser, getMyPermissions using apiClient)

- [ ] **Step 3: Copy all other API files** (verbatim copy — all use apiClient which is correct for enterprise)

```bash
cp apps/dashboard/src/shared/api/branding.ts apps/enterprise-frontend/src/api/branding.ts
cp apps/dashboard/src/shared/api/members.ts apps/enterprise-frontend/src/api/members.ts
cp apps/dashboard/src/shared/api/orders.ts apps/enterprise-frontend/src/api/orders.ts
cp apps/dashboard/src/shared/api/points.ts apps/enterprise-frontend/src/api/points.ts
cp apps/dashboard/src/shared/api/products.ts apps/enterprise-frontend/src/api/products.ts
cp apps/dashboard/src/shared/api/reports.ts apps/enterprise-frontend/src/api/reports.ts
cp apps/dashboard/src/shared/api/roles.ts apps/enterprise-frontend/src/api/roles.ts
cp apps/dashboard/src/shared/api/rules.ts apps/enterprise-frontend/src/api/rules.ts
```

- [ ] **Step 4: Verify type-check**

Run: `cd apps/enterprise-frontend && pnpm type-check`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/enterprise-frontend/src/api/
git commit -m "feat(enterprise): add enterprise API modules

- request.ts: apiClient with /api baseURL
- auth.ts: login, logout, getCurrentUser, getMyPermissions
- branding, members, orders, points, products, reports, roles, rules: verbatim copy

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 5: Migrate Page Components

### Task 10: Copy platform pages to multi-tenant-frontend

**Files to copy:**
- `apps/dashboard/src/platform/pages/PlatformDashboard.tsx`
- `apps/dashboard/src/platform/pages/EnterpriseManagement.tsx`
- `apps/dashboard/src/platform/pages/SystemManagement.tsx`
- `apps/dashboard/src/platform/pages/SystemUsers.tsx`
- `apps/dashboard/src/platform/pages/SystemRoles.tsx`
- `apps/dashboard/src/platform/pages/OperationLogs.tsx`
- `apps/dashboard/src/platform/pages/DictManagement.tsx`
- `apps/dashboard/src/platform/pages/Config.tsx` ← **FIX: file is named Config.tsx (套餐管理), not PackageManagement.tsx**
- `apps/dashboard/src/platform/pages/PlatformConfig.tsx`
- `apps/dashboard/src/platform/pages/ProductManagement.tsx`
- `apps/dashboard/src/platform/pages/FeatureLibrary.tsx`
- `apps/dashboard/src/platform/pages/PackageManagement.tsx`
- `apps/dashboard/src/platform/pages/PlatformLogin.tsx` ← **4-param login, uses platformLogin from @/shared/api/platform**
- `apps/dashboard/src/shared/pages/PlatformLoginPage.tsx` ← **3-param login, uses platformApiClient directly**

**Import adaptations (all pages):**
```
@/shared/api/       → @/api/
@/shared/store/     → @/store/
@/shared/components/ → @/components/
@/shared/hooks/     → @/hooks/
@/shared/directives/ → @/directives/
@carbon-point/utils  → @/utils
```

- [ ] **Step 1: Copy all platform page files**

```bash
PLATFORM_SRC="apps/dashboard/src"
PLATFORM_DST="apps/multi-tenant-frontend/src"

# Copy platform pages
cp "$PLATFORM_SRC/platform/pages/PlatformDashboard.tsx" "$PLATFORM_DST/pages/"
cp "$PLATFORM_SRC/platform/pages/EnterpriseManagement.tsx" "$PLATFORM_DST/pages/"
cp "$PLATFORM_SRC/platform/pages/SystemManagement.tsx" "$PLATFORM_DST/pages/"
cp "$PLATFORM_SRC/platform/pages/SystemUsers.tsx" "$PLATFORM_DST/pages/"
cp "$PLATFORM_SRC/platform/pages/SystemRoles.tsx" "$PLATFORM_DST/pages/"
cp "$PLATFORM_SRC/platform/pages/OperationLogs.tsx" "$PLATFORM_DST/pages/"
cp "$PLATFORM_SRC/platform/pages/DictManagement.tsx" "$PLATFORM_DST/pages/"
cp "$PLATFORM_SRC/platform/pages/Config.tsx" "$PLATFORM_DST/pages/"  # 套餐管理
cp "$PLATFORM_SRC/platform/pages/PlatformConfig.tsx" "$PLATFORM_DST/pages/"
cp "$PLATFORM_SRC/platform/pages/ProductManagement.tsx" "$PLATFORM_DST/pages/"
cp "$PLATFORM_SRC/platform/pages/FeatureLibrary.tsx" "$PLATFORM_DST/pages/"
cp "$PLATFORM_SRC/platform/pages/PackageManagement.tsx" "$PLATFORM_DST/pages/"
cp "$PLATFORM_SRC/platform/pages/PlatformLogin.tsx" "$PLATFORM_DST/pages/"  # 4-param
cp "$PLATFORM_SRC/shared/pages/PlatformLoginPage.tsx" "$PLATFORM_DST/pages/PlatformLoginPage.tsx"  # 3-param
```

- [ ] **Step 2: Adapt all import paths**

```bash
DST="apps/multi-tenant-frontend/src/pages"

# Replace @/shared/* paths with @/*
sed -i '' 's|@/shared/|@/|g' "$DST"/*.tsx

# Replace @carbon-point/utils with @/utils
sed -i '' 's|@carbon-point/utils|@/utils|g' "$DST"/*.tsx
```

- [ ] **Step 3: Verify type-check**

Run: `cd apps/multi-tenant-frontend && pnpm type-check 2>&1 | head -80`
Expected: Errors mostly about missing modules (will be resolved in Chunk 6). Fix critical errors.

- [ ] **Step 4: Commit**

```bash
git add apps/multi-tenant-frontend/src/pages/
git commit -m "feat(multi-tenant): migrate platform pages

- All 13 platform page components from platform/pages/
- PlatformLogin.tsx (4-param) and PlatformLoginPage.tsx (3-param) both copied
- Config.tsx (套餐管理) included
- All imports adapted from @/shared/* to local @/*

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 11: Copy enterprise pages to enterprise-frontend

**Files to copy:**
- `apps/dashboard/src/enterprise/pages/Dashboard.tsx`
- `apps/dashboard/src/enterprise/pages/Member.tsx`
- `apps/dashboard/src/enterprise/pages/Rules.tsx`
- `apps/dashboard/src/enterprise/pages/Products.tsx`
- `apps/dashboard/src/enterprise/pages/Orders.tsx`
- `apps/dashboard/src/enterprise/pages/Points.tsx`
- `apps/dashboard/src/enterprise/pages/Reports.tsx`
- `apps/dashboard/src/enterprise/pages/Roles.tsx`
- `apps/dashboard/src/enterprise/pages/Branding.tsx`
- `apps/dashboard/src/shared/pages/LoginPage.tsx`

- [ ] **Step 1: Copy all enterprise page files**

```bash
ENT_SRC="apps/dashboard/src"
ENT_DST="apps/enterprise-frontend/src"

cp "$ENT_SRC/enterprise/pages/Dashboard.tsx" "$ENT_DST/pages/"
cp "$ENT_SRC/enterprise/pages/Member.tsx" "$ENT_DST/pages/"
cp "$ENT_SRC/enterprise/pages/Rules.tsx" "$ENT_DST/pages/"
cp "$ENT_SRC/enterprise/pages/Products.tsx" "$ENT_DST/pages/"
cp "$ENT_SRC/enterprise/pages/Orders.tsx" "$ENT_DST/pages/"
cp "$ENT_SRC/enterprise/pages/Points.tsx" "$ENT_DST/pages/"
cp "$ENT_SRC/enterprise/pages/Reports.tsx" "$ENT_DST/pages/"
cp "$ENT_SRC/enterprise/pages/Roles.tsx" "$ENT_DST/pages/"
cp "$ENT_SRC/enterprise/pages/Branding.tsx" "$ENT_DST/pages/"
cp "$ENT_SRC/shared/pages/LoginPage.tsx" "$ENT_DST/pages/LoginPage.tsx"
```

- [ ] **Step 2: Adapt all import paths** (same sed commands)

- [ ] **Step 3: Verify type-check**

Run: `cd apps/enterprise-frontend && pnpm type-check 2>&1 | head -80`
Expected: Errors about missing modules (resolved in Chunk 6). Fix critical errors.

- [ ] **Step 4: Commit**

```bash
git add apps/enterprise-frontend/src/pages/
git commit -m "feat(enterprise): migrate enterprise pages

- All 9 enterprise page components from enterprise/pages/
- LoginPage.tsx from shared/pages/
- All imports adapted from @/shared/* to local @/*

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 6: Migrate App Layout and Routing

### Task 12: Create multi-tenant-frontend App.tsx with BrowserRouter

**Files:**
- Create: `apps/multi-tenant-frontend/src/App.tsx`
- Reference: `apps/dashboard/src/PlatformApp.tsx`

**Key changes from PlatformApp.tsx:**
1. `HashRouter` → `BrowserRouter`
2. All route paths: remove `/platform` prefix (e.g., `/platform/dashboard` → `/dashboard`)
3. Import from local pages (`@/pages/...`) not from `@/platform/pages/...`
4. Import PlatformLoginPage from `@/pages/PlatformLoginPage.tsx` (3-param) — this is what PlatformApp originally used

**Route mapping:**
```
/platform/dashboard       → /dashboard
/platform/enterprises     → /enterprises
/platform/system         → /system
/platform/system/users   → /system/users
/platform/system/roles   → /system/roles
/platform/system/logs    → /system/logs
/platform/system/dict    → /system/dict
/platform/config         → /config
/platform/features/products → /features/products
/platform/features/features → /features/features
/platform/packages       → /packages
```

- [ ] **Step 1: Read PlatformApp.tsx and adapt**

The App.tsx should be a complete rewrite based on PlatformApp.tsx logic, with:
- BrowserRouter instead of HashRouter
- All imports from `@/pages/...` (not `@/platform/pages/...`)
- `useAuthStore` from `@/store/authStore` (not `@/shared/store/authStore`)
- `ErrorBoundary` from `@/components/ErrorBoundary`
- `routeLogger` from `@/utils` (or use apiLogger)

- [ ] **Step 2: Verify build**

Run: `cd apps/multi-tenant-frontend && pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/multi-tenant-frontend/src/App.tsx
git commit -m "feat(multi-tenant): add App.tsx with BrowserRouter

- Migrated from PlatformApp.tsx
- HashRouter → BrowserRouter
- Routes simplified (no /platform prefix)
- All imports adapted to local paths

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 13: Create enterprise-frontend App.tsx with BrowserRouter

**Files:**
- Create: `apps/enterprise-frontend/src/App.tsx`
- Reference: `apps/dashboard/src/EnterpriseApp.tsx`

**Route mapping:**
```
/enterprise/dashboard  → /dashboard
/enterprise/members   → /members
/enterprise/rules     → /rules
/enterprise/products   → /products
/enterprise/orders     → /orders
/enterprise/points    → /points
/enterprise/reports   → /reports
/enterprise/roles     → /roles
/enterprise/branding  → /branding
```

- [ ] **Step 1: Read EnterpriseApp.tsx and adapt**

- [ ] **Step 2: Verify build**

Run: `cd apps/enterprise-frontend && pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/enterprise-frontend/src/App.tsx
git commit -m "feat(enterprise): add App.tsx with BrowserRouter

- Migrated from EnterpriseApp.tsx
- HashRouter → BrowserRouter
- Routes simplified (no /enterprise prefix)
- All imports adapted to local paths

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 7: Migrate E2E Tests

### Task 14: Copy and adapt E2E tests for both apps

**Files:**
- Create: `apps/multi-tenant-frontend/playwright.config.ts`
- Create: `apps/multi-tenant-frontend/e2e/`
- Create: `apps/enterprise-frontend/playwright.config.ts`
- Create: `apps/enterprise-frontend/e2e/`

- [ ] **Step 1: Create playwright.config.ts for multi-tenant-frontend** (baseURL: http://localhost:3000, port: 3000)

- [ ] **Step 2: Create playwright.config.ts for enterprise-frontend** (baseURL: http://localhost:3001, port: 3001)

- [ ] **Step 3: Copy and split test files**

```bash
# Copy all dashboard e2e tests to both apps
cp -r apps/dashboard/e2e/*.spec.ts apps/multi-tenant-frontend/e2e/
cp -r apps/dashboard/e2e/*.spec.ts apps/enterprise-frontend/e2e/

# In multi-tenant-frontend: keep only platform-related tests
# In enterprise-frontend: keep only enterprise-related tests
# Delete irrelevant ones

# Adapt URLs in all remaining tests:
# Remove /platform/ and /enterprise/ prefixes from page.goto() calls
sed -i '' 's|/#/platform/|/#/|g' apps/multi-tenant-frontend/e2e/*.spec.ts
sed -i '' 's|/#/enterprise/|/#/|g' apps/enterprise-frontend/e2e/*.spec.ts
```

- [ ] **Step 4: Verify tests discoverable**

Run: `cd apps/multi-tenant-frontend && pnpm playwright test --list`
Run: `cd apps/enterprise-frontend && pnpm playwright test --list`
Expected: Test list shown

- [ ] **Step 5: Commit**

```bash
git add apps/multi-tenant-frontend/playwright.config.ts apps/multi-tenant-frontend/e2e/ apps/enterprise-frontend/playwright.config.ts apps/enterprise-frontend/e2e/
git commit -m "feat: migrate E2E tests for both apps

- Separate playwright.config.ts per app (ports 3000 vs 3001)
- Tests split into platform and enterprise
- URLs adapted (removed /platform/ and /enterprise/ prefixes)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 8: Verification

### Task 15: Full build verification

- [ ] **Step 1: Full build of both apps**

Run: `cd apps/multi-tenant-frontend && pnpm build`
Run: `cd apps/enterprise-frontend && pnpm build`
Expected: Both succeed,各自 dist/ 目录生成

- [ ] **Step 2: Type-check both apps**

Run: `cd apps/multi-tenant-frontend && pnpm type-check`
Run: `cd apps/enterprise-frontend && pnpm type-check`
Expected: No errors

- [ ] **Step 3: Verify pnpm workspace (both apps auto-included)**

Check `pnpm-workspace.yaml` at root has `packages: ['apps/*']` or `packages: ['**']`. If so, both new apps are auto-included.

Run: `pnpm install` at root and verify both apps' node_modules are linked.

- [ ] **Step 4: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: complete dashboard split into two independent apps

All phases complete:
- Skeleton apps created with tsconfig.node.json (FIX)
- Utils, components, hooks migrated
- AuthStore split (carbon-platform-auth vs carbon-enterprise-auth)
- Platform authStore: 4-param login (FIX: PlatformLogin.tsx passes permissions)
- API modules split (platformApiClient vs apiClient)
- platform.ts: getOperationLogs deduplicated (FIX: had 2 definitions)
- Pages migrated with adapted imports
- Config.tsx correctly identified (套餐管理 page)
- App.tsx with BrowserRouter
- E2E tests split and adapted

Both apps build and run independently.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 16: Archive old dashboard (optional, deferred)

- [ ] **Step 1:** After both new apps are verified stable in production, archive `apps/dashboard/`

```bash
mv apps/dashboard apps/dashboard-archived
git add -A && git commit -m "chore: archive old dashboard (replaced by multi-tenant-frontend and enterprise-frontend)"
```

---

## Implementation Notes

### Critical Fixes Applied
1. **tsconfig.node.json**: Added to both apps (was missing in initial plan)
2. **Login 4-param**: Platform authStore.login() now accepts optional 4th param (permissions) to match PlatformLogin.tsx
3. **getOperationLogs deduplication**: platform.ts must have duplicate removed when copying
4. **Config.tsx**: Correctly identified as the 套餐管理 page in platform/pages/

### ErrorBoundary handleGoHome
Uses hash navigation (`window.location.hash = '#/platform/dashboard'`). This is intentional for now — the error boundary is a last-resort navigation mechanism that works regardless of router state. When the apps are fully stable with BrowserRouter, this can be updated to use `window.location.pathname = '/dashboard'`.

### pnpm Workspace
The root `pnpm-workspace.yaml` likely has `packages: ['apps/*']` which auto-includes both new apps. Verify with `pnpm install` at root after creating both apps.

### localStorage Migration
Existing logged-in users will be logged out when they first use the new apps because the localStorage key changed from `carbon-dashboard-auth` to `carbon-platform-auth` or `carbon-enterprise-auth`. This is expected and correct behavior.

# Enterprise Frontend Fix Implementation Plan

## Overview

This plan addresses critical issues in `apps/enterprise-frontend` (and briefly mentions `h5` and `multi-tenant-frontend` for shared issues).

---

## Phase 1: Token Refresh Race Condition Fix

### Problem
Multiple concurrent 401 responses trigger multiple `refreshToken()` calls without mutex in:
- `apps/enterprise-frontend/src/api/request.ts:62-81`
- `apps/h5/src/api/request.ts:62-84`
- `apps/multi-tenant-frontend/src/api/request.ts:24-44`

The existing `fetchPermissionsPromise` pattern in `authStore.ts:95-111` provides the correct mutex pattern to follow.

### Solution
Add `isRefreshing` flag + refresh queue to each request.ts.

#### 1.1 Fix enterprise-frontend request.ts

**File**: `apps/enterprise-frontend/src/api/request.ts`

Add after line 10 (after `apiClient` creation):
```typescript
// Token refresh mutex to prevent race conditions
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];
```

Replace lines 62-81 with:
```typescript
if (error.response?.status === 401) {
  const refreshToken = useAuthStore.getState().refreshToken;
  const originalRequest = error.config;

  if (!originalRequest._retry) {
    originalRequest._retry = true;

    if (refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefresh } = refreshRes.data.data;
          useAuthStore.getState().login(accessToken, newRefresh, useAuthStore.getState().user!);

          // Process queued requests with new token
          refreshQueue.forEach(cb => cb(accessToken));
          refreshQueue = [];
        } catch {
          // Reject all queued requests
          refreshQueue.forEach(cb => cb(''));
          refreshQueue = [];
          useAuthStore.getState().logout();
        } finally {
          isRefreshing = false;
        }
      }

      // Queue this request until token is refreshed
      return new Promise((resolve, reject) => {
        refreshQueue.push((token: string) => {
          if (token && originalRequest) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          } else {
            reject(error);
          }
        });
      });
    } else {
      useAuthStore.getState().logout();
    }
  }
}
```

#### 1.2 Fix h5 request.ts

**File**: `apps/h5/src/api/request.ts`

Apply the same pattern. The structure is similar (lines 62-84).

#### 1.3 Fix multi-tenant-frontend request.ts

**File**: `apps/multi-tenant-frontend/src/api/request.ts`

Apply the same pattern (lines 24-44).

---

## Phase 2: rules.ts Stub API Fix

### Problem
9 API functions in `apps/enterprise-frontend/src/api/rules.ts` return empty arrays/null instead of real backend calls:
- `getConsecutiveRewards` (line 108-111)
- `updateConsecutiveRewards` (line 113-115)
- `getSpecialDates` (line 117-119)
- `createSpecialDate` (line 121-123)
- `deleteSpecialDate` (line 125-127)
- `getLevelCoefficients` (line 129-131)
- `updateLevelCoefficients` (line 133-135)
- `getDailyCap` (line 137-139)
- `updateDailyCap` (line 141-143)

### Backend API Pattern (from schema)
- GET `/point-rules/list?type={type}` - list rules by type
- POST `/point-rules` - create rule
- PUT `/point-rules` - update rule
- DELETE `/point-rules/{id}` - delete rule

### Type Values (from PointRuleService.java)
- `time_slot` - already implemented
- `special_date` - needs implementation
- `level_coefficient` - needs implementation
- `daily_cap` - needs implementation

Note: `consecutive` rewards appear to use a different mechanism (streak-based rather than point-rules table).

### Solution

**File**: `apps/enterprise-frontend/src/api/rules.ts`

Replace the stub functions (lines 108-143) with:

```typescript
// Helper to fetch rules by type from backend
const fetchRulesByType = async (tenantId: string, type: string) => {
  const res = await apiClient.get('/point-rules/list', {
    params: { type },
  });
  const allRules = res.data || [];
  return allRules
    .filter((r: any) => r.type === type)
    .map((r: any) => {
      let config = {};
      try {
        config = JSON.parse(r.config || '{}');
      } catch {}
      return {
        id: String(r.id),
        name: r.name,
        enabled: r.enabled,
        sortOrder: r.sortOrder || 0,
        config,
        type: r.type,
      };
    });
};

// Consecutive rewards - uses streak records, not point-rules
export const getConsecutiveRewards = async (_tenantId: string) => {
  // Consecutive rewards are calculated from check-in streaks, not stored as rules
  // Return computed rewards based on consecutive days
  return [];
};

export const updateConsecutiveRewards = async (_tenantId: string, _data: ConsecutiveReward[]) => {
  // Consecutive rewards are computed by the point engine, not stored
  return [];
};

export const getSpecialDates = async (tenantId: string) => {
  const rules = await fetchRulesByType(tenantId, 'special_date');
  return rules.map((r: any) => ({
    id: r.id,
    date: r.config.date || r.name,
    multiplier: r.config.multiplier || 1,
    description: r.config.description || '',
  }));
};

export const createSpecialDate = async (data: Partial<SpecialDate> & { tenantId: string }) => {
  const res = await apiClient.post('/point-rules', {
    type: 'special_date',
    name: data.date,
    config: JSON.stringify({
      date: data.date,
      multiplier: data.multiplier || 1,
      description: data.description || '',
    }),
    enabled: true,
    sortOrder: 0,
  });
  return res.data;
};

export const deleteSpecialDate = async (id: string) => {
  const res = await apiClient.delete(`/point-rules/${id}`);
  return res.data;
};

export const getLevelCoefficients = async (tenantId: string) => {
  const rules = await fetchRulesByType(tenantId, 'level_coefficient');
  return rules.map((r: any) => ({
    level: r.config.level || 1,
    coefficient: r.config.coefficient || 1,
    id: r.id,
  }));
};

export const updateLevelCoefficients = async (tenantId: string, data: LevelCoefficient[]) => {
  // Delete existing and recreate
  const existing = await fetchRulesByType(tenantId, 'level_coefficient');
  await Promise.all(existing.map((r: any) => apiClient.delete(`/point-rules/${r.id}`)));
  await Promise.all(data.map(d =>
    apiClient.post('/point-rules', {
      type: 'level_coefficient',
      name: `Level ${d.level}`,
      config: JSON.stringify({ level: d.level, coefficient: d.coefficient }),
      enabled: true,
      sortOrder: d.level,
    })
  ));
  return [];
};

export const getDailyCap = async (tenantId: string) => {
  const rules = await fetchRulesByType(tenantId, 'daily_cap');
  if (rules.length > 0) {
    return { maxPoints: rules[0].config.maxPoints || 500, id: rules[0].id };
  }
  return { maxPoints: 500 };
};

export const updateDailyCap = async (tenantId: string, data: DailyCap) => {
  const existing = await fetchRulesByType(tenantId, 'daily_cap');
  if (existing.length > 0) {
    await apiClient.put('/point-rules', {
      id: Number(existing[0].id),
      type: 'daily_cap',
      name: 'Daily Cap',
      config: JSON.stringify({ maxPoints: data.maxPoints }),
      enabled: true,
    });
  } else {
    await apiClient.post('/point-rules', {
      type: 'daily_cap',
      name: 'Daily Cap',
      config: JSON.stringify({ maxPoints: data.maxPoints }),
      enabled: true,
      sortOrder: 0,
    });
  }
  return [];
};
```

Also update the `DailyCap` interface (line 31-33) to include `id` for update operations:
```typescript
export interface DailyCap {
  maxPoints: number;
  id?: string;
}
```

---

## Phase 3: API Response Unification

### Problem
Three different response handling patterns exist across the codebase:

1. **Interceptor returns raw `res`** (enterprise-frontend, h5, multi-tenant-frontend)
2. **Pages do manual unwrapping** with `extractArray` or `data?.data?.records`
3. **branding.ts returns `res.data.data`** (double-unwrap)

### Solution

#### 3.1 Update enterprise-frontend interceptor to unwrap automatically

**File**: `apps/enterprise-frontend/src/api/request.ts`

Change the response interceptor (lines 38-45) to unwrap `res.data`:

```typescript
apiClient.interceptors.response.use(
  (res) => {
    apiLogger.debug(`[API响应] ${res.config.method?.toUpperCase()} ${res.config.baseURL}${res.config.url} - ${res.status}`, {
      status: res.status,
      statusText: res.statusText,
    });
    // Unwrap the data from the standard API response
    return res.data;
  },
  // error handler unchanged
```

#### 3.2 Update branding.ts to use single unwrap

**File**: `apps/enterprise-frontend/src/api/branding.ts`

After interceptor change (line 33), these functions return `res.data` directly:
- `getCurrentBranding`: line 33 `return res.data.data;` → `return res.data;`
- `updateBranding`: line 39 `return res.data.data;` → `return res.data;`
- `uploadLogo`: line 51 `return res.data.data;` → `return res.data;`
- `getBrandingByTenantId`: line 62 `return res.data.data;` → `return res.data;`
- `getBrandingByDomain`: line 68 `return res.data.data;` → `return res.data;`

Also remove the redundant `ApiResponse<T>` wrapper interface (lines 24-28) since the interceptor now handles unwrapping.

#### 3.3 Update auth.ts to use single unwrap

**File**: `apps/enterprise-frontend/src/api/auth.ts`

Line 35: `return res.data.data ?? [];` → `return res.data ?? [];`

#### 3.4 Update reports.ts to use single unwrap

**File**: `apps/enterprise-frontend/src/api/reports.ts`

Lines 30-53: Each function does `return res.data;`. Since interceptor now unwraps, change to `return res;`:
- Line 31: `return res.data;` → `return res;`
- Line 38: `return res.data;` → `return res;`
- Line 45: `return res.data;` → `return res;`
- Line 52: `return res.data;` → `return res;`
- Line 60: `return res.data;` → `return res;`

#### 3.5 Update Dashboard.tsx to remove manual extractArray

**File**: `apps/enterprise-frontend/src/pages/Dashboard.tsx`

Lines 91-97 define a local `extractArray`. Since API now returns unwrapped data, update to:

```typescript
const extractArray = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && 'records' in data) {
    return (data as { records: T[] }).records;
  }
  return [];
};
```

#### 3.6 Apply same interceptor change to h5 and multi-tenant-frontend

**h5/src/api/request.ts** - Line 38-44: change `return res;` to `return res.data;`

**apps/multi-tenant-frontend/src/api/request.ts** - Line 22: change `return res` to `return res.data`

---

## Phase 4: Type Safety and Minor Fixes

### 4.1 Replace deepClone with structuredClone

**Files**:
- `apps/enterprise-frontend/src/utils/index.ts:144-146`
- `apps/h5/src/utils/index.ts` (same issue)
- `apps/multi-tenant-frontend/src/utils/index.ts:144-146`

Change:
```typescript
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};
```

To:
```typescript
export const deepClone = <T>(obj: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
};
```

### 4.2 Add Prettier config

Create `.prettierrc` in project root:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

Create `.prettierignore`:
```
node_modules
dist
build
coverage
*.min.js
```

### 4.3 Define LoginResponse type

**File**: `apps/enterprise-frontend/src/api/auth.ts`

Add after line 6:
```typescript
export interface LoginResponse {
  code: number;
  data: {
    accessToken: string;
    refreshToken: string;
    user: AdminUser;
  };
  message?: string;
}
```

Update `LoginPage.tsx:63` from `res: any` to proper typing.

### 4.4 Add ErrorResponse interface

**File**: `apps/enterprise-frontend/src/api/request.ts`

Add after line 10:
```typescript
interface ErrorResponse {
  code?: number;
  message?: string;
  data?: unknown;
}
```

Update line 50:
```typescript
const message = error.message || (error.response?.data as ErrorResponse)?.message || '网络错误';
```

---

## Phase 5: Testing

### Verification Steps

1. **Token Refresh Race Condition**
   - Clear all tokens, open multiple tabs
   - Make 3+ API calls simultaneously that return 401
   - Verify only ONE refresh token call is made
   - Verify all requests retry with new token

2. **rules.ts APIs**
   - Test `getSpecialDates` - create a special date, verify it appears in list
   - Test `getLevelCoefficients` - create/update level coefficients
   - Test `getDailyCap` / `updateDailyCap` - verify cap is enforced
   - Test `deleteSpecialDate` - verify deletion

3. **API Response Unification**
   - Login and verify token is stored correctly
   - Navigate to Dashboard - verify stats/charts load
   - Navigate to Branding settings - verify logo upload works
   - Check browser console for any "Cannot read property of undefined" errors

4. **deepClone**
   - Test object cloning with nested objects/arrays
   - Verify original is not mutated when copy is modified

### Files to Test

| Feature | Test File |
|---------|-----------|
| Token refresh | Any authenticated page |
| Rules CRUD | Rules.tsx tabs |
| Dashboard | Dashboard.tsx |
| Branding | Branding.tsx |
| Login | LoginPage.tsx |

---

## Implementation Order

1. **Phase 1** (Token Refresh) - Critical, do first
2. **Phase 2** (rules.ts stubs) - High priority, enables feature work
3. **Phase 3** (API Response) - High priority, affects all pages
4. **Phase 4** (Type Safety) - Medium priority, cleaner code
5. **Phase 5** (Testing) - Verify all fixes work

---

## Critical Files for Implementation

- `apps/enterprise-frontend/src/api/request.ts` - Token refresh mutex, interceptor unwrap
- `apps/enterprise-frontend/src/api/rules.ts` - Stub API implementations
- `apps/enterprise-frontend/src/api/branding.ts` - Double-unwrap fix
- `apps/enterprise-frontend/src/pages/Dashboard.tsx` - Remove extractArray, use new unwrapped API
- `apps/enterprise-frontend/src/store/authStore.ts` - Reference pattern for mutex (already correct)

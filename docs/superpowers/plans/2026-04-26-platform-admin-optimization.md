# Platform Admin Optimization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full-stack optimization to make all product features configurable via platform admin, with enterprises seeing different features based on purchased packages.

**Architecture:** Build on existing SPI framework (ProductModule + RuleNode + Feature). Unify the dual-track rule engine into a single `RuleChainExecutor` path. Add `@RequireFeature` annotation for API-level feature gating. Each product module (stair, walking, quiz, mall) gets its own RuleNodes and Feature definitions, with package-gated configuration.

**Tech Stack:** Java 21, Spring Boot 3.x, MyBatis-Plus, React 18 + TypeScript + Ant Design 5, React Flow (visual editor), Redis (feature cache + leaderboard)

**Design Spec:** `docs/superpowers/specs/2026-04-26-platform-admin-optimization-design.md`

**Parallelization Strategy:** Tasks marked with `🅿️` can run in parallel subagents. Group A = Backend, Group B = Frontend, Group C = Testing.

---

## Chunk 1: Database Migration (Phase 0)

Sequential — all subsequent chunks depend on this.

### Task 1: Flyway Migration V27 — Schema Changes

**Files:**
- Create: `saas-backend/carbon-app/src/main/resources/db/migration/V27__platform_optimization_schema.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- V27: Platform Admin Optimization schema changes

-- 1. Tenants: add exchange rate for points-to-RMB conversion
ALTER TABLE tenants
    ADD COLUMN points_exchange_rate DECIMAL(10,4) DEFAULT 100.0000
    COMMENT '积分兑换人民币汇率（如 100.0000 = 100积分=1元）';

-- 2. Time slot rules: add per-floor points configuration
ALTER TABLE time_slot_rules
    ADD COLUMN points_per_floor INT DEFAULT NULL
    COMMENT '每层积分（stair.floor_points 功能启用时使用，NULL 表示不启用）';

-- 3. Leaderboard snapshots: add dimension column for extended rankings
ALTER TABLE leaderboard_snapshots
    ADD COLUMN dimension VARCHAR(20) DEFAULT 'daily'
    COMMENT '排行维度: daily/weekly/monthly/quarterly/yearly'
    AFTER snapshot_type;

ALTER TABLE leaderboard_snapshots
    ADD INDEX idx_tenant_dimension_date (tenant_id, dimension, snapshot_date);
```

- [ ] **Step 2: Write migration V28 — New tables**

Create: `saas-backend/carbon-app/src/main/resources/db/migration/V28__walking_quiz_mall_tables.sql`

```sql
-- V28: Walking tier rules, fun conversion, quiz module, platform mall products

-- 1. Walking tier rules (step count → points tiers)
CREATE TABLE walking_tier_rules (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    min_steps INT NOT NULL COMMENT '最小步数（含）',
    max_steps INT DEFAULT NULL COMMENT '最大步数（不含），NULL=无上限',
    points INT NOT NULL COMMENT '该梯度奖励积分',
    sort_order INT NOT NULL DEFAULT 0,
    deleted TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant_range (tenant_id, min_steps),
    INDEX idx_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='走路梯度积分规则';

-- 2. Fun conversion rules (calories → fun items)
CREATE TABLE fun_conversion_rules (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    item_name VARCHAR(50) NOT NULL COMMENT '物品名，如"大米""冰棒"',
    unit VARCHAR(20) NOT NULL COMMENT '单位，如"克""根"',
    calories_per_unit DECIMAL(10,2) NOT NULL COMMENT '每单位消耗的卡路里',
    icon VARCHAR(255) DEFAULT NULL COMMENT '图标URL',
    sort_order INT NOT NULL DEFAULT 0,
    deleted TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant_item (tenant_id, item_name),
    INDEX idx_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='趣味换算规则';

-- 3. Quiz questions
CREATE TABLE quiz_questions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    type ENUM('true_false', 'single_choice', 'multi_choice') NOT NULL,
    content TEXT NOT NULL COMMENT '题目内容',
    options JSON DEFAULT NULL COMMENT '选项 [{"label":"A","text":"..."},...]',
    answer JSON NOT NULL COMMENT '正确答案 ["A"] 或 ["A","C"]',
    analysis TEXT DEFAULT NULL COMMENT '解题分析',
    category VARCHAR(50) DEFAULT NULL COMMENT '分类标签',
    difficulty TINYINT NOT NULL DEFAULT 1 COMMENT '难度 1-3',
    enabled TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tenant_enabled (tenant_id, enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='答题题库';

-- 4. Quiz daily records
CREATE TABLE quiz_daily_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    is_correct TINYINT NOT NULL,
    user_answer JSON DEFAULT NULL COMMENT '用户提交的答案',
    points_earned INT NOT NULL DEFAULT 0,
    answer_date DATE NOT NULL COMMENT '答题日期',
    answered_at DATETIME NOT NULL,
    UNIQUE KEY uk_user_daily_question (tenant_id, user_id, question_id, answer_date),
    INDEX idx_user_date (tenant_id, user_id, answer_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='每日答题记录';

-- 5. Quiz configs
CREATE TABLE quiz_configs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    daily_limit INT NOT NULL DEFAULT 3 COMMENT '每日答题数量上限',
    points_per_correct INT NOT NULL DEFAULT 10 COMMENT '答对奖励积分',
    show_analysis TINYINT NOT NULL DEFAULT 1 COMMENT '是否展示解题分析',
    enabled TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='答题配置';

-- 6. Platform mall products (separate from platform_products SPI registry)
CREATE TABLE platform_mall_products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    type ENUM('coupon','recharge','privilege') NOT NULL,
    price_cents INT NOT NULL COMMENT '人民币价格（分）',
    description TEXT DEFAULT NULL,
    image_url VARCHAR(255) DEFAULT NULL,
    fulfillment_config JSON DEFAULT NULL COMMENT '履约配置',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '0=禁用 1=启用',
    deleted TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='平台商城商品池';

-- 7. Tenant product shelf (enterprise selects from platform pool)
CREATE TABLE tenant_product_shelf (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    platform_mall_product_id BIGINT NOT NULL,
    shelf_status TINYINT NOT NULL DEFAULT 1 COMMENT '0=下架 1=上架',
    shelf_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant_product (tenant_id, platform_mall_product_id),
    INDEX idx_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='企业商品上架';

-- 8. Holiday calendar (for workday filter)
CREATE TABLE holiday_calendar (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    holiday_date DATE NOT NULL COMMENT '日期',
    holiday_name VARCHAR(100) NOT NULL COMMENT '节假日名称',
    holiday_type ENUM('public_holiday','workday_adjustment','company_custom') NOT NULL
        COMMENT '类型：法定假日/调休上班/企业自定义',
    year INT NOT NULL COMMENT '年份',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_date (holiday_date),
    INDEX idx_year_type (year, holiday_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='节假日日历';
```

- [ ] **Step 3: Write migration V29 — Feature registry seeding**

Create: `saas-backend/carbon-app/src/main/resources/db/migration/V29__feature_registry_seeding.sql`

```sql
-- V29: Seed feature definitions for all product modules

-- Insert feature definitions into features table
INSERT INTO features (code, name, type, value_type, default_value, `group`) VALUES
-- Stair climbing features
('stair.time_slot', '多时间段配置', 'config', 'json', '{"max_time_slots":1}', 'stair_climbing'),
('stair.floor_points', '每层楼积分', 'config', 'json', '{"enabled":false,"points_per_floor":null}', 'stair_climbing'),
('stair.workday_only', '有效日期范围', 'config', 'json', '{"mode":"all_days","include_weekend":true,"include_holiday":true}', 'stair_climbing'),
('stair.special_date', '特殊日期倍数', 'config', 'json', '{"max_special_dates":0}', 'stair_climbing'),
('stair.leaderboard', '排行榜维度', 'config', 'json', '{"dimensions":["daily"]}', 'stair_climbing'),
-- Walking features
('walking.daily_points', '每日走路积分', 'config', 'json', '{}', 'walking'),
('walking.step_tier', '梯度步数奖励', 'config', 'json', '{"max_tiers":3}', 'walking'),
('walking.fun_conversion', '趣味换算', 'config', 'json', '{"max_items":5}', 'walking'),
('walking.leaderboard', '排行榜维度', 'config', 'json', '{"dimensions":["daily"]}', 'walking'),
-- Quiz features
('quiz.enabled', '答题功能开关', 'permission', 'boolean', 'false', 'quiz'),
('quiz.question_types', '题目类型', 'config', 'json', '{"types":["true_false","single_choice","multi_choice"]}', 'quiz'),
('quiz.daily_limit', '每日答题数量', 'config', 'json', '{"max_daily":3}', 'quiz'),
('quiz.analysis', '解题分析展示', 'config', 'json', '{"enabled":true}', 'quiz'),
-- Mall features
('mall.enabled', '积分商城开关', 'permission', 'boolean', 'false', 'mall'),
('mall.exchange_rate', '汇率系数', 'config', 'json', '{"allow_custom_rate":true}', 'mall'),
('mall.platform_pool', '平台商品池', 'config', 'json', '{"max_products":50}', 'mall'),
('mall.reports', '兑换统计报表', 'config', 'json', '{"dimensions":["daily","monthly","yearly"]}', 'mall')
ON DUPLICATE KEY UPDATE name=VALUES(name);
```

- [ ] **Step 4: Verify migrations compile**

Run: `cd saas-backend && ./mvnw clean compile -pl carbon-app -am -Dmaven.test.skip=true -q ; echo "EXIT_CODE=$?"`

Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add saas-backend/carbon-app/src/main/resources/db/migration/V27__platform_optimization_schema.sql
git add saas-backend/carbon-app/src/main/resources/db/migration/V28__walking_quiz_mall_tables.sql
git add saas-backend/carbon-app/src/main/resources/db/migration/V29__feature_registry_seeding.sql
git commit -m "feat: add Phase 0 database migrations for platform admin optimization

V27: ALTER tables for exchange rate, floor points, leaderboard dimension
V28: New tables for walking tiers, fun conversion, quiz, mall products, holidays
V29: Seed feature definitions for all product modules"
```

---

## Chunk 2: Foundation — Backend Feature Gating + Rule Engine Unification (Phase 1)

Tasks 2-4 can run in **PARALLEL** (🅿️ Group A backend, Group B frontend).

### Task 2: @RequireFeature Annotation + AOP (🅿️ Group A)

**Files:**
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/security/RequireFeature.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/security/RequireFeatureAspect.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/service/FeatureGateService.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/controller/EnterpriseFeatureController.java`
- Test: `saas-backend/carbon-app/src/test/java/com/carbonpoint/app/integration/FeatureGateTest.java`

- [ ] **Step 1: Write the RequireFeature annotation**

```java
// saas-backend/carbon-system/src/main/java/com/carbonpoint/system/security/RequireFeature.java
package com.carbonpoint.system.security;

import java.lang.annotation.*;

/**
 * API-level feature gate annotation.
 * Checks if the current tenant's package includes the specified feature.
 * Use together with @RequirePerm for AND logic (both must pass).
 * Only applies to enterprise/H5 APIs, NOT platform admin APIs.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequireFeature {
    /**
     * Feature code to check, e.g. "stair.floor_points"
     */
    String value();
}
```

- [ ] **Step 2: Write the AOP aspect**

```java
// saas-backend/carbon-system/src/main/java/com/carbonpoint/system/security/RequireFeatureAspect.java
package com.carbonpoint.system.security;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.system.service.FeatureGateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class RequireFeatureAspect {

    private final FeatureGateService featureGateService;

    @Before("@annotation(requireFeature)")
    public void checkFeature(JoinPoint joinPoint, RequireFeature requireFeature) {
        Long tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        String featureCode = requireFeature.value();
        if (!featureGateService.isFeatureEnabled(tenantId, featureCode)) {
            log.warn("Feature gate blocked: tenantId={}, feature={}, method={}",
                    tenantId, featureCode, joinPoint.getSignature().toShortString());
            throw new BusinessException(ErrorCode.PERMISSION_DENIED);
        }
    }
}
```

- [ ] **Step 3: Write FeatureGateService**

```java
// saas-backend/carbon-system/src/main/java/com/carbonpoint/system/service/FeatureGateService.java
package com.carbonpoint.system.service;

import com.carbonpoint.system.mapper.PackageProductFeatureMapper;
import com.carbonpoint.system.mapper.TenantMapper;
import com.carbonpoint.system.entity.PackageProductFeatureEntity;
import com.carbonpoint.system.entity.Tenant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.*;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeatureGateService {

    private static final String CACHE_KEY_PREFIX = "feature:tenant:";
    private static final long CACHE_TTL_MINUTES = 5;

    private final TenantMapper tenantMapper;
    private final PackageProductFeatureMapper packageProductFeatureMapper;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Check if a feature is enabled for a tenant.
     * Uses Redis cache (5min TTL) with DB fallback.
     */
    public boolean isFeatureEnabled(Long tenantId, String featureCode) {
        Map<String, Boolean> features = getTenantFeatures(tenantId);
        return features.getOrDefault(featureCode, false);
    }

    /**
     * Get all enabled features for a tenant, with caching.
     */
    public Map<String, Boolean> getTenantFeatures(Long tenantId) {
        String cacheKey = CACHE_KEY_PREFIX + tenantId;
        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached, Map.class);
            }
        } catch (Exception e) {
            log.warn("Failed to read feature cache for tenant {}", tenantId, e);
        }

        // DB fallback
        Map<String, Boolean> features = loadFeaturesFromDb(tenantId);

        try {
            redisTemplate.opsForValue().set(cacheKey,
                    objectMapper.writeValueAsString(features),
                    CACHE_TTL_MINUTES, TimeUnit.MINUTES);
        } catch (Exception e) {
            log.warn("Failed to cache features for tenant {}", tenantId, e);
        }

        return features;
    }

    /**
     * Invalidate feature cache for a tenant (call on package/config change).
     */
    public void invalidateCache(Long tenantId) {
        redisTemplate.delete(CACHE_KEY_PREFIX + tenantId);
    }

    private Map<String, Boolean> loadFeaturesFromDb(Long tenantId) {
        Tenant tenant = tenantMapper.selectById(tenantId);
        if (tenant == null || tenant.getPackageId() == null) {
            return Collections.emptyMap();
        }

        List<PackageProductFeatureEntity> pkgFeatures =
                packageProductFeatureMapper.selectByPackageId(tenant.getPackageId());

        Map<String, Boolean> result = new HashMap<>();
        for (PackageProductFeatureEntity pf : pkgFeatures) {
            // Use feature code from joined data; the mapper query should join features table
            if (pf.getIsEnabled() != null && pf.getIsEnabled()) {
                result.put(pf.getFeatureCode(), true);
            }
        }
        return result;
    }
}
```

- [ ] **Step 4: Add featureCode field to PackageProductFeatureEntity**

Modify: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/entity/PackageProductFeatureEntity.java`

Add field: `private String featureCode;` — this requires adding a JOIN query in the mapper, or using `@TableField(exist = false)` with a custom select.

- [ ] **Step 5: Write the enterprise features API controller**

```java
// saas-backend/carbon-system/src/main/java/com/carbonpoint/system/controller/EnterpriseFeatureController.java
package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.service.FeatureGateService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/enterprise")
@RequiredArgsConstructor
public class EnterpriseFeatureController {

    private final FeatureGateService featureGateService;

    @GetMapping("/features")
    public Result<Map<String, Boolean>> getFeatures() {
        // TenantId from TenantContext (set by JWT filter)
        Long tenantId = com.carbonpoint.common.tenant.TenantContext.getTenantId();
        if (tenantId == null) {
            return Result.error("UNAUTHORIZED");
        }
        return Result.ok(featureGateService.getTenantFeatures(tenantId));
    }
}
```

- [ ] **Step 6: Compile to verify**

Run: `cd saas-backend && ./mvnw compile -pl carbon-system -am -Dmaven.test.skip=true -q ; echo "EXIT_CODE=$?"`

Expected: BUILD SUCCESS

- [ ] **Step 7: Commit**

```bash
git add saas-backend/carbon-system/src/main/java/com/carbonpoint/system/security/RequireFeature.java
git add saas-backend/carbon-system/src/main/java/com/carbonpoint/system/security/RequireFeatureAspect.java
git add saas-backend/carbon-system/src/main/java/com/carbonpoint/system/service/FeatureGateService.java
git add saas-backend/carbon-system/src/main/java/com/carbonpoint/system/controller/EnterpriseFeatureController.java
git commit -m "feat: add @RequireFeature annotation, AOP aspect, and enterprise features API

- RequireFeature annotation for API-level feature gating
- RequireFeatureAspect checks tenant package features via FeatureGateService
- FeatureGateService with Redis cache (5min TTL) + DB fallback
- GET /api/enterprise/features returns enabled features for current tenant"
```

### Task 3: Unify Rule Engine — Deprecate Legacy Path (🅿️ Group A)

**Files:**
- Modify: `saas-backend/carbon-points/src/main/java/com/carbonpoint/points/service/PointEngineService.java`
- Modify: `saas-backend/carbon-platform/src/main/java/com/carbonpoint/platform/rule/RuleChainExecutor.java`

- [ ] **Step 1: Refactor PointEngineService to use rule chain exclusively**

Modify `PointEngineService.java` — remove `calculateLegacy` method and make `tryRuleChain` the primary path. Add proper error handling instead of fallback.

Key changes:
- Remove `calculateLegacy` method and all private helpers it uses (`calculateBasePoints`, `getSpecialDateMultiplier`, `getDailyLimit`)
- Make `tryRuleChain` throw on failure instead of returning `Optional.empty()`
- Remove the `random` field (random generation moves to `RandomBaseRule`)
- Keep `checkAndAwardStreakReward` (not part of the rule chain)
- Keep `isTimeInSlot` and `getActiveTimeSlot` (used by CheckInService for validation, not calculation)
- Keep `getDailyAwarded` (used by rule chain via tenantConfig)

- [ ] **Step 2: Add new node name mappings to RuleChainExecutor**

Modify `RuleChainExecutor.NAME_MAP` to add:

```java
Map.entry("workday_filter", "workdayFilter"),
Map.entry("floor_points", "floorPoints"),
Map.entry("step_tier_match", "stepTierMatch"),
Map.entry("fun_conversion", "funConversion"),
Map.entry("quiz_check", "quizCheck"),
Map.entry("quiz_points", "quizPoints")
```

- [ ] **Step 3: Add short-circuit support to RuleChainExecutor**

Add logic: if a `RuleResult` has metadata key `"shortCircuit" == true`, stop the chain immediately and return current result.

- [ ] **Step 4: Compile to verify**

Run: `cd saas-backend && ./mvnw compile -pl carbon-points,carbon-platform -am -Dmaven.test.skip=true -q ; echo "EXIT_CODE=$?"`

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: unify rule engine — deprecate legacy PointEngineService path

- Remove calculateLegacy and hardcoded calculation chain
- RuleChainExecutor is now the sole calculation path
- Add new node name mappings for workday_filter, floor_points, step_tier, quiz
- Add short-circuit support for filter nodes"
```

### Task 4: Frontend FeatureGuard Component + Enterprise Features Store (🅿️ Group B)

**Files:**
- Create: `saas-frontend/enterprise-frontend/src/components/FeatureGuard.tsx`
- Create: `saas-frontend/enterprise-frontend/src/store/featureStore.ts`
- Create: `saas-frontend/enterprise-frontend/src/api/features.ts`
- Modify: `saas-frontend/enterprise-frontend/src/pages/FeatureMatrix.tsx` — replace hardcoded with dynamic

- [ ] **Step 1: Create the features API module**

```typescript
// saas-frontend/enterprise-frontend/src/api/features.ts
import request from './request';

export interface FeatureMap {
  [featureCode: string]: boolean;
}

export const fetchFeatures = (): Promise<FeatureMap> =>
  request.get('/api/enterprise/features').then(r => r.data?.data ?? {});
```

- [ ] **Step 2: Create the feature store (Zustand)**

```typescript
// saas-frontend/enterprise-frontend/src/store/featureStore.ts
import { create } from 'zustand';
import { fetchFeatures, FeatureMap } from '../api/features';

interface FeatureState {
  features: FeatureMap;
  loaded: boolean;
  load: () => Promise<void>;
  isEnabled: (code: string) => boolean;
}

export const useFeatureStore = create<FeatureState>((set, get) => ({
  features: {},
  loaded: false,
  load: async () => {
    const features = await fetchFeatures();
    set({ features, loaded: true });
  },
  isEnabled: (code: string) => {
    return get().features[code] === true;
  },
}));
```

- [ ] **Step 3: Create FeatureGuard component**

```tsx
// saas-frontend/enterprise-frontend/src/components/FeatureGuard.tsx
import React from 'react';
import { useFeatureStore } from '../store/featureStore';

interface Props {
  feature: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

const FeatureGuard: React.FC<Props> = ({ feature, fallback = null, children }) => {
  const isEnabled = useFeatureStore(s => s.isEnabled(feature));
  return isEnabled ? <>{children}</> : <>{fallback}</>;
};

export default FeatureGuard;
```

- [ ] **Step 4: Hook feature loading into enterprise app auth flow**

Modify the enterprise `authStore.ts` or `App.tsx` to call `useFeatureStore.getState().load()` after login succeeds.

- [ ] **Step 5: Refactor FeatureMatrix.tsx**

Replace the hardcoded `enabled: true` matrix with dynamic data from `useFeatureStore`.

- [ ] **Step 6: Verify frontend compiles**

Run: `cd saas-frontend && pnpm --filter @carbon-point/enterprise-frontend build`

- [ ] **Step 7: Commit**

```bash
git commit -m "feat: add FeatureGuard component, feature store, and dynamic FeatureMatrix

- FeatureGuard wraps UI blocks gated by feature codes
- featureStore (Zustand) loads features from /api/enterprise/features
- FeatureMatrix.tsx refactored to use dynamic features instead of hardcoded"
```

---

## Chunk 3: Stair Climbing Enhancement (Phase 2)

Tasks 5-6 can run in **PARALLEL** (🅿️ Group A backend, Group B frontend).

### Task 5: Stair Climbing Backend — New RuleNodes (🅿️ Group A)

**Files:**
- Create: `saas-backend/carbon-platform/src/main/java/com/carbonpoint/platform/rule/WorkdayFilterRule.java`
- Create: `saas-backend/carbon-platform/src/main/java/com/carbonpoint/platform/rule/FloorPointsRule.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/entity/HolidayCalendarEntity.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/mapper/HolidayCalendarMapper.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/controller/HolidayCalendarController.java`
- Modify: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/entity/Tenant.java` — add `pointsExchangeRate` field
- Modify: `saas-backend/carbon-stair/src/main/java/com/carbonpoint/stair/entity/TimeSlotRule.java` — add `pointsPerFloor` field

- [ ] **Step 1: Add Tenant entity field for exchange rate**

Add to `Tenant.java`:
```java
private java.math.BigDecimal pointsExchangeRate;
```

- [ ] **Step 2: Add TimeSlotRule entity field for per-floor points**

Add to `TimeSlotRule.java`:
```java
private Integer pointsPerFloor;
```

- [ ] **Step 3: Create HolidayCalendarEntity**

```java
// saas-backend/carbon-system/src/main/java/com/carbonpoint/system/entity/HolidayCalendarEntity.java
package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("holiday_calendar")
public class HolidayCalendarEntity {
    @TableId(type = IdType.AUTO)
    private Long id;
    private LocalDate holidayDate;
    private String holidayName;
    private String holidayType; // public_holiday, workday_adjustment, company_custom
    private Integer year;
    private LocalDateTime createdAt;
}
```

- [ ] **Step 4: Create HolidayCalendarMapper and Controller**

Standard MyBatis-Plus mapper + CRUD controller under `/api/platform/holidays`.

- [ ] **Step 5: Create WorkdayFilterRule**

```java
// saas-backend/carbon-platform/src/main/java/com/carbonpoint/platform/rule/WorkdayFilterRule.java
package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.springframework.stereotype.Component;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Map;

/**
 * Filters check-ins based on valid date range configuration.
 * Modes: all_days, workday_only, custom
 * Short-circuits the chain if date is outside valid range (returns 0 points).
 */
@Component
public class WorkdayFilterRule implements RuleNode {

    @Override
    public RuleResult apply(RuleContext context) {
        @SuppressWarnings("unchecked")
        Map<String, Object> config = (Map<String, Object>) context.getTenantConfig().get("workdayConfig");

        if (config == null) {
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        String mode = (String) config.getOrDefault("mode", "all_days");
        LocalDate today = LocalDate.now();

        switch (mode) {
            case "all_days":
                return RuleResult.passthrough(context.getCurrentPoints());

            case "workday_only":
                boolean includeWeekend = Boolean.TRUE.equals(config.get("includeWeekend"));
                boolean includeHoliday = Boolean.TRUE.equals(config.get("includeHoliday"));

                if (!includeWeekend && isWeekend(today)) {
                    return shortCircuit("weekend");
                }
                if (!includeHoliday && isHoliday(context, today)) {
                    return shortCircuit("holiday");
                }
                return RuleResult.passthrough(context.getCurrentPoints());

            case "custom":
                // Check against custom valid dates list
                @SuppressWarnings("unchecked")
                java.util.List<String> validDates = (java.util.List<String>) config.get("validDates");
                if (validDates != null && !validDates.contains(today.toString())) {
                    return shortCircuit("not_in_custom_dates");
                }
                return RuleResult.passthrough(context.getCurrentPoints());

            default:
                return RuleResult.passthrough(context.getCurrentPoints());
        }
    }

    @Override
    public String getName() {
        return "workdayFilter";
    }

    private boolean isWeekend(LocalDate date) {
        DayOfWeek dow = date.getDayOfWeek();
        return dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY;
    }

    private boolean isHoliday(RuleContext context, LocalDate date) {
        @SuppressWarnings("unchecked")
        java.util.List<String> holidays = (java.util.List<String>) context.getTenantConfig().get("holidays");
        return holidays != null && holidays.contains(date.toString());
    }

    private RuleResult shortCircuit(String reason) {
        return RuleResult.of(0, Map.of(
                "shortCircuit", true,
                "filterReason", reason,
                "filtered", true
        ));
    }
}
```

- [ ] **Step 6: Create FloorPointsRule**

```java
// saas-backend/carbon-platform/src/main/java/com/carbonpoint/platform/rule/FloorPointsRule.java
package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.springframework.stereotype.Component;
import java.util.Map;

/**
 * Calculates base points by floor count.
 * If floor_points feature is not enabled or pointsPerFloor is not set, passes through.
 */
@Component
public class FloorPointsRule implements RuleNode {

    @Override
    public RuleResult apply(RuleContext context) {
        Object floorCountObj = context.getTriggerData().get("floorCount");
        Object pointsPerFloorObj = context.getTriggerData().get("pointsPerFloor");

        if (floorCountObj == null || pointsPerFloorObj == null) {
            // Feature not enabled, pass through to random_base
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        int floorCount = ((Number) floorCountObj).intValue();
        int pointsPerFloor = ((Number) pointsPerFloorObj).intValue();
        int calculatedPoints = floorCount * pointsPerFloor;

        return RuleResult.of(calculatedPoints, Map.of(
                "basePoints", calculatedPoints,
                "floorCount", floorCount,
                "pointsPerFloor", pointsPerFloor,
                "calculationMethod", "floor_points"
        ));
    }

    @Override
    public String getName() {
        return "floorPoints";
    }
}
```

- [ ] **Step 7: Update RuleChainExecutor NAME_MAP**

Already done in Task 3 Step 2.

- [ ] **Step 8: Compile to verify**

Run: `cd saas-backend && ./mvnw compile -pl carbon-platform,carbon-system,carbon-stair -am -Dmaven.test.skip=true -q ; echo "EXIT_CODE=$?"`

- [ ] **Step 9: Commit**

```bash
git commit -m "feat: add WorkdayFilterRule and FloorPointsRule for stair climbing

- WorkdayFilterRule: short-circuits chain on weekends/holidays based on config
- FloorPointsRule: calculates points by floor count × points_per_floor
- HolidayCalendarEntity + mapper for platform admin holiday management
- Tenant.pointsExchangeRate and TimeSlotRule.pointsPerFloor fields"
```

### Task 6: Stair Climbing Frontend — Multi Time Slot Config + Leaderboard Dimensions (🅿️ Group B)

**Files:**
- Modify: `saas-frontend/enterprise-frontend/src/pages/rules/TimeSlotTab.tsx` — support multiple time slots
- Modify: `saas-frontend/enterprise-frontend/src/pages/Rules.tsx` — add workday filter tab
- Create: `saas-frontend/enterprise-frontend/src/pages/rules/WorkdayFilterTab.tsx`
- Modify: `saas-frontend/enterprise-frontend/src/pages/FeatureMatrix.tsx` — wrap stair features with FeatureGuard

- [ ] **Step 1: Enhance TimeSlotTab to support multiple time slots**

Modify the existing `TimeSlotTab.tsx` to:
- Show a list of time slot cards instead of a single form
- Add/delete time slot buttons (limited by `max_time_slots` from feature config)
- Each card has: name, start/end time, base_points_min/max, points_per_floor

- [ ] **Step 2: Create WorkdayFilterTab**

New tab for configuring valid date range:
- Radio group: all_days / workday_only / custom
- When workday_only: checkboxes for include_weekend, include_holiday
- When custom: date picker for valid dates

- [ ] **Step 3: Wrap stair features with FeatureGuard in Rules.tsx**

```tsx
<FeatureGuard feature="stair.multi_time_slot">
  <TabPane tab="时间段" key="timeSlot">
    <TimeSlotTab />
  </TabPane>
</FeatureGuard>
<FeatureGuard feature="stair.workday_only">
  <TabPane tab="有效日期" key="workday">
    <WorkdayFilterTab />
  </TabPane>
</FeatureGuard>
```

- [ ] **Step 4: Verify frontend compiles**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: enhance stair climbing frontend — multi time slots and workday filter

- TimeSlotTab supports multiple time slot cards with add/delete
- WorkdayFilterTab for valid date range configuration
- FeatureGuard wraps stair features in Rules page"
```

---

## Chunk 4: Walking Enhancement (Phase 3)

Tasks 7-8 can run in **PARALLEL** (🅿️ Group A backend, Group B frontend).

### Task 7: Walking Backend — Tier Rules + Fun Conversion RuleNodes (🅿️ Group A)

**Files:**
- Create: `saas-backend/carbon-platform/src/main/java/com/carbonpoint/platform/rule/StepTierMatchRule.java`
- Create: `saas-backend/carbon-platform/src/main/java/com/carbonpoint/platform/rule/FunConversionRule.java`
- Create: `saas-backend/carbon-walking/src/main/java/com/carbonpoint/walking/entity/WalkingTierRuleEntity.java`
- Create: `saas-backend/carbon-walking/src/main/java/com/carbonpoint/walking/entity/FunConversionRuleEntity.java`
- Create: `saas-backend/carbon-walking/src/main/java/com/carbonpoint/walking/mapper/WalkingTierRuleMapper.java`
- Create: `saas-backend/carbon-walking/src/main/java/com/carbonpoint/walking/mapper/FunConversionRuleMapper.java`
- Create: `saas-backend/carbon-walking/src/main/java/com/carbonpoint/walking/controller/WalkingConfigController.java`

- [ ] **Step 1: Create WalkingTierRuleEntity and mapper**

Standard MyBatis-Plus entity mapping to `walking_tier_rules` table with `@TableLogic` soft delete.

- [ ] **Step 2: Create FunConversionRuleEntity and mapper**

Standard entity mapping to `fun_conversion_rules` table.

- [ ] **Step 3: Create StepTierMatchRule**

```java
@Component
public class StepTierMatchRule implements RuleNode {
    @Override
    public RuleResult apply(RuleContext context) {
        Object stepsObj = context.getTriggerData().get("steps");
        if (stepsObj == null) return RuleResult.of(0, Map.of("reason", "no_steps_data"));

        int steps = ((Number) stepsObj).intValue();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> tiers = (List<Map<String, Object>>) context.getTenantConfig().get("walkingTiers");

        if (tiers == null || tiers.isEmpty()) return RuleResult.of(0, Map.of("reason", "no_tier_config"));

        // Sort tiers by minSteps ascending, find matching tier
        for (Map<String, Object> tier : tiers) {
            int minSteps = ((Number) tier.get("minSteps")).intValue();
            Object maxObj = tier.get("maxSteps");
            int maxSteps = maxObj != null ? ((Number) maxObj).intValue() : Integer.MAX_VALUE;
            if (steps >= minSteps && steps < maxSteps) {
                int points = ((Number) tier.get("points")).intValue();
                return RuleResult.of(points, Map.of("basePoints", points, "matchedTier", tier));
            }
        }
        return RuleResult.of(0, Map.of("reason", "below_min_tier"));
    }

    @Override public String getName() { return "stepTierMatch"; }
}
```

- [ ] **Step 4: Create FunConversionRule (display-only, returns passthrough with metadata)**

- [ ] **Step 5: Create WalkingConfigController for tier/conversion CRUD**

Enterprise admin APIs under `/api/enterprise/walking/tiers` and `/api/enterprise/walking/conversions`.

- [ ] **Step 6: Compile and commit**

```bash
git commit -m "feat: add walking tier rules and fun conversion RuleNodes

- StepTierMatchRule matches steps to tier ranges
- FunConversionRule generates display-only fun item conversions
- WalkingTierRuleEntity, FunConversionRuleEntity, mappers
- WalkingConfigController for enterprise admin CRUD"
```

### Task 8: Walking Frontend — Tier Config + Fun Conversion Pages (🅿️ Group B)

**Files:**
- Modify: `saas-frontend/enterprise-frontend/src/pages/walking/StepCalcConfig.tsx` — redesign for tier configuration
- Modify: `saas-frontend/enterprise-frontend/src/pages/walking/FunEquivalenceConfig.tsx` — enterprise custom items

- [ ] **Step 1: Redesign StepCalcConfig for tier configuration**

Replace existing step calculation config with tier editor:
- Table showing tiers: min_steps, max_steps, points
- Add/remove tier rows
- Validate no gaps/overlaps between tiers

- [ ] **Step 2: Redesign FunEquivalenceConfig for custom items**

- Table: item_name, unit, calories_per_unit, icon
- Add/remove items
- Preview: show how steps convert to each fun item

- [ ] **Step 3: Wrap walking features with FeatureGuard**

- [ ] **Step 4: Verify and commit**

```bash
git commit -m "feat: redesign walking frontend — tier config and custom fun conversion

- StepCalcConfig redesigned as tier editor with add/remove rows
- FunEquivalenceConfig for enterprise-customizable conversion items
- FeatureGuard wraps walking features"
```

---

## Chunk 5: Quiz Module — New Product (Phase 4)

This is a full-stack module. Can be a single dedicated subagent.

### Task 9: Quiz Module Backend (🅿️ Group A)

**Files:**
- Create: `saas-backend/carbon-quiz/pom.xml`
- Create: `saas-backend/carbon-quiz/src/main/java/com/carbonpoint/quiz/entity/QuizQuestion.java`
- Create: `saas-backend/carbon-quiz/src/main/java/com/carbonpoint/quiz/entity/QuizDailyRecord.java`
- Create: `saas-backend/carbon-quiz/src/main/java/com/carbonpoint/quiz/entity/QuizConfig.java`
- Create: `saas-backend/carbon-quiz/src/main/java/com/carbonpoint/quiz/mapper/QuizQuestionMapper.java`
- Create: `saas-backend/carbon-quiz/src/main/java/com/carbonpoint/quiz/mapper/QuizDailyRecordMapper.java`
- Create: `saas-backend/carbon-quiz/src/main/java/com/carbonpoint/quiz/mapper/QuizConfigMapper.java`
- Create: `saas-backend/carbon-quiz/src/main/java/com/carbonpoint/quiz/service/QuizService.java`
- Create: `saas-backend/carbon-quiz/src/main/java/com/carbonpoint/quiz/controller/QuizController.java` (H5)
- Create: `saas-backend/carbon-quiz/src/main/java/com/carbonpoint/quiz/controller/QuizAdminController.java` (Enterprise)
- Create: `saas-backend/carbon-quiz/src/main/java/com/carbonpoint/quiz/product/QuizProduct.java`
- Create: `saas-backend/carbon-platform/src/main/java/com/carbonpoint/platform/rule/QuizCheckRule.java`
- Create: `saas-backend/carbon-platform/src/main/java/com/carbonpoint/platform/rule/QuizPointsRule.java`
- Modify: `saas-backend/pom.xml` — add `carbon-quiz` module

- [ ] **Step 1: Create carbon-quiz Maven module**

Create `pom.xml` following `carbon-walking` as template. Dependencies: `carbon-platform`, `carbon-common`, MyBatis-Plus, Spring Boot starter.

- [ ] **Step 2: Add module to parent pom.xml**

Add `<module>carbon-quiz</module>` to `saas-backend/pom.xml`.

- [ ] **Step 3: Create entity classes**

`QuizQuestion`, `QuizDailyRecord`, `QuizConfig` — map to the tables created in V28.

- [ ] **Step 4: Create mappers**

Standard MyBatis-Plus `BaseMapper` interfaces.

- [ ] **Step 5: Create QuizService**

Key methods:
- `getDailyQuiz(Long userId, Long tenantId)`: randomly select up to `daily_limit` unanswered questions
- `submitAnswer(Long userId, Long questionId, List<String> answer)`: validate, record, calculate points
- `getQuizConfig(Long tenantId)`, `updateQuizConfig(Long tenantId, QuizConfigUpdateDTO)`

**Security**: `getDailyQuiz` must NEVER return the `answer` column.

- [ ] **Step 6: Create QuizController (H5)**

```
GET  /api/h5/quiz/daily      → getDailyQuiz
POST /api/h5/quiz/submit      → submitAnswer
```

- [ ] **Step 7: Create QuizAdminController (Enterprise)**

```
GET    /api/enterprise/quiz/questions    → list questions
POST   /api/enterprise/quiz/questions    → create question
PUT    /api/enterprise/quiz/questions/{id} → update question
DELETE /api/enterprise/quiz/questions/{id} → delete question
GET    /api/enterprise/quiz/config       → get config
PUT    /api/enterprise/quiz/config       → update config
```

- [ ] **Step 8: Create QuizProduct (implements ProductModule)**

```java
@Component
public class QuizProduct implements ProductModule {
    public String getCode() { return "quiz"; }
    public String getName() { return "答题积分"; }
    public String getTriggerType() { return "manual"; }
    public List<String> getRuleChain() { return List.of("quiz_check","quiz_points","level_coefficient","round","daily_cap"); }
    public List<String> getFeatures() { return List.of("quiz.enabled","quiz.question_types","quiz.daily_limit","quiz.analysis"); }
}
```

- [ ] **Step 9: Create QuizCheckRule and QuizPointsRule**

`QuizCheckRule`: checks daily count limit and duplicate answers. Returns short-circuit if limit exceeded.
`QuizPointsRule`: awards fixed points for correct answer, 0 for incorrect.

- [ ] **Step 10: Compile and commit**

```bash
git commit -m "feat: add carbon-quiz module — quiz product with question bank and daily answering

- QuizQuestion, QuizDailyRecord, QuizConfig entities and mappers
- QuizService with daily quiz selection, answer validation, point calculation
- H5 QuizController and Enterprise QuizAdminController
- QuizProduct SPI registration, QuizCheckRule and QuizPointsRule
- Security: answer field never sent to client, rate-limited submissions"
```

### Task 10: Quiz Module Frontend (🅿️ Group B)

**Files:**
- Create: `saas-frontend/enterprise-frontend/src/pages/quiz/QuizManagement.tsx`
- Create: `saas-frontend/enterprise-frontend/src/pages/quiz/QuestionEditor.tsx`
- Create: `saas-frontend/enterprise-frontend/src/api/quiz.ts`
- Create: `saas-frontend/h5/src/pages/QuizPage.tsx`
- Create: `saas-frontend/h5/src/api/quiz.ts`
- Modify: `saas-frontend/enterprise-frontend/src/App.tsx` — add quiz routes
- Modify: `saas-frontend/h5/src/App.tsx` — add quiz route

- [ ] **Step 1: Create enterprise quiz API module**

- [ ] **Step 2: Create QuestionEditor component**

Form for creating/editing quiz questions with:
- Type selector: true_false / single_choice / multi_choice
- Content text area
- Dynamic options list (add/remove option rows)
- Answer checkboxes (correct answers)
- Analysis text area
- Category and difficulty selectors

- [ ] **Step 3: Create QuizManagement page**

- Tab 1: Question bank list with CRUD
- Tab 2: Quiz config (daily limit, points per correct, show analysis)
- Wrapped with `<FeatureGuard feature="quiz.enabled">`

- [ ] **Step 4: Create H5 QuizPage**

- Show today's questions (up to 3)
- Question card with options
- Submit button, result feedback
- Show analysis after answering (if enabled)
- Progress indicator (1/3, 2/3, 3/3)

- [ ] **Step 5: Add routes in both App.tsx files**

Enterprise: `/quiz` → `QuizManagement`
H5: `/quiz` → `QuizPage`

- [ ] **Step 6: Verify and commit**

```bash
git commit -m "feat: add quiz frontend — enterprise admin management and H5 quiz page

- Enterprise: QuizManagement with question bank CRUD and config
- Enterprise: QuestionEditor supporting true/false, single/multi choice
- H5: QuizPage with daily quiz, answer submission, analysis display
- Routes added to both enterprise and h5 apps"
```

---

## Chunk 6: Mall Enhancement (Phase 5)

Tasks 11-12 can run in **PARALLEL** (🅿️ Group A backend, Group B frontend).

### Task 11: Mall Backend — Exchange Rate + Platform Product Pool (🅿️ Group A)

**Files:**
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/entity/PlatformMallProductEntity.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/entity/TenantProductShelfEntity.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/mapper/PlatformMallProductMapper.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/mapper/TenantProductShelfMapper.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/controller/PlatformMallProductController.java`
- Create: `saas-backend/carbon-mall/src/main/java/com/carbonpoint/mall/controller/EnterpriseShelfController.java`
- Create: `saas-backend/carbon-mall/src/main/java/com/carbonpoint/mall/controller/MallReportController.java`
- Modify: `saas-backend/carbon-mall/src/main/java/com/carbonpoint/mall/controller/ProductController.java` — use exchange rate
- Modify: `saas-backend/carbon-mall/src/main/java/com/carbonpoint/mall/service/ProductService.java` — price calculation

- [ ] **Step 1: Create PlatformMallProductEntity and TenantProductShelfEntity**

Map to `platform_mall_products` and `tenant_product_shelf` tables.

- [ ] **Step 2: Create PlatformMallProductController**

Platform admin CRUD for `platform_mall_products`:
```
GET/POST/PUT/DELETE /api/platform/products/pool
```

- [ ] **Step 3: Create EnterpriseShelfController**

Enterprise admin shelf management:
```
GET    /api/enterprise/mall/shelf          → list shelved products
POST   /api/enterprise/mall/shelf          → add product to shelf
DELETE /api/enterprise/mall/shelf/{id}     → remove from shelf
GET    /api/enterprise/mall/available      → list available platform products not yet shelved
PUT    /api/enterprise/mall/exchange-rate  → update exchange rate
```

- [ ] **Step 4: Modify ProductService to use exchange rate for price display**

When listing products for H5 users, calculate: `displayPoints = product.priceCents × tenant.pointsExchangeRate / 100`

- [ ] **Step 5: Create MallReportController**

Statistics APIs: exchange volume, points consumption, product popularity.

- [ ] **Step 6: Compile and commit**

```bash
git commit -m "feat: enhance mall — exchange rate, platform product pool, enterprise shelf

- PlatformMallProductEntity for platform product pool management
- TenantProductShelfEntity for enterprise shelf selection
- Exchange rate calculation in ProductService
- MallReportController for exchange statistics"
```

### Task 12: Mall Frontend — Product Pool + Shelf + Reports (🅿️ Group B)

**Files:**
- Create: `saas-frontend/platform-frontend/src/pages/PlatformProductPool.tsx`
- Create: `saas-frontend/enterprise-frontend/src/pages/MallShelf.tsx`
- Create: `saas-frontend/enterprise-frontend/src/pages/MallReports.tsx`
- Create: `saas-frontend/enterprise-frontend/src/api/mall.ts` (or enhance existing)
- Modify: `saas-frontend/platform-frontend/src/App.tsx` — add product pool route

- [ ] **Step 1: Create PlatformProductPool page for platform admin**

Product list with CRUD: name, type, price (RMB cents), image, description, status.

- [ ] **Step 2: Create MallShelf page for enterprise admin**

- Left panel: available platform products
- Right panel: enterprise-shelved products
- Drag or checkbox to add/remove from shelf
- Exchange rate configuration input

- [ ] **Step 3: Create MallReports page**

Charts for exchange volume, points consumption trends, product popularity ranking.

- [ ] **Step 4: Add routes and verify**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add mall frontend — platform product pool, enterprise shelf, reports

- PlatformProductPool for platform admin product management
- MallShelf for enterprise admin shelf selection + exchange rate config
- MallReports with exchange statistics charts"
```

---

## Chunk 7: Visual Rule Chain Editor (Phase 6)

This is frontend-heavy. Single dedicated subagent.

### Task 13: Install React Flow + Create Rule Chain Editor (🅿️ Group B)

**Prerequisite:** Tasks 2-3 (backend rule engine) must be complete.

**Files:**
- Create: `saas-frontend/platform-frontend/src/components/RuleChainEditor.tsx` (rewrite existing)
- Create: `saas-frontend/platform-frontend/src/components/RuleNodeCard.tsx`
- Create: `saas-frontend/platform-frontend/src/components/RuleConstraintValidator.ts`
- Modify: `saas-frontend/platform-frontend/package.json` — add `@xyflow/react`
- Modify: `saas-frontend/platform-frontend/src/pages/ProductConfig.tsx` — integrate new editor

- [ ] **Step 1: Install React Flow**

Run: `cd saas-frontend && pnpm --filter @carbon-point/platform-frontend add @xyflow/react`

- [ ] **Step 2: Create RuleConstraintValidator**

```typescript
// Constraint rules from the design spec
const CONSTRAINTS = {
  'workday_filter': { mustBefore: ['time_slot_match', 'floor_points', 'random_base', 'special_date_multiplier', 'level_coefficient', 'round', 'daily_cap'] },
  'time_slot_match': { mustAfter: ['workday_filter'], mustBefore: ['floor_points', 'random_base'] },
  'floor_points': { mustAfter: ['time_slot_match'], mustBefore: ['special_date_multiplier'] },
  'random_base': { mustAfter: ['time_slot_match'], mustBefore: ['special_date_multiplier'] },
  'special_date_multiplier': { mustAfter: ['floor_points', 'random_base'], mustBefore: ['level_coefficient'] },
  'level_coefficient': { mustAfter: ['special_date_multiplier'], mustBefore: ['round'] },
  'round': { mustAfter: ['level_coefficient'], mustBefore: ['daily_cap'] },
  'daily_cap': { mustAfter: ['round'] },
};

export function validateMove(nodeCode: string, targetIndex: number, chain: string[]): { valid: boolean; reason?: string } {
  // Check mustBefore and mustAfter constraints
  // ...
}
```

- [ ] **Step 3: Create RuleNodeCard component**

React Flow custom node:
- Title (rule name)
- Status indicator (enabled/disabled)
- Color: blue=enabled, gray=disabled, red=constraint violation
- Click to select → opens config panel

- [ ] **Step 4: Rewrite RuleChainEditor using React Flow**

- Left panel: draggable node palette (available rule nodes)
- Center: flow canvas with vertical layout
- Right panel: selected node's config form
- Drag-to-reorder with constraint validation
- Save button serializes to `product_rule_templates.config` JSON format

- [ ] **Step 5: Integrate into ProductConfig.tsx**

Replace existing rule chain tab content with the new React Flow editor.

- [ ] **Step 6: Verify and commit**

```bash
git commit -m "feat: add visual rule chain editor with React Flow

- @xyflow/react installed for platform-frontend
- RuleChainEditor with drag-to-reorder, constraint validation
- RuleNodeCard custom nodes with enable/disable toggle
- RuleConstraintValidator enforces valid node ordering
- Integrated into ProductConfig.tsx"
```

### Task 14: Package Feature Selector UI (🅿️ Group B)

**Files:**
- Modify: `saas-frontend/platform-frontend/src/pages/PackageManagement.tsx`
- Modify: `saas-frontend/platform-frontend/src/components/PackageProductSelector.tsx`
- Modify: `saas-frontend/platform-frontend/src/components/FeatureSelector.tsx`

- [ ] **Step 1: Enhance PackageManagement with product/feature selection**

Add to package edit form:
- Product checkboxes (stair/walking/quiz/mall)
- Each product expands to show features with switches + parameter limits
- Example: stair → [✓] Multi time slot (max 2) | [ ] Per-floor points | [✓] Workday only

- [ ] **Step 2: Enhance FeatureSelector component**

Support parameter limit inputs alongside on/off switches.

- [ ] **Step 3: Verify and commit**

```bash
git commit -m "feat: enhance package management — product/feature selection with parameter limits

- PackageManagement shows product checkboxes with expandable feature config
- FeatureSelector supports parameter limits (e.g. max_time_slots)
- Save persists to package_product_features table"
```

---

## Chunk 8: Leaderboard Enhancement + Integration Testing

### Task 15: Leaderboard Multi-Dimension Support (🅿️ Group A)

**Files:**
- Modify: `saas-backend/carbon-honor/src/main/java/com/carbonpoint/honor/entity/LeaderboardSnapshot.java` — add `dimension` field
- Modify: `saas-backend/carbon-honor/src/main/java/com/carbonpoint/honor/service/LeaderboardService.java` — support dimension parameter
- Modify: `saas-backend/carbon-honor/src/main/java/com/carbonpoint/honor/controller/LeaderboardController.java` — accept dimension query param

- [ ] **Step 1: Add dimension field to LeaderboardSnapshot entity**

```java
private String dimension; // daily, weekly, monthly, quarterly, yearly
```

- [ ] **Step 2: Update LeaderboardService**

- Add `dimension` parameter to snapshot methods
- Extend Redis key pattern: `leaderboard:tenant:{tenantId}:{product}:{dimension}`
- Add scheduled tasks for weekly/monthly/quarterly/yearly refresh
- Query logic: group by time range based on dimension

- [ ] **Step 3: Update LeaderboardController**

```java
@GetMapping("/{product}")
public Result<?> getLeaderboard(
        @PathVariable String product,
        @RequestParam(defaultValue = "daily") String dimension) {
    // ...
}
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add multi-dimension leaderboard support (daily/weekly/monthly/quarterly/yearly)

- LeaderboardSnapshot entity gains dimension field
- LeaderboardService supports dimension-based queries
- LeaderboardController accepts dimension query parameter
- Redis keys include dimension suffix"
```

### Task 16: Update CLAUDE.md + Final Integration

- [ ] **Step 1: Update CLAUDE.md Backend Module Layout**

Add `carbon-quiz` module to the module list.

- [ ] **Step 2: Backend full compile**

Run: `cd saas-backend && ./mvnw clean compile -Dmaven.test.skip=true -q ; echo "EXIT_CODE=$?"`

- [ ] **Step 3: Frontend full build**

Run: `cd saas-frontend && pnpm -r build`

- [ ] **Step 4: Final commit**

```bash
git commit -m "chore: update CLAUDE.md with carbon-quiz module, verify full build"
```

---

## Execution Notes

**Dependency graph between chunks:**

```
Chunk 1 (Migrations) ──→ everything
    ↓
Chunk 2 (Foundation) ──→ Chunks 3-7
    ↓
Chunks 3, 4, 5 can interleave:
    Chunk 3 (Stair) ──→ no deps beyond foundation
    Chunk 4 (Walking) ──→ no deps beyond foundation
    Chunk 5 (Quiz) ──→ no deps beyond foundation
    Chunk 6 (Mall) ──→ no deps beyond foundation
    Chunk 7 (Rule Editor) ──→ needs backend RuleNodes complete
    Chunk 8 (Leaderboard + Integration) ──→ needs all modules

Parallel execution strategy:
    Wave 1: Chunk 1 (sequential, must finish first)
    Wave 2: Chunk 2 (parallel: Task 2 + Task 3 backend | Task 4 frontend)
    Wave 3: Chunks 3-6 in parallel (each chunk has backend + frontend subagent)
    Wave 4: Chunk 7 (frontend-heavy, needs backend rules complete)
    Wave 5: Chunk 8 (integration, needs everything)
```

**Subagent assignment:**
- **Subagent A (Backend)**: Tasks 2, 3, 5, 7, 9, 11, 15
- **Subagent B (Frontend)**: Tasks 4, 6, 8, 10, 12, 13, 14
- **Subagent C (Integration)**: Task 16

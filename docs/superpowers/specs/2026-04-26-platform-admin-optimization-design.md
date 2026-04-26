# Platform Admin Optimization Design

**Date**: 2026-04-26
**Branch**: `feature/platform-admin-optimization`
**Status**: Draft

## 1. Overview

Full-stack optimization of the Carbon Point platform admin system to make all product features configurable. Enterprises see different features based on their purchased package, with a unified rule engine replacing the current dual-track system.

### Scope

- **Package feature gating**: Switch + parameter limits, dual frontend/backend validation
- **Unified rule engine**: Deprecate hardcoded `PointEngineService` path, fully adopt SPI `RuleChainExecutor`
- **Four product modules**: Stair climbing (enhanced), Walking (enhanced), Quiz (new), Points Mall (enhanced)
- **Platform admin UI**: Visual rule chain editor (React Flow), product config center, package feature selector, platform product pool

### Principles

- Build on existing SPI framework (`ProductModule` + `RuleNode` + `Feature`)
- Each product feature is a configurable `Feature` with a `code`, tied to packages
- Rule chain is configuration-driven, stored in `product_rule_templates`
- Frontend dynamically renders based on enabled features
- Backend validates feature access at API level

---

## 2. Package Feature Gating

### 2.1 Core Mechanism

**Switch + parameter limits**, dual frontend/backend validation.

```
Platform admin: Configure feature switches + parameter limits per package
    ↓
Enterprise purchases package → Determines feature boundary
    ↓
Enterprise admin: Fine-tune specific parameter values within package limits
    ↓
Frontend: Dynamic render menus/buttons/tabs based on feature list
Backend: API-level interception for unauthorized requests
```

### 2.2 Data Model (Existing, Enhanced)

```
permission_packages (package)
  └── package_products (package → product binding)
       └── package_product_features (package → product → feature switch + config override)
             ├── is_enabled: boolean
             └── config_value: JSON (parameter limits)

tenants.package_id → Determines package
Enterprise final features = package features ∩ enterprise-level switches (product_feature_configs)
```

**Example**:

```json
// package_product_features for basic package, stair product, multi_time_slot feature
// Note: product_id references platform_products.id (UUID), shown as code for readability
{
  "package_id": 1,
  "product_id": "<UUID-of-stair_climbing>",
  "feature_id": "<UUID-of-stair.time_slot-feature>",
  "is_enabled": true,
  "config_value": {"max_time_slots": 2}
}

// package_product_features for enterprise package, same feature
{
  "package_id": 3,
  "product_id": "<UUID-of-stair_climbing>",
  "feature_id": "<UUID-of-stair.time_slot-feature>",
  "is_enabled": true,
  "config_value": {"max_time_slots": 99}
}
```

### 2.3 Feature Registry

#### Stair Climbing Product (`stair_climbing`)

| Feature Code | Type | Description | Config Parameters |
|---|---|---|---|
| `stair.time_slot` | config | Time slot configuration | `max_time_slots: int` |
| `stair.floor_points` | config | Per-floor points | `enabled: bool`, `default_points_per_floor: int` |
| `stair.workday_only` | config | Valid date range | `include_weekend: bool`, `include_holiday: bool` |
| `stair.special_date` | config | Special date multiplier | `max_special_dates: int` |
| `stair.leaderboard` | config | Leaderboard dimensions | `dimensions: ["daily","weekly","monthly","quarterly","yearly"]` |

#### Walking Product (`walking`)

| Feature Code | Type | Description | Config Parameters |
|---|---|---|---|
| `walking.daily_points` | config | Daily walking points | (always on when product enabled) |
| `walking.step_tier` | config | Tiered step rewards | `max_tiers: int` |
| `walking.fun_conversion` | config | Fun conversion (rice/popsicle etc.) | `max_items: int` |
| `walking.leaderboard` | config | Leaderboard dimensions | `dimensions: ["daily","weekly","monthly","quarterly","yearly"]` |

#### Quiz Product (`quiz`) — New Module

| Feature Code | Type | Description | Config Parameters |
|---|---|---|---|
| `quiz.enabled` | switch | Quiz feature toggle | — |
| `quiz.question_types` | config | Supported question types | `types: ["true_false","single_choice","multi_choice"]` |
| `quiz.daily_limit` | config | Daily quiz count | `max_daily: int` (default 3) |
| `quiz.analysis` | config | Show answer analysis | `enabled: bool` |

#### Points Mall (`mall`)

| Feature Code | Type | Description | Config Parameters |
|---|---|---|---|
| `mall.enabled` | switch | Mall feature toggle | — |
| `mall.exchange_rate` | config | Points-to-RMB exchange rate | `allow_custom_rate: bool` |
| `mall.platform_pool` | config | Platform product pool selection | `max_products: int` |
| `mall.reports` | config | Exchange statistics reports | `dimensions: ["daily","monthly","yearly"]` |

### 2.4 Frontend Implementation

1. After login, call `GET /api/enterprise/features` → store in React Context/Zustand
2. Create `<FeatureGuard feature="stair.floor_points">` component to wrap gated UI blocks
3. Menu filtering based on feature list
4. Deprecate `FeatureMatrix.tsx` hardcoded `enabled: true`

### 2.5 Backend Implementation

1. New annotation `@RequireFeature("stair.floor_points")` + AOP interceptor
2. `@RequireFeature` AND `@RequirePerm` — both must pass for the request to proceed
3. `@RequireFeature` applies only to enterprise/H5 APIs, NOT platform admin APIs
4. Feature list cached per tenant in Redis (TTL 5min), invalidated on package/feature config change
5. Also validate parameter limits (e.g., reject if enterprise config exceeds `max_time_slots`)
6. New API `GET /api/enterprise/features` returns full feature list with config values

---

## 3. Unified Rule Engine

### 3.1 Current State Problem

Two parallel systems exist:
- **SPI path**: `RuleChainExecutor` → 8 `RuleNode` implementations (well-designed, partially enabled)
- **Legacy path**: `PointEngineService` hardcoded chain (still in use)

### 3.2 Migration Plan

**Deprecate legacy path, fully adopt SPI `RuleChainExecutor`.**

- Remove hardcoded chain from `PointEngineService.calculate()`
- All point calculation goes through `RuleChainExecutor.execute(ruleChain, ruleContext)`
- Rule chain configuration stored in `product_rule_templates.config` as JSON

### 3.3 Product Rule Chains

#### Stair Climbing Rule Chain

```
workday_filter → time_slot_match → [floor_points | random_base] →
special_date_multiplier → level_coefficient → round → daily_cap
```

> **Note**: `floor_points` and `random_base` are mutually exclusive branches. If `stair.floor_points` feature is enabled, `floor_points` executes and `random_base` is skipped. Otherwise `random_base` executes.

| Node | Status | Description | Config Source |
|------|--------|-------------|-------------|
| `workday_filter` | **New** | Check if within valid date range (workday/weekend/holiday) | `stair.workday_only` config + holiday calendar |
| `time_slot_match` | Existing | Match time slot, determine random base range | `time_slot_rules` table (expanded to multiple) |
| `floor_points` | **New** | Calculate base points by floor count | `stair.floor_points` config |
| `random_base` | Existing | Generate random points in [min, max] | Time slot config min/max |
| `special_date_multiplier` | Existing | Apply multiplier for special dates | `point_rules` (type=special_date) |
| `level_coefficient` | Existing | Apply level multiplier (1.0x - 2.5x) | User level |
| `round` | Existing | Round to nearest integer | Fixed |
| `daily_cap` | Existing | Truncate to daily cap | `point_rules` (type=daily_cap) |

**Behavior**: If `workday_filter` determines date is invalid, entire chain returns 0 points (short-circuit).

#### Walking Rule Chain

```
step_tier_match → fun_conversion → level_coefficient → round → daily_cap
```

| Node | Status | Description | Config Source |
|------|--------|-------------|-------------|
| `step_tier_match` | **New** | Match step count to tier, return corresponding points | `walking_tier_rules` table |
| `fun_conversion` | **New** | Calorie → fun item conversion (display only, no point impact) | `fun_conversion_rules` table |
| `level_coefficient` | Existing | Apply level multiplier | User level |
| `round` | Existing | Round to nearest integer | Fixed |
| `daily_cap` | Existing | Truncate to daily cap | `point_rules` |

#### Quiz Rule Chain

```
quiz_check → quiz_points → level_coefficient → round → daily_cap
```

| Node | Status | Description | Config Source |
|------|--------|-------------|-------------|
| `quiz_check` | **New** | Check daily quiz count, whether question already answered | `quiz_daily_records` table |
| `quiz_points` | **New** | Award fixed points for correct answer | `quiz_configs` per tenant |
| `level_coefficient` | Existing | Apply level multiplier | User level |
| `round` | Existing | Round to nearest integer | Fixed |
| `daily_cap` | Existing | Truncate to daily cap | `point_rules` |

### 3.4 Rule Chain Constraints

Nodes have a predefined dependency table to prevent invalid ordering:

| Node | Must come after | Must come before |
|------|-----------------|------------------|
| `workday_filter` | — | everything else |
| `time_slot_match` | `workday_filter` | `floor_points`, `random_base` |
| `floor_points` | `time_slot_match` | `special_date_multiplier` |
| `random_base` | `time_slot_match` | `special_date_multiplier` |
| `special_date_multiplier` | `floor_points`, `random_base` | `level_coefficient` |
| `level_coefficient` | `special_date_multiplier` | `round` |
| `round` | `level_coefficient` | `daily_cap` |
| `daily_cap` | `round` | — |

### 3.5 Visual Rule Chain Editor

- Built with **React Flow** library
- Left panel: Available rule node palette (drag onto canvas)
- Center: Flow chart canvas (node connections, constrained drag-to-reorder)
- Right panel: Selected node parameter configuration form
- Node colors: Blue = enabled, Gray = disabled, Red = constraint violation
- Drag validation: Preset dependency table enforces valid ordering; illegal drops are rejected with tooltip
- **Serialization**: Visual chain is serialized to `product_rule_templates.config` as a JSON array of node configs `[{"code":"workday_filter","enabled":true,"params":{...}}, ...]`. Drag reordering updates the array order. Node parameters are stored in each node's `params` object.

---

## 4. Product Module Details

### 4.1 Stair Climbing (Enhance `carbon-stair`)

**Multi time slot configuration**:
- Existing `time_slot_rules` table already supports multiple records per tenant
- Expand enterprise frontend to manage multiple time slots
- Package parameter `max_time_slots` limits the count

**Per-floor points**:
- Add field `time_slot_rules.points_per_floor` (points per floor):
  ```sql
  ALTER TABLE time_slot_rules ADD COLUMN points_per_floor INT DEFAULT NULL COMMENT '每层积分（stair.floor_points 功能启用时使用）';
  ```
- New RuleNode `FloorPointsRule`: `base_points = floor_count × points_per_floor`
- If `stair.floor_points` feature is disabled, fall back to original `base_points_min/max` random points

**Valid date range**:
- New RuleNode `WorkdayFilterRule`
- Config: `mode` (all_days | workday_only | custom), `custom_dates` (custom date list)
- Holiday calendar: Use built-in Chinese statutory holiday table (maintained by platform admin)
- If date is outside valid range, chain short-circuits to 0 points

**Special date multiplier**:
- Enhance existing `SpecialDateMultiplierRule` to support two date types:
  - Multiplier dates (e.g., company anniversary = 2x)
  - Exclusion dates (e.g., adjusted workdays = no points)
- Enterprise admin configurable

**Leaderboard enhancement**:
- Add new column `leaderboard_snapshots.dimension VARCHAR(20)` for product-specific dimensions (daily/weekly/monthly/quarterly/yearly), keeping existing `snapshot_type` unchanged for backward compatibility
  ```sql
  ALTER TABLE leaderboard_snapshots ADD COLUMN dimension VARCHAR(20) DEFAULT 'daily' COMMENT '排行维度: daily/weekly/monthly/quarterly/yearly' AFTER snapshot_type;
  ALTER TABLE leaderboard_snapshots ADD INDEX idx_tenant_dimension_date (tenant_id, dimension, snapshot_date);
  ```
- Redis key pattern: `leaderboard:tenant:{tenantId}:{product}:{dimension}`
- Scheduled tasks refresh each dimension's cache at appropriate intervals

### 4.2 Walking (Enhance `carbon-walking`)

**Tiered step rewards**:

```sql
CREATE TABLE walking_tier_rules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  min_steps INT NOT NULL,        -- minimum steps (inclusive)
  max_steps INT,                 -- maximum steps (exclusive), NULL = unlimited
  points INT NOT NULL,           -- points awarded for this tier
  sort_order INT DEFAULT 0,
  deleted TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tenant_range (tenant_id, min_steps),
  INDEX idx_tenant_id (tenant_id)
);
```

- New RuleNode `StepTierMatchRule`: Match step count to tier, return corresponding points
- Enterprise admin configures tier ranges and point values

**Fun conversion**:

```sql
CREATE TABLE fun_conversion_rules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  item_name VARCHAR(50) NOT NULL,      -- e.g., "rice", "popsicle"
  unit VARCHAR(20) NOT NULL,           -- e.g., "grams", "pieces"
  calories_per_unit DECIMAL(10,2),     -- calories consumed per unit
  icon VARCHAR(255),                   -- icon URL
  sort_order INT DEFAULT 0,
  deleted TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tenant_item (tenant_id, item_name),
  INDEX idx_tenant_id (tenant_id)
);
```

- When walking data is submitted, backend converts: steps → calories → fun items, returns to frontend
- Display-only data, does not affect point calculation
- Enterprise admin fully customizes conversion items

**Leaderboard**: Same as stair climbing, extended to daily/weekly/monthly/quarterly/yearly.

### 4.3 Quiz (New Module `carbon-quiz`)

**Question data model**:

```sql
CREATE TABLE quiz_questions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  type ENUM('true_false', 'single_choice', 'multi_choice') NOT NULL,
  content TEXT NOT NULL,                -- question text
  options JSON,                         -- [{"label":"A","text":"..."}, ...]
  answer JSON NOT NULL,                 -- correct answer ["A"] or ["A","C"]
  analysis TEXT,                        -- answer analysis/explanation
  category VARCHAR(50),                 -- category tag
  difficulty TINYINT DEFAULT 1,         -- 1-3 difficulty level
  enabled TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tenant_enabled (tenant_id, enabled)
);

CREATE TABLE quiz_daily_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  question_id BIGINT NOT NULL,
  is_correct TINYINT NOT NULL,
  user_answer JSON,                     -- user's submitted answer
  points_earned INT DEFAULT 0,
  answer_date DATE NOT NULL,            -- extracted date for unique constraint
  answered_at DATETIME NOT NULL,
  UNIQUE KEY uk_user_daily_question (tenant_id, user_id, question_id, answer_date)
);

CREATE TABLE quiz_configs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  daily_limit INT DEFAULT 3,            -- daily quiz count limit
  points_per_correct INT DEFAULT 10,    -- points for correct answer
  show_analysis TINYINT DEFAULT 1,      -- show answer analysis
  enabled TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tenant (tenant_id)
);
```

**Business flow**:
1. User requests quiz → randomly select unanswered questions from `quiz_questions` (up to `daily_limit` per day). **Security**: H5 API must never return the `answer` field; only `id`, `type`, `content`, `options` are sent to the client.
2. User submits answer → validate correctness server-side, execute rule chain for point calculation. **Anti-cheat**: Rate-limit per user (max 3 submissions/day); reject duplicate submissions for the same question on the same day.
3. Return result + answer analysis
4. H5 quiz UI

**Module structure**:
```
carbon-quiz/
  ├── entity/       QuizQuestion, QuizDailyRecord, QuizConfig
  ├── service/      QuizService, QuizPointService
  ├── controller/   QuizController (H5), QuizAdminController (enterprise)
  ├── product/      QuizProduct (implements ProductModule)
  └── mapper/       MyBatis-Plus mappers
```

### 4.4 Points Mall (Enhance `carbon-mall`)

**Exchange rate coefficient**:
- Add field to tenants table:
  ```sql
  ALTER TABLE tenants ADD COLUMN points_exchange_rate DECIMAL(10,4) DEFAULT 1.0000 COMMENT '积分兑换人民币汇率（如 100.0000 = 100积分=1元）';
  ```
- Product pricing in RMB cents `price_cents` (stored in platform mall products)
- Frontend display price = `price_cents × exchange_rate` (rounded to integer points)
- Enterprise admin configures exchange rate

**Platform product pool**:

> **Note**: This uses `platform_mall_products` (new table) to avoid conflict with the existing `platform_products` table (V18 migration, UUID PK, product SPI registry). The existing table registers products (stair_climbing, walking) in the SPI framework. The new table manages mall merchandise (coupon, recharge, privilege) for the points exchange system.

```sql
CREATE TABLE platform_mall_products (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  type ENUM('coupon','recharge','privilege') NOT NULL,
  price_cents INT NOT NULL,             -- RMB price in cents
  description TEXT,
  image_url VARCHAR(255),
  fulfillment_config JSON,              -- fulfillment details
  status TINYINT DEFAULT 1,             -- 0=disabled 1=enabled
  deleted TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE tenant_product_shelf (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  platform_mall_product_id BIGINT NOT NULL,
  shelf_status TINYINT DEFAULT 1,       -- 0=off-shelf 1=on-shelf
  shelf_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tenant_product (tenant_id, platform_mall_product_id)
);
```

- Enterprise admin selects products from platform pool → writes to `tenant_product_shelf`
- Users see only enterprise-shelved products, price = `platform_mall_products.price_cents × tenant.points_exchange_rate`

**Statistics reports**:
- New query APIs: Exchange volume stats, points consumption stats, product popularity ranking
- Time range filters: daily, monthly, yearly

---

## 5. Platform Admin UI

### 5.1 Product Configuration Center (Refactor `ProductManagement.tsx`)

**Product list page** — 4 product cards:

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Stair       │  │ Walking     │  │ Quiz        │  │ Mall        │
│ Climbing    │  │ Points      │  │ Points      │  │ Exchange    │
│ 5 features  │  │ 4 features  │  │ 4 features  │  │ 4 features  │
│ [Config] →  │  │ [Config] →  │  │ [Config] →  │  │ [Config] →  │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

**Product detail page (Tab layout)**:

```
Stair Climbing Configuration
├── Rule Chain (React Flow visual editor)
├── Feature Switches (Feature list with enable/disable + parameter config)
├── Rule Templates (Platform-level default rule values)
└── Package Assignment (Which packages include this product and feature boundaries)
```

### 5.2 Package Management (Enhance `PackageManagement.tsx`)

**Package edit page enhanced**:

```
Package Edit
├── Basic Info (name, description, price, max users)
├── Product Selection (checkbox: stair/walking/quiz/mall)
│   └── Each product expands → Feature switches + parameter limits
│       ├── Stair:
│       │   ├── [✓] Multi time slot    Max 2 slots
│       │   ├── [ ] Per-floor points
│       │   ├── [✓] Workday only
│       │   └── [✓] Leaderboard     Dimensions: daily, weekly
│       └── ...
└── Permission Config (existing RBAC permission assignment)
```

### 5.3 Platform Product Pool Management (New)

```
Platform Product Management
├── Product List (platform-level, master catalog)
├── Product Add/Edit (name, type, RMB price, image, description)
└── Enable/Disable
```

### 5.4 Enterprise Management Enhancement

Add to existing `EnterpriseManagement.tsx`:
- View enterprise's current package feature details
- Quick package switching
- Enterprise product shelf status view

### 5.5 Frontend File Changes

| File | Action | Description |
|------|--------|-------------|
| `ProductManagement.tsx` | Refactor | Product cards + detail tabs |
| `ProductConfig.tsx` | New | Rule chain visual editor |
| `PackageManagement.tsx` | Enhance | Product feature selection + parameter limits |
| `PlatformProductPool.tsx` | New | Platform product pool management |
| `RuleChainEditor.tsx` | New | React Flow rule chain editor component |
| `FeatureConfig.tsx` | New | Feature switch + parameter config component |
| `FeatureGuard.tsx` | New | Feature gating wrapper component |

---

## 6. Backend API Changes

### 6.1 Platform Admin APIs

| API | Method | Description |
|-----|--------|-------------|
| `/api/platform/products/{id}/rule-chain` | GET/PUT | Get/update rule chain config |
| `/api/platform/products/{id}/features` | GET/PUT | Get/update product feature definitions |
| `/api/platform/packages/{id}/features` | GET/PUT | Get/update package feature config |
| `/api/platform/products/pool` | CRUD | Platform mall product pool management (`platform_mall_products`) |
| `/api/platform/holidays` | CRUD | Holiday calendar management |

### 6.2 Enterprise Admin APIs

| API | Method | Description |
|-----|--------|-------------|
| `/api/enterprise/features` | GET | Get current enterprise feature list |
| `/api/enterprise/rule-chain/{product}` | GET | Get enterprise rule chain config |
| `/api/enterprise/quiz/questions` | CRUD | Quiz question management |
| `/api/enterprise/quiz/config` | GET/PUT | Quiz config (daily limit, points, etc.) |
| `/api/enterprise/walking/tiers` | CRUD | Walking tier config |
| `/api/enterprise/walking/conversions` | CRUD | Fun conversion config |
| `/api/enterprise/mall/exchange-rate` | GET/PUT | Exchange rate coefficient |
| `/api/enterprise/mall/shelf` | CRUD | Enterprise product shelf management |

### 6.3 H5 User APIs

| API | Method | Description |
|-----|--------|-------------|
| `/api/h5/quiz/daily` | GET | Get today's quiz questions |
| `/api/h5/quiz/submit` | POST | Submit quiz answer |
| `/api/h5/walking/report` | POST | Report walking steps |
| `/api/h5/mall/products` | GET | List available products (enterprise-shelved) |
| `/api/h5/mall/exchange` | POST | Exchange product with points |

---

## 7. Implementation Phases

### Phase 0: Database Migration
- `ALTER TABLE tenants ADD COLUMN points_exchange_rate`
- `ALTER TABLE time_slot_rules ADD COLUMN points_per_floor`
- `ALTER TABLE leaderboard_snapshots ADD COLUMN dimension`
- `CREATE TABLE walking_tier_rules` (with `deleted`, `tenant_id` index)
- `CREATE TABLE fun_conversion_rules` (with `deleted`, `tenant_id` index)
- `CREATE TABLE quiz_questions`, `quiz_daily_records`, `quiz_configs`
- `CREATE TABLE platform_mall_products`, `tenant_product_shelf`
- Seed feature registry entries into `features` and `product_features` tables

### Phase 1: Foundation (Package gating + rule engine unification)
- Implement `@RequireFeature` annotation + AOP
- Unify rule engine: fully adopt `RuleChainExecutor`, deprecate legacy path
- Enterprise features API + frontend `FeatureGuard` component
- Data model changes: feature registry seeding

### Phase 2: Stair Climbing Enhancement
- Multi time slot support (frontend + validation)
- Per-floor points RuleNode
- Workday filter RuleNode + holiday calendar
- Enhanced special date multiplier
- Leaderboard dimension expansion

### Phase 3: Walking Enhancement
- Tiered step rewards (new table + RuleNode)
- Fun conversion (new table + enterprise customization)
- Leaderboard dimension expansion

### Phase 4: Quiz Module (New)
- `carbon-quiz` module scaffold
- Question CRUD (3 types: true/false, single/multi choice)
- Quiz rule chain
- H5 quiz UI

### Phase 5: Mall Enhancement
- Platform product pool (new tables + APIs)
- Enterprise product shelf management
- Exchange rate coefficient
- Statistics reports

### Phase 6: Visual Rule Chain Editor
- React Flow integration
- Constrained drag-and-drop
- Node parameter configuration panels
- Package feature selector UI

---

## 8. Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rule engine approach | SPI RuleNode (Java classes) | Independently testable, type-safe, debuggable |
| Visual editor library | React Flow | Mature, well-documented, supports constraints |
| Feature gating granularity | Switch + parameter limits | Flexible enough for package differentiation |
| Quiz question types | 3 types (true/false, single, multi) | Covers common quiz scenarios |
| Points pricing | RMB base × exchange rate | Simple, enterprise-controllable |
| Leaderboard scope | Enterprise-internal only | Privacy and fairness |
| Holiday calendar | Built-in table + platform admin management | No external API dependency |

---

## 9. Sync Mechanism: Platform → Tenant

This section clarifies how platform-level configuration syncs to tenant-level data, and how this spec interacts with the April 24 package-product-config redesign spec.

### 9.1 Two Categories of Tenant Data

| Category | Tables | Who Controls | Sync Behavior |
|----------|--------|-------------|---------------|
| **Platform-managed templates** | `product_rule_templates`, `features`, `product_features` | Platform admin only | Platform changes push down as defaults; tenant cannot modify |
| **Tenant-configurable data** | `time_slot_rules`, `walking_tier_rules`, `fun_conversion_rules`, `quiz_questions`, `quiz_configs`, `point_rules`, `tenant_product_shelf` | Enterprise admin within package limits | Fully tenant-owned; platform does not overwrite |

### 9.2 Package Change Handling

When an enterprise changes packages:
1. Features that are **disabled in the new package** are hidden from the enterprise admin UI
2. Tenant-configurable data (e.g., `walking_tier_rules`) is preserved but inaccessible
3. If the enterprise upgrades back to a package that re-enables the feature, their previous configuration is restored
4. Features that are **newly enabled** use platform-level default values from `product_rule_templates` until the enterprise admin customizes them

### 9.3 Sync Flow

```
Platform admin updates product rule template
    ↓
Event: PlatformConfigChangedEvent
    ↓
For each tenant using this product:
    → Update tenant's cached rule config (Redis)
    → Do NOT overwrite tenant-customizable tables
    → Only update template-level defaults (product_configs.config_json)
```

### 9.4 New Module Addition

`carbon-quiz` is added to the backend module layout (update CLAUDE.md):
```
carbon-common     # Shared utilities
carbon-system     # Users, tenants, RBAC, JWT, packages
carbon-platform   # Product SPI framework
carbon-stair      # Stair climbing product
carbon-walking    # Walking product
carbon-quiz       # Quiz product (NEW)
carbon-points     # Point accounts, engine
carbon-mall       # Virtual mall
carbon-honor      # Honor system
carbon-report     # Dashboards, reports
carbon-app        # Application entry point
```

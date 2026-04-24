# Package-Product Config Redesign

**Date:** 2026-04-24
**Status:** Approved
**Branch:** fix/package-management-flow

## Problem

The current product/rule architecture has a disconnect:

1. **Platform products** define rule chains as metadata (`platform_products.rule_chain_config`), but tenant runtime uses an independent `point_rules` table with no link back to products.
2. **Rule template page** in PlatformConfig is an empty shell with hardcoded mock data.
3. **Tenant-level product configs** (`product_configs`, `product_feature_configs`) have DDL but no backend implementation.
4. Platform admins have no way to configure per-product parameters (points per floor, time windows, step formulas).

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Config template storage | Hybrid: JSON for params + table for rule templates | JSON suits fixed key-value params; table suits CRUD-heavy rule templates |
| Template-to-tenant propagation | Immediate sync on platform save | Platform is the single source of truth; tenants can only toggle |
| Tenant customization scope | Enable/disable only | Prevents configuration drift; platform controls all parameters |
| Rule template location | Merged into product config, not separate page | Rules belong to products; reduces navigation complexity |
| Existing point_rules reuse | Yes, with source_template_id tracking | Preserves rule execution engine; minimal disruption |

## Data Model

### 1. `platform_products.basic_config` (new JSON column)

Fixed key-value parameters per product. Schema varies by trigger type.

**Stair climbing (trigger=checkin):**

```json
{
  "point_params": {
    "points_per_floor": 10,
    "daily_cap": 200,
    "level_coefficient_enabled": true
  },
  "behavior_params": {
    "checkin_window_start": "06:00",
    "checkin_window_end": "22:00"
  }
}
```

**Walking (trigger=sensor_data):**

```json
{
  "point_params": {
    "points_per_step": 0.1,
    "daily_cap": 150,
    "level_coefficient_enabled": true
  },
  "behavior_params": {
    "min_step_threshold": 1000,
    "step_formula": "steps * 0.1"
  }
}
```

### 2. `product_rule_templates` (new table)

```sql
CREATE TABLE product_rule_templates (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  config JSON NOT NULL,
  enabled TINYINT DEFAULT 1,
  sort_order INT DEFAULT 0,
  description VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_product_id (product_id),
  INDEX idx_rule_type (rule_type)
);
```

Rule types and their config schemas:

| rule_type | config schema | Example |
|-----------|--------------|---------|
| `time_slot` | `{ startTime, endTime, basePoints }` | `{ "startTime": "06:00", "endTime": "12:00", "basePoints": 10 }` |
| `streak` | `{ consecutiveDays, bonusPoints }` | `{ "consecutiveDays": 7, "bonusPoints": 50 }` |
| `special_date` | `{ date, multiplier, name }` | `{ "date": "2026-05-01", "multiplier": 2.0, "name": "劳动节" }` |
| `daily_cap` | `{ maxPoints }` | `{ "maxPoints": 200 }` |
| `level_coefficient` | `{ bronze, silver, gold, platinum, diamond }` | `{ "bronze": 1.0, "silver": 1.1, "gold": 1.2, "platinum": 1.3, "diamond": 1.5 }` |

### 3. `point_rules` modifications

```sql
ALTER TABLE point_rules ADD COLUMN source_template_id VARCHAR(36) DEFAULT NULL;
ALTER TABLE point_rules ADD COLUMN product_code VARCHAR(50) DEFAULT NULL COMMENT 'product code this rule belongs to';
```

- `source_template_id`: links back to `product_rule_templates.id` for sync tracking
- `product_code`: separates rules by product (stair_climbing vs walking)

### 4. Unchanged tables

- `product_features` -- feature config stays as-is
- `permission_packages`, `package_products`, `package_product_features` -- no changes
- `platform_products.rule_chain_config` -- kept as metadata reference

## Sync Mechanism

### Trigger points

| Event | Sync action |
|-------|-------------|
| Platform saves/updates basic_config | Upsert matching point_rules (type=product_config) for all tenants with this product |
| Platform creates/updates rule template | Upsert matching point_rules (by source_template_id) for all tenants |
| Platform deletes rule template | Delete matching point_rules for all tenants |
| Package adds a new product | Sync that product's templates to all tenants on that package |
| Tenant subscribes/changes package | Initialize all rule templates from new package's products |

### Sync flow

```
Platform saves product config (basic_config or rule_template)
  |
  +-- Query packages containing this product
  |     +-- Get tenant_ids from tenants.package_id
  |
  +-- For each tenant:
        +-- basic_config change -> upsert point_rule (type=product_config, preserve enabled)
        +-- rule_template change -> upsert point_rule (preserve enabled, update name/config/sort_order)
```

### Edge cases

- **Template deletion**: Soft-delete template, delete tenant point_rules by source_template_id. Historical points already awarded are not affected.
- **Product disabled (status=0)**: Existing tenant rules keep running. New packages cannot add the product.
- **Tenant switches package**: Old product rules are removed, new product templates are initialized.

## Backend Architecture

### New service

```
ProductRuleTemplateService
  +-- listByProduct(productId) -> List<ProductRuleTemplate>
  +-- create(productId, template) -> ProductRuleTemplate
  +-- update(templateId, template) -> ProductRuleTemplate
  +-- delete(templateId) -> void
  +-- syncToTenants(productId) -> void
```

### Modified services

```
ProductService
  +-- getBasicConfig(productId) -> BasicConfig
  +-- updateBasicConfig(productId, config) -> void (triggers sync)

PointRuleService
  +-- syncFromTemplate(template, tenantIds) -> void
  +-- initializeFromPackage(tenantId, packageId) -> void
  +-- removeByProduct(tenantId, productCode) -> void
```

### API endpoints

**Platform admin:**

```
GET    /platform/products/{id}/basic-config
PUT    /platform/products/{id}/basic-config

GET    /platform/products/{id}/rule-templates
POST   /platform/products/{id}/rule-templates
PUT    /platform/products/{id}/rule-templates/{templateId}
DELETE /platform/products/{id}/rule-templates/{templateId}
```

**Enterprise tenant:**

```
GET  /api/tenant/products/{code}/rules          # list rules with toggle state (read-only config)
PUT  /api/tenant/products/{code}/rules/{id}/toggle  # flip enabled
GET  /api/tenant/products/{code}/basic-config   # read-only basic config
```

## Frontend Changes

### Product config detail page (new)

Route: `/platform/products/:id/config`

Replaces the existing drawer. Four tabs:

| Tab | Content | Editable |
|-----|---------|----------|
| Basic Info | code, name, category, triggerType, status, sortOrder | Yes |
| Basic Config | point params + behavior params (dynamic form by triggerType) | Yes |
| Rule Templates | CRUD table with type tag, name, config summary, enable toggle | Yes |
| Feature Config | feature list with toggle, configValue input, required/optional badge | Yes |

Basic Config form fields by trigger type:

**checkin (stair climbing):**
- points_per_floor (number)
- daily_cap (number)
- level_coefficient_enabled (switch)
- checkin_window_start (time picker)
- checkin_window_end (time picker)

**sensor_data (walking):**
- points_per_step (number)
- daily_cap (number)
- level_coefficient_enabled (switch)
- min_step_threshold (number)
- step_formula (text input with formula hint)

Rule Template CRUD:
- Add button opens modal: select rule_type -> show type-specific form
- Table columns: rule_type (Tag), name, config summary, enabled (switch), actions (edit/delete/sort)

### Package Management (minor)

- Product selector dialog: show basic config summary (read-only) for each selected product
- Feature toggles: keep existing behavior

### PlatformConfig

- Remove "Rule Templates" tab (templates now live in product config)

### Enterprise frontend -- new page

Route: `/enterprise/product-config`

Menu item: "Product Config"

For each available product (from tenant's package):
- Product card header with name
- Basic config display (read-only, key-value pairs)
- Rule list (read-only config + enable/disable toggle)
- Feature toggles (existing logic)

## Migration Strategy

```sql
-- Step 1: Add columns to point_rules
ALTER TABLE point_rules ADD COLUMN source_template_id VARCHAR(36) DEFAULT NULL;
ALTER TABLE point_rules ADD COLUMN product_code VARCHAR(50) DEFAULT NULL;

-- Step 2: Add basic_config to platform_products
ALTER TABLE platform_products ADD COLUMN basic_config JSON DEFAULT NULL;

-- Step 3: Create product_rule_templates table
CREATE TABLE product_rule_templates (...);

-- Step 4: Migrate data
-- Extract point settings from platform_configs (group='point_settings')
-- into platform_products.basic_config per product

-- Step 5: Seed default rule templates for stair_climbing and walking products

-- Step 6: Backfill existing tenant point_rules with source_template_id and product_code
```

## Scope Exclusions

- SPI framework (ProductRegistry, RuleChainExecutor) -- unchanged
- Points calculation engine -- reads point_rules as before
- Honor/level system -- unchanged
- Mall/order system -- unchanged

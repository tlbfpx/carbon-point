# 多产品通用 SaaS 平台实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Carbon Point 从单一爬楼打卡平台泛化为支持多产品（爬楼+走路+未来扩展）的通用 SaaS 平台。

**Architecture:** 混合式产品架构——共享基础设施（积分账户、等级、商城）+ 产品独立模块（碳楼/走路各自有触发器和规则链）+ 可复用积木组件库。新产品通过组合积木创建，积木不够时开发团队扩展。

**Tech Stack:** Spring Boot 3.x / Java 21 / MyBatis-Plus / Maven (后端); React 18 / TypeScript / Ant Design 5 / Vite / pnpm (前端); MySQL / Redis (数据)

**Design Spec:** `docs/superpowers/specs/2026-04-19-multi-product-saas-platform-design.md`

---

## Chunk 1: Database Schema + carbon-platform Module

### 关键发现

1. **已有实体**: `carbon-system` 中已存在 `ProductEntity` (table: `platform_products`), `ProductFeatureEntity` (table: `product_features`), `PackageProductEntity` (table: `package_products`), `PackageProductFeatureEntity` (table: `package_product_features`)。有 mapper 和 `ProductService`。
2. **DDL 不完整**: `platform_products` 有 V18 迁移，但 `product_features`, `package_products`, `package_product_features` 没有 DDL 迁移脚本——仅有 Java 实体。
3. **表名冲突**: 商城模块用 `products`（租户级，商品），平台级产品用 `platform_products`。必须保留此区分。
4. **缺失表**: 需要新建 `product_configs`（租户级产品配置）, `product_feature_configs`（租户级功能点开关）, `step_daily_records`（走路产品每日步数）。
5. **point_transactions** 需要 `product_code` 和 `source_type` 列。

### Task 1: Database Migration SQL

**Files:**
- Create: `openspec/review/ddl/multi-product-schema.sql`
- Reference: `saas-backend/carbon-app/src/main/resources/db/migration/V18__create_platform_products_table.sql`

- [ ] **Step 1:** 创建 DDL 迁移文件 `openspec/review/ddl/multi-product-schema.sql`，包含以下 sections：

**Section A: product_features** (已有 Java 实体，无 DDL):
```sql
CREATE TABLE IF NOT EXISTS product_features (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id      VARCHAR(36) NOT NULL COMMENT 'Product ID',
    feature_id      VARCHAR(36) NOT NULL COMMENT 'Feature ID',
    config_value    VARCHAR(500) COMMENT 'Default config value',
    is_required     TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Required features cannot be disabled',
    is_enabled      TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_product_feature (product_id, feature_id),
    INDEX idx_product_id (product_id),
    INDEX idx_feature_id (feature_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product-Feature association table';
```

**Section B: package_products** (已有 Java 实体，无 DDL):
```sql
CREATE TABLE IF NOT EXISTS package_products (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    package_id      BIGINT NOT NULL COMMENT 'Package ID',
    product_id      VARCHAR(36) NOT NULL COMMENT 'Product ID',
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_package_product (package_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Package-Product association table';
```

**Section C: package_product_features** (已有 Java 实体，无 DDL):
```sql
CREATE TABLE IF NOT EXISTS package_product_features (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    package_id      BIGINT NOT NULL,
    product_id      VARCHAR(36) NOT NULL,
    feature_id      VARCHAR(36) NOT NULL,
    config_value    VARCHAR(500),
    is_enabled      TINYINT(1) NOT NULL DEFAULT 1,
    is_customized   TINYINT(1) NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_package_product_feature (package_id, product_id, feature_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Package-Product-Feature config table';
```

**Section D: product_configs** (全新):
```sql
CREATE TABLE IF NOT EXISTS product_configs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    product_id      VARCHAR(36) NOT NULL,
    enabled         TINYINT(1) NOT NULL DEFAULT 1,
    config_json     JSON COMMENT 'Tenant-specific product config',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant_product (tenant_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tenant-level product configuration';
```

**Section E: product_feature_configs** (全新):
```sql
CREATE TABLE IF NOT EXISTS product_feature_configs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    product_id      VARCHAR(36) NOT NULL,
    feature_id      VARCHAR(36) NOT NULL,
    enabled         TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant_product_feature (tenant_id, product_id, feature_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tenant-level feature toggle';
```

**Section F: step_daily_records** (全新):
```sql
CREATE TABLE IF NOT EXISTS step_daily_records (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    user_id         BIGINT NOT NULL,
    record_date     DATE NOT NULL,
    step_count      INT NOT NULL DEFAULT 0,
    claimed         TINYINT(1) NOT NULL DEFAULT 0,
    points_earned   INT NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_date (user_id, record_date),
    INDEX idx_tenant_date (tenant_id, record_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daily step records for walking product';
```

**Section G: ALTER point_transactions**:
```sql
ALTER TABLE point_transactions
    ADD COLUMN product_code VARCHAR(50) COMMENT 'Product code: stair_climbing/walking/...',
    ADD COLUMN source_type  VARCHAR(50) COMMENT 'Source type: check_in/steps_claimed/streak_bonus/...';
CREATE INDEX idx_pt_product ON point_transactions(product_code);
```

**Section H: Seed data** — INSERT `stair_climbing` 和 `walking` 产品，关联功能点，链接到现有套餐（free → 爬楼, pro/enterprise → 爬楼+走路）。

- [ ] **Step 2:** 验证 DDL 语法。新表都有 tenant_id，会被 MyBatis-Plus 租户拦截器自动过滤，无需修改 `CustomTenantLineHandler`。

```bash
cd saas-backend && ./mvnw compile -pl carbon-system -q
```

Expected: BUILD SUCCESS

---

### Task 2: carbon-platform Maven Module

**Files:**
- Create: `saas-backend/carbon-platform/pom.xml`
- Modify: `saas-backend/pom.xml` (add module + dependencyManagement)

- [ ] **Step 1:** 在父 pom 的 `<modules>` 中添加 `<module>carbon-platform</module>`（在 carbon-common 之后）

- [ ] **Step 2:** 在父 pom 的 `<dependencyManagement>` 中添加:
```xml
<dependency>
    <groupId>com.carbonpoint</groupId>
    <artifactId>carbon-platform</artifactId>
    <version>${project.version}</version>
</dependency>
```

- [ ] **Step 3:** 创建目录结构:
```bash
cd saas-backend
mkdir -p carbon-platform/src/main/java/com/carbonpoint/platform/{model,registry,entity,mapper}
mkdir -p carbon-platform/src/test/java/com/carbonpoint/platform
```

- [ ] **Step 4:** 创建 `carbon-platform/pom.xml`，依赖 carbon-common，遵循现有模块 POM 模式

- [ ] **Step 5:** 验证构建:
```bash
cd saas-backend && ./mvnw compile -pl carbon-platform -am
```
Expected: BUILD SUCCESS

---

### Task 3: Product Framework Interfaces

**Files:**
- Create: `saas-backend/carbon-platform/src/main/java/com/carbonpoint/platform/ProductModule.java`
- Create: `saas-backend/carbon-platform/src/main/java/com/carbonpoint/platform/Trigger.java`
- Create: `saas-backend/carbon-platform/src/main/java/com/carbonpoint/platform/RuleNode.java`
- Create: `saas-backend/carbon-platform/src/main/java/com/carbonpoint/platform/Feature.java`
- Create: `saas-backend/carbon-platform/src/main/java/com/carbonpoint/platform/model/{TriggerContext,TriggerResult,RuleContext,RuleResult}.java`
- Create: `saas-backend/carbon-platform/src/main/java/com/carbonpoint/platform/registry/ProductRegistry.java`
- Create: `saas-backend/carbon-platform/src/test/java/com/carbonpoint/platform/ProductRegistryTest.java`

- [ ] **Step 1 (TDD):** 先写 `ProductRegistryTest`，测试自动发现逻辑——空上下文返回空列表，注册1个/2个模块正确查找，未知 code 返回 empty

- [ ] **Step 2:** 创建 `ProductModule` 接口:
```java
public interface ProductModule {
    String getCode();           // "stair_climbing", "walking"
    String getName();           // "Stair Climbing"
    String getTriggerType();    // "check_in", "sensor_data"
    List<String> getRuleChain();
    List<String> getFeatures();
}
```

- [ ] **Step 3:** 创建 `Trigger` 接口: `getType()`, `execute(TriggerContext): TriggerResult`

- [ ] **Step 4:** 创建 `RuleNode` 接口: `getType()`, `process(RuleContext): RuleResult`

- [ ] **Step 5:** 创建 `Feature` 接口: `getType()`, `getName()`, `isRequired()`, `getDefaultConfig()`

- [ ] **Step 6:** 创建 model 类 (`TriggerContext`, `TriggerResult`, `RuleContext`, `RuleResult`) 使用 `@Builder` + `@Getter`

- [ ] **Step 7:** 创建 `ProductRegistry` 组件——`@PostConstruct` 扫描所有 `ProductModule` Bean，提供 `getAllModules()`, `getModule(code)`, `hasModule(code)` 方法

- [ ] **Step 8:** 运行测试:
```bash
cd saas-backend && ./mvnw test -pl carbon-platform -am
```
Expected: 4 tests pass

---

### Task 4: Product Entity and Mapper (New Tables)

**Files:**
- Create: `saas-backend/carbon-platform/src/main/java/com/carbonpoint/platform/entity/{ProductConfigEntity,ProductFeatureConfigEntity,StepDailyRecordEntity}.java`
- Create: `saas-backend/carbon-platform/src/main/java/com/carbonpoint/platform/mapper/{ProductConfigMapper,ProductFeatureConfigMapper,StepDailyRecordMapper}.java`
- Create: `saas-backend/carbon-platform/src/test/java/com/carbonpoint/platform/entity/ProductConfigEntityTest.java`

Note: `ProductEntity`, `ProductFeatureEntity`, `PackageProductEntity` 已存在于 `carbon-system`，不重复创建。

- [ ] **Step 1 (TDD):** 写 entity 字段赋值/默认值测试

- [ ] **Step 2:** 创建三个 entity 类（`@Data` + `@TableName`，遵循现有模式）

- [ ] **Step 3:** 创建三个 mapper 接口（`@Mapper` + `extends BaseMapper<T>`）：
  - `ProductConfigMapper`: `selectByTenantAndProduct`, `selectEnabledByTenant`
  - `ProductFeatureConfigMapper`: `selectByTenantAndProduct`, `selectEnabledFeatureIds`
  - `StepDailyRecordMapper`: `selectByUserAndDate`, `claimPoints`

- [ ] **Step 4:** 运行测试:
```bash
cd saas-backend && ./mvnw test -pl carbon-platform -am
```
Expected: 8 tests pass (4 registry + 4 entity)

- [ ] **Step 5:** 全量构建验证:
```bash
cd saas-backend && ./mvnw compile test -q
```
Expected: BUILD SUCCESS，无回归

---

## Chunk 2: Product Modules (carbon-stair + carbon-walking)

### Task 5: carbon-stair Maven Module

**Files:**
- Create: `saas-backend/carbon-stair/pom.xml`
- Create: `saas-backend/carbon-stair/src/main/java/com/carbonpoint/stair/config/StairMyBatisConfig.java`
- Create: `saas-backend/carbon-stair/src/test/java/com/carbonpoint/stair/TestApplication.java`
- Modify: `saas-backend/pom.xml` (add module + dependencyManagement)

- [ ] **Step 1:** 创建 pom.xml 依赖 carbon-common, carbon-points, carbon-system（镜像 carbon-checkin 的 pom）

- [ ] **Step 2:** 添加到父 pom 的 modules 和 dependencyManagement

- [ ] **Step 3:** 创建测试基础设施（TestApplication, application-test.yml, schema-h2.sql）

- [ ] **Step 4:** 验证:
```bash
cd saas-backend && ./mvnw -pl carbon-stair test-compile
```

---

### Task 6: StairClimbingProduct Implementation

**Files:**
- Create: `saas-backend/carbon-stair/src/main/java/com/carbonpoint/stair/entity/{CheckInRecordEntity,OutboxEvent,TimeSlotRule}.java` (从 carbon-checkin 迁移)
- Create: `saas-backend/carbon-stair/src/main/java/com/carbonpoint/stair/mapper/{CheckInRecordMapper,OutboxEventMapper,TimeSlotRuleMapper,StairUserMapper}.java`
- Create: `saas-backend/carbon-stair/src/main/java/com/carbonpoint/stair/dto/{CheckInRequestDTO,CheckInResponseDTO,CheckInRecordDTO,TimeSlotDTO}.java`
- Create: `saas-backend/carbon-stair/src/main/java/com/carbonpoint/stair/product/StairClimbingProduct.java`
- Create: `saas-backend/carbon-stair/src/main/java/com/carbonpoint/stair/rule/{RuleNode,RuleContext,RuleChainExecutor,TimeSlotMatchRule,RandomBaseRule,SpecialDateMultiplierRule,LevelCoefficientRule,RoundRule,DailyCapRule}.java`
- Create: `saas-backend/carbon-stair/src/main/java/com/carbonpoint/stair/service/CheckInService.java` (从 carbon-checkin 迁移，重构使用规则链)
- Create: `saas-backend/carbon-stair/src/main/java/com/carbonpoint/stair/controller/CheckInController.java`
- Reference: `saas-backend/carbon-checkin/src/main/java/com/carbonpoint/checkin/service/CheckInService.java` (源代码)
- Reference: `saas-backend/carbon-points/src/main/java/com/carbonpoint/points/service/PointEngineService.java` (规则逻辑提取)

- [ ] **Step 1:** 迁移 entity/mapper 层（从 carbon-checkin 复制，改包名为 `com.carbonpoint.stair`）

- [ ] **Step 2:** 迁移 DTO 层

- [ ] **Step 3:** 创建 `StairClimbingProduct`:
```java
@Component
public class StairClimbingProduct {
    public static final String CODE = "stair_climbing";
    public static final String TRIGGER_TYPE = "check_in";
    // ruleChain: [time_slot_match, random_base, special_date_multiplier, level_coefficient, round, daily_cap]
    // features: [time_slot_config(required), special_date(optional), weekly_gift(optional), consecutive_reward(optional), points_exchange(required)]
}
```

- [ ] **Step 4:** 创建6个 RuleNode 实现（从 PointEngineService 提取逻辑）:
  - `TimeSlotMatchRule`: 从 `isTimeInSlot()` 提取
  - `RandomBaseRule`: 从 `calculateBasePoints()` 提取
  - `SpecialDateMultiplierRule`: 从 `getSpecialDateMultiplier()` 提取
  - `LevelCoefficientRule`: 从 LevelConstants 提取
  - `RoundRule`: `Math.round()` 取整
  - `DailyCapRule`: 从 `getDailyLimit()` 提取

- [ ] **Step 5:** 创建 `RuleChainExecutor` — 按序执行规则链节点

- [ ] **Step 6:** 为每个 RuleNode 写单元测试（TDD）

- [ ] **Step 7:** 迁移 `CheckInService`，替换内联积分计算为 `RuleChainExecutor.execute()`:
```java
// Old: PointCalcResult calcResult = pointEngine.calculate(userId, rule, user.getLevel());
// New:
RuleContext context = new RuleContext(userId, tenantId, user.getLevel(), rule, dailyAwarded);
ruleChainExecutor.execute(stairRuleChain, context);
int finalPoints = context.getCurrentPoints();
```
保留分布式锁、outbox event、重复检查、连续天数追踪不变。

- [ ] **Step 8:** 迁移 `CheckInController`（API 路径 `/api/checkin` 不变）

- [ ] **Step 9:** 更新 carbon-app 的 pom.xml，用 carbon-stair 替换 carbon-checkin

- [ ] **Step 10:** 验证:
```bash
cd saas-backend && ./mvnw test -pl carbon-stair
```

---

### Task 7: carbon-walking Maven Module

**Files:**
- Create: `saas-backend/carbon-walking/pom.xml`
- Create: `saas-backend/carbon-walking/src/main/java/com/carbonpoint/walking/`
- Modify: `saas-backend/pom.xml` (add module)

- [ ] **Step 1-4:** 同 Task 5 的模式创建模块骨架和测试基础设施

---

### Task 8: WalkingProduct Implementation

**Files:**
- Create: `saas-backend/carbon-walking/src/main/java/com/carbonpoint/walking/entity/StepDailyRecordEntity.java`
- Create: `saas-backend/carbon-walking/src/main/java/com/carbonpoint/walking/mapper/StepDailyRecordMapper.java`
- Create: `saas-backend/carbon-walking/src/main/java/com/carbonpoint/walking/product/WalkingProduct.java`
- Create: `saas-backend/carbon-walking/src/main/java/com/carbonpoint/walking/rule/{WalkingRuleContext,ThresholdFilterRule,FormulaCalcRule}.java`
- Create: `saas-backend/carbon-walking/src/main/java/com/carbonpoint/walking/feature/{StepCalcConfigFeature,FunEquivalenceFeature}.java`
- Create: `saas-backend/carbon-walking/src/main/java/com/carbonpoint/walking/client/{HealthApiClient,StubHealthApiClient}.java`
- Create: `saas-backend/carbon-walking/src/main/java/com/carbonpoint/walking/dto/{WalkingClaimRequestDTO,WalkingClaimResponseDTO,WalkingTodayDTO,WalkingRecordDTO}.java`
- Create: `saas-backend/carbon-walking/src/main/java/com/carbonpoint/walking/service/WalkingService.java`
- Create: `saas-backend/carbon-walking/src/main/java/com/carbonpoint/walking/controller/WalkingController.java`

- [ ] **Step 1:** 创建 StepDailyRecordEntity 和 mapper（含 H2 test schema DDL）

- [ ] **Step 2:** 创建 WalkingProduct 定义:
```java
@Component
public class WalkingProduct {
    public static final String CODE = "walking";
    public static final String TRIGGER_TYPE = "sensor_data";
    // ruleChain: [threshold_filter, formula_calc]
    // features: [step_calc_config(required), fun_equivalence(optional), points_exchange(required)]
}
```

- [ ] **Step 3:** 创建走路专用规则节点:
  - `ThresholdFilterRule`: 步数 < 阈值则归零
  - `FormulaCalcRule`: `floor(steps × coefficient)`

- [ ] **Step 4:** 创建功能点:
  - `StepCalcConfigFeature`: 管理 threshold/coefficient 配置
  - `FunEquivalenceFeature`: 趣味等价物计算（`calculate(8232, "相当于 {steps/200} 根香蕉")` → `"相当于 41 根香蕉"`）

- [ ] **Step 5:** 创建 Health API client stub:
```java
public interface HealthApiClient {
    Integer fetchTodaySteps(Long userId, String source);
}
// StubHealthApiClient 返回固定值用于开发测试
```

- [ ] **Step 6:** 创建 DTO（ClaimRequest, ClaimResponse, TodayDTO, RecordDTO）

- [ ] **Step 7:** 创建 WalkingService — 核心领取流程:
  1. 检查重复（DB unique index user_id + date）
  2. 获取步数（healthApiClient）
  3. 执行规则链（ThresholdFilter → FormulaCalc）
  4. 保存 step_daily_records
  5. 发放积分
  6. 构建响应含趣味等价物

- [ ] **Step 8:** 创建 WalkingController:
```java
@RestController
@RequestMapping("/api/walking")
public class WalkingController {
    @PostMapping("/claim")   // 领取积分
    @GetMapping("/today")    // 今日状态
    @GetMapping("/records")  // 历史记录
}
```

- [ ] **Step 9:** 写集成测试（claimSuccess, claimAlreadyDone, claimBelowThreshold, claimNoStepData）

- [ ] **Step 10:** 更新 carbon-app pom.xml 添加 carbon-walking 依赖

- [ ] **Step 11:** 全量回归测试:
```bash
cd saas-backend && ./mvnw test
```

---

## Chunk 3: Shared Services Enhancement + Frontend

### Part A: Backend

### Task 9: PointsEventBus

**Files:**
- Create: `saas-backend/carbon-points/src/main/java/com/carbonpoint/points/dto/PointsEvent.java`
- Create: `saas-backend/carbon-points/src/main/java/com/carbonpoint/points/service/PointsEventBus.java`
- Create: `saas-backend/carbon-points/src/main/java/com/carbonpoint/points/service/PointsEventHandler.java`
- Modify: `saas-backend/carbon-points/src/main/java/com/carbonpoint/points/service/PointAccountService.java`
- Modify: `saas-backend/carbon-points/src/main/java/com/carbonpoint/points/service/PointEngineService.java`

- [ ] **Step 1:** 创建 PointsEvent record:
```java
public record PointsEvent(
    Long tenantId, Long userId,
    String productCode,    // "stair_climbing" / "walking"
    String sourceType,     // "check_in" / "step_claim" / "streak_bonus"
    int points, String bizId, String remark
) {}
```

- [ ] **Step 2:** 创建 PointsEventBus（同步 Spring bean，委托给 PointsEventHandler）

- [ ] **Step 3:** 创建 PointsEventHandler：更新积分账户 → 记录流水（含 product_code）→ 检查等级

- [ ] **Step 4:** 在 PointAccountService 添加 `awardPointsFromEvent(PointsEvent)` 方法

- [ ] **Step 5:** 迁移 PointEngineService 中的 streak bonus 调用为 `pointsEventBus.publish()`

- [ ] **Step 6:** 写测试（正常发放、零积分忽略、用户不存在异常）

---

### Task 10: Point Transaction Schema Update

**Files:**
- Create: `saas-backend/carbon-app/src/main/resources/db/migration/V19__add_product_columns.sql`
- Modify: `saas-backend/carbon-common/.../PointTransactionEntity.java` (add productCode, sourceType)
- Modify: `saas-backend/carbon-points/.../PointTransactionDTO.java`
- Modify: `saas-backend/carbon-points/.../PointsController.java` (add productCode filter)

- [ ] **Step 1:** 创建 Flyway 迁移:
```sql
ALTER TABLE point_transactions ADD COLUMN product_code VARCHAR(64), ADD COLUMN source_type VARCHAR(64);
-- Backfill existing records
UPDATE point_transactions SET product_code = 'check_in' WHERE type IN ('check_in', 'streak_bonus');
CREATE INDEX idx_pt_product_code ON point_transactions(tenant_id, product_code);
```

- [ ] **Step 2:** 更新 Entity 添加 `productCode`, `sourceType` 字段

- [ ] **Step 3:** 更新 DTO 和 Controller 支持按产品过滤

---

### Task 11: Report Enhancement

**Files:**
- Create: `saas-backend/carbon-report/src/main/java/com/carbonpoint/report/dto/{ProductPointStatsDTO,CrossProductOverviewDTO}.java`
- Modify: `saas-backend/carbon-report/.../ReportService.java`
- Modify: `saas-backend/carbon-report/.../ReportController.java`

- [ ] **Step 1:** 创建按产品统计的 DTO

- [ ] **Step 2:** 在 ReportService 添加 `getProductStats(tenantId, start, end)` 和 `getCrossProductOverview(tenantId, start, end)`

- [ ] **Step 3:** 添加 Controller 端点:
  - `GET /api/reports/product-stats` — 按产品维度统计
  - `GET /api/reports/product-overview` — 跨产品总览（饼图数据）

---

### Task 12: Package-Product API

**Files:**
- Modify: `saas-backend/carbon-system/.../PackageService.java` (add getTenantProducts)
- Create: `saas-backend/carbon-system/.../dto/res/TenantProductRes.java`
- Modify: `saas-backend/carbon-system/.../TenantPackageController.java` (add /products endpoint)

- [ ] **Step 1:** 添加 `GET /tenant/products` 端点，返回企业启用的产品列表（基于套餐推导）

- [ ] **Step 2:** 更新 `TenantDetailRes` 添加 `enabledProducts` 字段

---

### Part B: Frontend

### Task 13: Platform Frontend — Product Management Enhancement

**Files:**
- Modify: `saas-frontend/platform-frontend/src/pages/ProductManagement.tsx`
- Create: `saas-frontend/platform-frontend/src/pages/ProductDetailDrawer.tsx`
- Modify: `saas-frontend/platform-frontend/src/pages/PackageManagement.tsx`
- Modify: `saas-frontend/platform-frontend/src/pages/EnterpriseManagement.tsx`
- Modify: `saas-frontend/platform-frontend/src/api/platform.ts`

- [ ] **Step 1:** ProductManagement 页面添加"触发类型"列，使用 Tag 组件显示（爬楼打卡=blue, 走路计步=green）

- [ ] **Step 2:** 创建 ProductDetailDrawer 展示产品详情（基本信息 + 功能点列表 + 关联套餐）

- [ ] **Step 3:** PackageManagement 增强——产品选择 checkbox + 每个产品的功能点 toggle

- [ ] **Step 4:** EnterpriseManagement 企业详情添加已启用产品展示（Tag chips）

- [ ] **Step 5:** 添加 `getTenantProducts(tenantId)` API 函数

---

### Task 14: Enterprise Frontend — Dynamic Product Menus

**Files:**
- Create: `saas-frontend/enterprise-frontend/src/api/products.ts`
- Create: `saas-frontend/enterprise-frontend/src/store/productStore.ts`
- Modify: `saas-frontend/enterprise-frontend/src/App.tsx`
- Create: `saas-frontend/enterprise-frontend/src/pages/walking/{WalkingManagement,StepCalcConfig,FunEquivalenceConfig}.tsx`
- Modify: `saas-frontend/enterprise-frontend/src/pages/Reports.tsx`

- [ ] **Step 1:** 创建 tenant products API 和 Zustand store:
```typescript
export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  productCodes: new Set(),
  fetchProducts: async () => { /* GET /tenant/products */ },
  isProductEnabled: (code) => get().productCodes.has(code),
}));
```

- [ ] **Step 2:** 在 App.tsx 添加 walking 路由和权限映射

- [ ] **Step 3:** 动态菜单——根据 `productStore.isProductEnabled()` 显示/隐藏产品菜单

- [ ] **Step 4:** 创建走路管理页面:
  - `WalkingManagement`: Tabs 容器（步数配置 | 趣味等价配置）
  - `StepCalcConfig`: 阈值、系数、每日上限表单
  - `FunEquivalenceConfig`: 等价物列表（Form.List，支持增删）

- [ ] **Step 5:** 更新 Reports 页面——添加产品积分分布饼图和按产品明细表格

---

### Task 15: H5 Frontend — Walking UI

**Files:**
- Create: `saas-frontend/h5/src/api/walking.ts`
- Create: `saas-frontend/h5/src/pages/WalkingPage.tsx`
- Create: `saas-frontend/h5/src/pages/WalkingHistoryPage.tsx`
- Modify: `saas-frontend/h5/src/App.tsx`
- Modify: `saas-frontend/h5/src/pages/HomePage.tsx`
- Modify: 所有含 TabBar 的 H5 页面（添加 walking tab）

- [ ] **Step 1:** 创建 walking API 模块（getWalkingStatus, claimWalkingPoints, getWalkingHistory）

- [ ] **Step 2:** 创建 WalkingPage:
  - 今日步数展示（大字体 + 进度条）
  - 积分领取按钮（达标可领取 / 未达标提示剩余步数 / 已领取状态）
  - 趣味等价物展示卡片
  - 历史记录链接

- [ ] **Step 3:** 创建 WalkingHistoryPage（步数历史列表）

- [ ] **Step 4:** 在 App.tsx 添加 walking 路由

- [ ] **Step 5:** 在 HomePage 添加走路快捷入口

- [ ] **Step 6:** 更新所有 TabBar 添加 walking tab

---

## Implementation Sequencing

```
Task 1  (DB migration)           ──→  Task 2-4  (carbon-platform)
                                      │
                                      ├──→ Task 5-6  (carbon-stair)    ──┐
                                      │                                  ├──→ Task 9  (PointsEventBus)
                                      ├──→ Task 7-8  (carbon-walking)  ──┘
                                                                         │
Task 10 (Schema update)  ──────────────────────────────────────────────→ │
                                                                         ├──→ Task 11-12 (Report + API)
                                                                         │
                                                                         ├──→ Task 13 (Platform frontend)
                                                                         ├──→ Task 14 (Enterprise frontend)  ← depends Task 12
                                                                         └──→ Task 15 (H5 frontend)          ← depends Task 8
```

**可并行的任务组：**
- Task 5-6 (stair) 和 Task 7-8 (walking) 可并行
- Task 13 (platform frontend) 可与 Task 11-12 (backend) 并行
- Task 14, 15 需等待后端 API 就绪

## Risk Considerations

- **向后兼容**: `product_code` 和 `source_type` 为 nullable，现有代码无需修改即可继续运行
- **API 兼容**: 碳楼打卡 API 路径 `/api/checkin` 不变，前端无需修改
- **迁移安全**: ALTER TABLE 添加 nullable 列，无锁表风险
- **EventBus 同步**: 同步设计保持事务边界简单，后续可改异步无需修改调用方
- **前端条件菜单**: 企业前端需优雅处理产品列表为空的情况（旧租户无产品关联）

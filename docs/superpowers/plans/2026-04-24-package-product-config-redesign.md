# Package-Product Config Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the product/rule configuration model so that platform products define rule templates and basic config, which sync immediately to all tenant point_rules. Tenants can only toggle rules on/off.

**Architecture:** Hybrid storage — JSON `basic_config` on `platform_products` for fixed parameters, new `product_rule_templates` table for CRUD-heavy rule templates. Sync mechanism upserts tenant `point_rules` preserving tenant's `enabled` toggle state.

**Tech Stack:** Spring Boot 3.x / MyBatis-Plus / Flyway / React 18 / TypeScript / Ant Design 5 / @tanstack/react-query

**Spec:** `docs/superpowers/specs/2026-04-24-package-product-config-redesign-design.md`

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `saas-backend/carbon-app/src/main/resources/db/migration/V10__product_rule_templates.sql` | DDL: new table + column additions |
| `saas-backend/carbon-system/.../entity/ProductRuleTemplateEntity.java` | Entity for `product_rule_templates` |
| `saas-backend/carbon-system/.../mapper/ProductRuleTemplateMapper.java` | Mapper with product-scoped queries |
| `saas-backend/carbon-system/.../dto/res/RuleTemplateRes.java` | Response DTO |
| `saas-backend/carbon-system/.../dto/req/RuleTemplateCreateReq.java` | Create request DTO |
| `saas-backend/carbon-system/.../dto/req/RuleTemplateUpdateReq.java` | Update request DTO |
| `saas-backend/carbon-system/.../dto/req/BasicConfigUpdateReq.java` | Basic config update DTO |
| `saas-backend/carbon-system/.../service/ProductRuleTemplateService.java` | Service interface |
| `saas-backend/carbon-system/.../service/impl/ProductRuleTemplateServiceImpl.java` | CRUD + sync logic |
| `saas-frontend/platform-frontend/src/pages/ProductConfig.tsx` | 4-tab product config page |
| `saas-frontend/enterprise-frontend/src/pages/ProductConfig.tsx` | Tenant product config page |

### Modified files

| File | Change |
|------|--------|
| `saas-backend/carbon-system/.../entity/ProductEntity.java` | Add `basicConfig` field |
| `saas-backend/carbon-system/.../dto/res/ProductRes.java` | Add `basicConfig` field |
| `saas-backend/carbon-points/.../entity/PointRule.java` | Add `sourceTemplateId`, `productCode` fields |
| `saas-backend/carbon-system/.../service/ProductService.java` | Add `getBasicConfig`, `updateBasicConfig` |
| `saas-backend/carbon-system/.../service/impl/ProductServiceImpl.java` | Implement basic config methods |
| `saas-backend/carbon-system/.../controller/ProductController.java` | Add 6 new endpoints |
| `saas-backend/carbon-system/.../mapper/TenantMapper.java` | Add `selectIdsByPackageId` |
| `saas-backend/carbon-system/.../service/impl/PackageServiceImpl.java` | Add sync on product addition + package change |
| `saas-backend/carbon-points/.../service/PointRuleService.java` | Add `syncFromTemplate`, `removeByProduct` |
| `saas-frontend/platform-frontend/src/api/platform.ts` | Add interfaces + 6 API functions |
| `saas-frontend/platform-frontend/src/pages/ProductManagement.tsx` | Simplify actions to navigate to config page |
| `saas-frontend/platform-frontend/src/App.tsx` | Add route `/products/:id/config` |
| `saas-frontend/platform-frontend/src/pages/PlatformConfig.tsx` | Remove rule templates tab |
| `saas-frontend/enterprise-frontend/src/api/tenantProducts.ts` | Add 3 API functions |
| `saas-frontend/enterprise-frontend/src/App.tsx` | Add route + menu item |

### Cross-module dependency note

`ProductRuleTemplateServiceImpl` (carbon-system) needs to write to `point_rules` (carbon-points). Options:
- **Option A (simpler):** Add carbon-points as a dependency of carbon-system. Check if POM already has this.
- **Option B (cleaner):** Use Spring `ApplicationEventPublisher` — carbon-system publishes `ProductRuleSyncEvent`, carbon-points listens and performs the upsert.

The plan uses Option A (direct dependency) for MVP. If circular dependency is detected, switch to Option B (events).

---

## Chunk 1: Database Migration + Entity/Mapper/DTO

### Task 1: Flyway migration V10

**File:** `saas-backend/carbon-app/src/main/resources/db/migration/V10__product_rule_templates.sql`

- [ ] **Step 1: Write migration file**

```sql
-- V10: product_rule_templates table + point_rules tracking columns + basic_config

-- 1. Add columns to existing tables
ALTER TABLE point_rules
    ADD COLUMN source_template_id VARCHAR(36) DEFAULT NULL;

ALTER TABLE point_rules
    ADD COLUMN product_code VARCHAR(50) DEFAULT NULL;

ALTER TABLE platform_products
    ADD COLUMN basic_config JSON DEFAULT NULL;

-- 2. Create product_rule_templates table
CREATE TABLE product_rule_templates (
    id          VARCHAR(36)  NOT NULL,
    product_id  VARCHAR(36)  NOT NULL,
    rule_type   VARCHAR(50)  NOT NULL,
    name        VARCHAR(100) NOT NULL,
    config      JSON         NOT NULL,
    enabled     TINYINT      NOT NULL DEFAULT 1,
    sort_order  INT          NOT NULL DEFAULT 0,
    description VARCHAR(500) DEFAULT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_prt_product_id (product_id),
    INDEX idx_prt_rule_type (rule_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Seed stair_climbing templates
INSERT INTO product_rule_templates (id, product_id, rule_type, name, config, enabled, sort_order, description) VALUES
('tpl-stair-ts-morning', (SELECT id FROM platform_products WHERE code = 'stair_climbing'),
 'time_slot', '{"name":"早间通勤","startTime":"07:00","endTime":"09:00","minPoints":5,"maxPoints":15}',
 1, 1, '早间爬楼梯 07:00-09:00 基础积分10');

INSERT INTO product_rule_templates (id, product_id, rule_type, name, config, enabled, sort_order, description) VALUES
('tpl-stair-ts-afternoon', (SELECT id FROM platform_products WHERE code = 'stair_climbing'),
 'time_slot', '{"name":"午间午后","startTime":"11:30","endTime":"13:30","minPoints":4,"maxPoints":12}',
 1, 2, '午间爬楼梯 11:30-13:30 基础积分8');

INSERT INTO product_rule_templates (id, product_id, rule_type, name, config, enabled, sort_order, description) VALUES
('tpl-stair-streak', (SELECT id FROM platform_products WHERE code = 'stair_climbing'),
 'streak', '{"days":3,"bonusPoints":5}',
 1, 3, '连续打卡3天起奖，每日额外5积分');

INSERT INTO product_rule_templates (id, product_id, rule_type, name, config, enabled, sort_order, description) VALUES
('tpl-stair-daily-cap', (SELECT id FROM platform_products WHERE code = 'stair_climbing'),
 'daily_cap', '{"dailyLimit":100}',
 1, 4, '每日积分上限100');

INSERT INTO product_rule_templates (id, product_id, rule_type, name, config, enabled, sort_order, description) VALUES
('tpl-stair-level-coeff', (SELECT id FROM platform_products WHERE code = 'stair_climbing'),
 'level_coefficient', '{"levels":{"Lv.1":1.0,"Lv.2":1.1,"Lv.3":1.2,"Lv.4":1.3,"Lv.5":1.5}}',
 1, 5, '等级系数加成');

-- 4. Seed walking templates
INSERT INTO product_rule_templates (id, product_id, rule_type, name, config, enabled, sort_order, description) VALUES
('tpl-walking-daily-cap', (SELECT id FROM platform_products WHERE code = 'walking'),
 'daily_cap', '{"dailyLimit":60}',
 1, 1, '步行每日积分上限60');

INSERT INTO product_rule_templates (id, product_id, rule_type, name, config, enabled, sort_order, description) VALUES
('tpl-walking-level-coeff', (SELECT id FROM platform_products WHERE code = 'walking'),
 'level_coefficient', '{"levels":{"Lv.1":1.0,"Lv.2":1.05,"Lv.3":1.1,"Lv.4":1.2,"Lv.5":1.3}}',
 1, 2, '步行等级系数');
```

- [ ] **Step 2: Verify file placement**

```bash
ls -la saas-backend/carbon-app/src/main/resources/db/migration/V1*
```

- [ ] **Step 3: Commit**

```bash
git add saas-backend/carbon-app/src/main/resources/db/migration/V10__product_rule_templates.sql
git commit -m "feat: add V10 migration for product_rule_templates and schema changes"
```

---

### Task 2: ProductRuleTemplateEntity

**File:** `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/entity/ProductRuleTemplateEntity.java`

- [ ] **Step 1: Write entity**

```java
package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("product_rule_templates")
@InterceptorIgnore
public class ProductRuleTemplateEntity {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String productId;

    private String ruleType;

    private String name;

    /** JSON configuration for this rule template */
    private String config;

    private Integer enabled;

    private Integer sortOrder;

    private String description;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
```

- [ ] **Step 2: Commit**

```bash
git add saas-backend/carbon-system/src/main/java/com/carbonpoint/system/entity/ProductRuleTemplateEntity.java
git commit -m "feat: add ProductRuleTemplateEntity"
```

---

### Task 3: ProductRuleTemplateMapper

**File:** `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/mapper/ProductRuleTemplateMapper.java`

- [ ] **Step 1: Write mapper**

```java
package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.entity.ProductRuleTemplateEntity;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
@InterceptorIgnore
public interface ProductRuleTemplateMapper extends BaseMapper<ProductRuleTemplateEntity> {

    @Select("SELECT * FROM product_rule_templates WHERE product_id = #{productId} ORDER BY sort_order ASC")
    List<ProductRuleTemplateEntity> selectByProductId(@Param("productId") String productId);

    @Select("SELECT * FROM product_rule_templates WHERE product_id = #{productId} AND rule_type = #{ruleType} ORDER BY sort_order ASC")
    List<ProductRuleTemplateEntity> selectByProductIdAndRuleType(@Param("productId") String productId,
                                                                  @Param("ruleType") String ruleType);

    @Delete("DELETE FROM product_rule_templates WHERE product_id = #{productId}")
    int deleteByProductId(@Param("productId") String productId);
}
```

- [ ] **Step 2: Commit**

```bash
git add saas-backend/carbon-system/src/main/java/com/carbonpoint/system/mapper/ProductRuleTemplateMapper.java
git commit -m "feat: add ProductRuleTemplateMapper"
```

---

### Task 4: DTOs

**Files:**
- `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/dto/res/RuleTemplateRes.java`
- `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/dto/req/RuleTemplateCreateReq.java`
- `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/dto/req/RuleTemplateUpdateReq.java`
- `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/dto/req/BasicConfigUpdateReq.java`

- [ ] **Step 1: Write RuleTemplateRes**

```java
package com.carbonpoint.system.dto.res;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class RuleTemplateRes {
    private String id;
    private String productId;
    private String ruleType;
    private String name;
    private String config;
    private Integer enabled;
    private Integer sortOrder;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

- [ ] **Step 2: Write RuleTemplateCreateReq**

```java
package com.carbonpoint.system.dto.req;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RuleTemplateCreateReq {
    @NotBlank(message = "规则类型不能为空")
    private String ruleType;
    @NotBlank(message = "名称不能为空")
    private String name;
    @NotBlank(message = "配置不能为空")
    private String config;
    private Boolean enabled = true;
    private Integer sortOrder = 0;
    private String description;
}
```

- [ ] **Step 3: Write RuleTemplateUpdateReq**

```java
package com.carbonpoint.system.dto.req;

import lombok.Data;

@Data
public class RuleTemplateUpdateReq {
    private String name;
    private String config;
    private Boolean enabled;
    private Integer sortOrder;
    private String description;
}
```

- [ ] **Step 4: Write BasicConfigUpdateReq**

```java
package com.carbonpoint.system.dto.req;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BasicConfigUpdateReq {
    @NotBlank(message = "basicConfig不能为空")
    private String basicConfig;
}
```

- [ ] **Step 5: Commit all DTOs**

```bash
git add saas-backend/carbon-system/src/main/java/com/carbonpoint/system/dto/res/RuleTemplateRes.java \
       saas-backend/carbon-system/src/main/java/com/carbonpoint/system/dto/req/RuleTemplateCreateReq.java \
       saas-backend/carbon-system/src/main/java/com/carbonpoint/system/dto/req/RuleTemplateUpdateReq.java \
       saas-backend/carbon-system/src/main/java/com/carbonpoint/system/dto/req/BasicConfigUpdateReq.java
git commit -m "feat: add DTOs for rule template CRUD and basic config"
```

---

### Task 5: Modify ProductEntity

**File:** `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/entity/ProductEntity.java`

- [ ] **Step 1: Add `basicConfig` field after `defaultConfig`**

```java
private String basicConfig;
```

- [ ] **Step 2: Commit**

```bash
git add saas-backend/carbon-system/src/main/java/com/carbonpoint/system/entity/ProductEntity.java
git commit -m "feat: add basicConfig field to ProductEntity"
```

---

### Task 6: Modify ProductRes

**File:** `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/dto/res/ProductRes.java`

- [ ] **Step 1: Add `basicConfig` field**

```java
private String basicConfig;
```

- [ ] **Step 2: Commit**

```bash
git add saas-backend/carbon-system/src/main/java/com/carbonpoint/system/dto/res/ProductRes.java
git commit -m "feat: add basicConfig to ProductRes"
```

---

### Task 7: Modify PointRule entity

**File:** `saas-backend/carbon-points/src/main/java/com/carbonpoint/points/entity/PointRule.java`

- [ ] **Step 1: Add two fields before `createdAt`**

```java
private String sourceTemplateId;
private String productCode;
```

- [ ] **Step 2: Commit**

```bash
git add saas-backend/carbon-points/src/main/java/com/carbonpoint/points/entity/PointRule.java
git commit -m "feat: add sourceTemplateId and productCode to PointRule"
```

---

### Chunk 1 Verification

- [ ] **Build**

```bash
cd saas-backend && ./mvnw clean package -Dmaven.test.skip=true -q ; echo "EXIT_CODE=$?"
```

---

## Chunk 2: Backend Service + Controller + Sync Logic

### Task 8: TenantMapper — add selectIdsByPackageId

**File:** `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/mapper/TenantMapper.java`

- [ ] **Step 1: Add method**

```java
@InterceptorIgnore
@Select("SELECT id FROM tenants WHERE package_id = #{packageId}")
List<Long> selectIdsByPackageId(@Param("packageId") Long packageId);
```

Ensure `import org.apache.ibatis.annotations.Param;` is present.

- [ ] **Step 2: Commit**

```bash
git add saas-backend/carbon-system/src/main/java/com/carbonpoint/system/mapper/TenantMapper.java
git commit -m "feat: add selectIdsByPackageId to TenantMapper"
```

---

### Task 9: PointRuleService — add sync helper methods

**File:** `saas-backend/carbon-points/src/main/java/com/carbonpoint/points/service/PointRuleService.java`

- [ ] **Step 1: Add these methods**

```java
/**
 * Upsert a point rule for a tenant from a template. If a rule with the same
 * sourceTemplateId already exists, update its config/name/sortOrder but preserve enabled.
 * If not, insert with enabled=true.
 */
@Transactional
public void upsertFromTemplate(Long tenantId, String sourceTemplateId, String productCode,
                                String ruleType, String name, String config, Integer sortOrder) {
    LambdaQueryWrapper<PointRule> wrapper = new LambdaQueryWrapper<>();
    wrapper.eq(PointRule::getTenantId, tenantId)
           .eq(PointRule::getSourceTemplateId, sourceTemplateId);
    PointRule existing = pointRuleMapper.selectOne(wrapper);

    if (existing != null) {
        existing.setName(name);
        existing.setConfig(config);
        existing.setSortOrder(sortOrder);
        existing.setUpdatedAt(LocalDateTime.now());
        pointRuleMapper.updateById(existing);
    } else {
        PointRule rule = new PointRule();
        rule.setTenantId(tenantId);
        rule.setType(ruleType);
        rule.setName(name);
        rule.setConfig(config);
        rule.setEnabled(true);
        rule.setSortOrder(sortOrder);
        rule.setSourceTemplateId(sourceTemplateId);
        rule.setProductCode(productCode);
        rule.setCreatedAt(LocalDateTime.now());
        rule.setUpdatedAt(LocalDateTime.now());
        pointRuleMapper.insert(rule);
    }
}

/** Delete all point_rules that originated from a specific template. */
@Transactional
public void deleteBySourceTemplateId(String sourceTemplateId) {
    pointRuleMapper.delete(new LambdaQueryWrapper<PointRule>()
            .eq(PointRule::getSourceTemplateId, sourceTemplateId));
}

/** Get all point_rules for a tenant filtered by productCode. */
public List<PointRule> listByTenantAndProduct(Long tenantId, String productCode) {
    LambdaQueryWrapper<PointRule> wrapper = new LambdaQueryWrapper<>();
    wrapper.eq(PointRule::getTenantId, tenantId)
           .eq(PointRule::getProductCode, productCode)
           .orderByAsc(PointRule::getSortOrder);
    return pointRuleMapper.selectList(wrapper);
}
```

Also add `import java.time.LocalDateTime;` if not already present.

- [ ] **Step 2: Commit**

```bash
git add saas-backend/carbon-points/src/main/java/com/carbonpoint/points/service/PointRuleService.java
git commit -m "feat: add sync helper methods to PointRuleService"
```

---

### Task 10: ProductRuleTemplateService

**File:** `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/service/ProductRuleTemplateService.java`

- [ ] **Step 1: Write interface**

```java
package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.req.RuleTemplateCreateReq;
import com.carbonpoint.system.dto.req.RuleTemplateUpdateReq;
import com.carbonpoint.system.dto.res.RuleTemplateRes;

import java.util.List;

public interface ProductRuleTemplateService {
    List<RuleTemplateRes> listByProduct(String productId);
    RuleTemplateRes create(String productId, RuleTemplateCreateReq req);
    RuleTemplateRes update(String templateId, RuleTemplateUpdateReq req);
    void delete(String templateId);
    void syncToTenants(String productId);
}
```

- [ ] **Step 2: Commit**

```bash
git add saas-backend/carbon-system/src/main/java/com/carbonpoint/system/service/ProductRuleTemplateService.java
git commit -m "feat: add ProductRuleTemplateService interface"
```

---

### Task 11: ProductRuleTemplateServiceImpl

**File:** `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/service/impl/ProductRuleTemplateServiceImpl.java`

**Cross-module dependency:** This service needs `PointRuleService` from carbon-points. Ensure `carbon-system/pom.xml` has a dependency on `carbon-points`. If this creates a circular dependency, switch to Spring events.

- [ ] **Step 1: Write implementation**

```java
package com.carbonpoint.system.service.impl;

import com.carbonpoint.points.entity.PointRule;
import com.carbonpoint.points.service.PointRuleService;
import com.carbonpoint.system.dto.req.RuleTemplateCreateReq;
import com.carbonpoint.system.dto.req.RuleTemplateUpdateReq;
import com.carbonpoint.system.dto.res.RuleTemplateRes;
import com.carbonpoint.system.entity.ProductRuleTemplateEntity;
import com.carbonpoint.system.mapper.PackageProductMapper;
import com.carbonpoint.system.mapper.ProductRuleTemplateMapper;
import com.carbonpoint.system.mapper.TenantMapper;
import com.carbonpoint.system.service.ProductRuleTemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductRuleTemplateServiceImpl implements ProductRuleTemplateService {

    private final ProductRuleTemplateMapper templateMapper;
    private final PackageProductMapper packageProductMapper;
    private final TenantMapper tenantMapper;
    private final PointRuleService pointRuleService;

    @Override
    public List<RuleTemplateRes> listByProduct(String productId) {
        return templateMapper.selectByProductId(productId).stream()
                .map(this::toRes).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public RuleTemplateRes create(String productId, RuleTemplateCreateReq req) {
        ProductRuleTemplateEntity entity = new ProductRuleTemplateEntity();
        entity.setProductId(productId);
        entity.setRuleType(req.getRuleType());
        entity.setName(req.getName());
        entity.setConfig(req.getConfig());
        entity.setEnabled(req.getEnabled() ? 1 : 0);
        entity.setSortOrder(req.getSortOrder());
        entity.setDescription(req.getDescription());
        templateMapper.insert(entity);
        return toRes(entity);
    }

    @Override
    @Transactional
    public RuleTemplateRes update(String templateId, RuleTemplateUpdateReq req) {
        ProductRuleTemplateEntity entity = templateMapper.selectById(templateId);
        if (entity == null) throw new IllegalArgumentException("规则模板不存在: " + templateId);
        if (req.getName() != null) entity.setName(req.getName());
        if (req.getConfig() != null) entity.setConfig(req.getConfig());
        if (req.getEnabled() != null) entity.setEnabled(req.getEnabled() ? 1 : 0);
        if (req.getSortOrder() != null) entity.setSortOrder(req.getSortOrder());
        if (req.getDescription() != null) entity.setDescription(req.getDescription());
        templateMapper.updateById(entity);
        return toRes(entity);
    }

    @Override
    @Transactional
    public void delete(String templateId) {
        ProductRuleTemplateEntity entity = templateMapper.selectById(templateId);
        if (entity == null) return;
        // Delete synced point_rules that originated from this template
        pointRuleService.deleteBySourceTemplateId(templateId);
        templateMapper.deleteById(templateId);
    }

    @Override
    @Transactional
    public void syncToTenants(String productId) {
        List<ProductRuleTemplateEntity> templates = templateMapper.selectByProductId(productId);
        if (templates.isEmpty()) return;

        // 1. Find all package IDs containing this product
        List<Long> packageIds = packageProductMapper.selectPackageIdsByProductId(productId);
        if (packageIds.isEmpty()) return;

        // 2. Find all tenant IDs with those packages
        List<Long> tenantIds = packageIds.stream()
                .flatMap(pkgId -> tenantMapper.selectIdsByPackageId(pkgId).stream())
                .distinct().toList();
        if (tenantIds.isEmpty()) return;

        // 3. Resolve product code from productId (for productCode field on point_rules)
        String productCode = resolveProductCode(productId);

        // 4. Upsert rules for each tenant
        for (Long tenantId : tenantIds) {
            for (ProductRuleTemplateEntity tmpl : templates) {
                pointRuleService.upsertFromTemplate(
                        tenantId, tmpl.getId(), productCode,
                        tmpl.getRuleType(), tmpl.getName(), tmpl.getConfig(), tmpl.getSortOrder());
            }
        }
        log.info("Synced {} templates for product {} to {} tenants", templates.size(), productId, tenantIds.size());
    }

    private String resolveProductCode(String productId) {
        // Query product code from ProductMapper
        // For simplicity, use productId as fallback — the code should be resolved from the product entity
        try {
            com.carbonpoint.system.entity.ProductEntity product =
                    ((com.carbonpoint.system.mapper.ProductMapper)
                            org.springframework.context.ApplicationContextProvider
                                    .getApplicationContext()
                                    .getBean("productMapper"))
                            .selectById(productId);
            return product != null ? product.getCode() : productId;
        } catch (Exception e) {
            return productId;
        }
    }

    private RuleTemplateRes toRes(ProductRuleTemplateEntity entity) {
        RuleTemplateRes res = new RuleTemplateRes();
        res.setId(entity.getId());
        res.setProductId(entity.getProductId());
        res.setRuleType(entity.getRuleType());
        res.setName(entity.getName());
        res.setConfig(entity.getConfig());
        res.setEnabled(entity.getEnabled());
        res.setSortOrder(entity.getSortOrder());
        res.setDescription(entity.getDescription());
        res.setCreatedAt(entity.getCreatedAt());
        res.setUpdatedAt(entity.getUpdatedAt());
        return res;
    }
}
```

**Note on `resolveProductCode`:** The hacky reflection above should be replaced with a direct `ProductMapper` injection. Add `private final ProductMapper productMapper;` to the constructor-injected fields and use `productMapper.selectById(productId).getCode()`.

- [ ] **Step 2: Fix resolveProductCode — inject ProductMapper**

Add `private final ProductMapper productMapper;` field, then replace `resolveProductCode`:

```java
private String resolveProductCode(String productId) {
    com.carbonpoint.system.entity.ProductEntity product = productMapper.selectById(productId);
    return product != null ? product.getCode() : productId;
}
```

- [ ] **Step 3: Commit**

```bash
git add saas-backend/carbon-system/src/main/java/com/carbonpoint/system/service/impl/ProductRuleTemplateServiceImpl.java
git commit -m "feat: add ProductRuleTemplateServiceImpl with CRUD and sync logic"
```

---

### Task 12: Modify ProductService — basic config

**Files:**
- `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/service/ProductService.java`
- `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/service/impl/ProductServiceImpl.java`

- [ ] **Step 1: Add to ProductService interface**

```java
String getBasicConfig(String productId);
void updateBasicConfig(String productId, String basicConfigJson);
```

- [ ] **Step 2: Add to ProductServiceImpl**

Add field: `private final ProductRuleTemplateService ruleTemplateService;`

Add methods:

```java
@Override
public String getBasicConfig(String productId) {
    ProductEntity product = productMapper.selectById(productId);
    if (product == null) throw new IllegalArgumentException("产品不存在: " + productId);
    return product.getBasicConfig();
}

@Override
@Transactional
public void updateBasicConfig(String productId, String basicConfigJson) {
    ProductEntity product = productMapper.selectById(productId);
    if (product == null) throw new IllegalArgumentException("产品不存在: " + productId);
    product.setBasicConfig(basicConfigJson);
    productMapper.updateById(product);
    ruleTemplateService.syncToTenants(productId);
}
```

- [ ] **Step 3: Also update toDTO/mapping in getProducts to include basicConfig**

Read the existing `ProductServiceImpl` to find where `ProductRes` is built. Add `.basicConfig(entity.getBasicConfig())` to the builder or mapping.

- [ ] **Step 4: Commit**

```bash
git add saas-backend/carbon-system/src/main/java/com/carbonpoint/system/service/ProductService.java \
       saas-backend/carbon-system/src/main/java/com/carbonpoint/system/service/impl/ProductServiceImpl.java
git commit -m "feat: add basic config get/update to ProductService with sync trigger"
```

---

### Task 13: Modify ProductController — new endpoints

**File:** `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/controller/ProductController.java`

- [ ] **Step 1: Add field and imports**

```java
import com.carbonpoint.system.dto.req.BasicConfigUpdateReq;
import com.carbonpoint.system.dto.req.RuleTemplateCreateReq;
import com.carbonpoint.system.dto.req.RuleTemplateUpdateReq;
import com.carbonpoint.system.dto.res.RuleTemplateRes;
import com.carbonpoint.system.service.ProductRuleTemplateService;
import jakarta.validation.Valid;
import java.util.List;

// Add field (constructor-injected via @RequiredArgsConstructor):
private final ProductRuleTemplateService ruleTemplateService;
```

- [ ] **Step 2: Add 6 endpoints**

```java
@PlatformAdminOnly
@GetMapping("/{id}/basic-config")
public Result<String> getBasicConfig(@PathVariable String id) {
    return Result.success(productService.getBasicConfig(id));
}

@PlatformAdminOnly
@PutMapping("/{id}/basic-config")
public Result<Void> updateBasicConfig(@PathVariable String id, @RequestBody @Valid BasicConfigUpdateReq req) {
    productService.updateBasicConfig(id, req.getBasicConfig());
    return Result.success(null);
}

@PlatformAdminOnly
@GetMapping("/{id}/rule-templates")
public Result<List<RuleTemplateRes>> listRuleTemplates(@PathVariable String id) {
    return Result.success(ruleTemplateService.listByProduct(id));
}

@PlatformAdminOnly
@PostMapping("/{id}/rule-templates")
public Result<RuleTemplateRes> createRuleTemplate(@PathVariable String id, @RequestBody @Valid RuleTemplateCreateReq req) {
    RuleTemplateRes res = ruleTemplateService.create(id, req);
    ruleTemplateService.syncToTenants(id);
    return Result.success(res);
}

@PlatformAdminOnly
@PutMapping("/{id}/rule-templates/{templateId}")
public Result<RuleTemplateRes> updateRuleTemplate(@PathVariable String id, @PathVariable String templateId,
                                                   @RequestBody @Valid RuleTemplateUpdateReq req) {
    RuleTemplateRes res = ruleTemplateService.update(templateId, req);
    ruleTemplateService.syncToTenants(id);
    return Result.success(res);
}

@PlatformAdminOnly
@DeleteMapping("/{id}/rule-templates/{templateId}")
public Result<Void> deleteRuleTemplate(@PathVariable String id, @PathVariable String templateId) {
    ruleTemplateService.delete(templateId);
    return Result.success(null);
}
```

- [ ] **Step 3: Commit**

```bash
git add saas-backend/carbon-system/src/main/java/com/carbonpoint/system/controller/ProductController.java
git commit -m "feat: add basic config and rule template endpoints to ProductController"
```

---

### Task 14: Tenant rule toggle endpoint

**File:** `saas-backend/carbon-points/src/main/java/com/carbonpoint/points/controller/TenantProductRuleController.java` (NEW)

- [ ] **Step 1: Create controller**

```java
package com.carbonpoint.points.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.points.entity.PointRule;
import com.carbonpoint.points.service.PointRuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tenant/products/{productCode}/rules")
@RequiredArgsConstructor
public class TenantProductRuleController {

    private final PointRuleService pointRuleService;

    @GetMapping
    public Result<List<PointRule>> listRules(@PathVariable String productCode) {
        Long tenantId = TenantContext.getTenantId();
        return Result.success(pointRuleService.listByTenantAndProduct(tenantId, productCode));
    }

    @PutMapping("/{ruleId}/toggle")
    public Result<Void> toggleRule(@PathVariable String productCode, @PathVariable Long ruleId) {
        Long tenantId = TenantContext.getTenantId();
        PointRule rule = pointRuleService.getById(ruleId);
        if (rule == null || !rule.getTenantId().equals(tenantId)) {
            return Result.fail("规则不存在");
        }
        rule.setEnabled(!rule.getEnabled());
        pointRuleService.updateById(rule);
        return Result.success(null);
    }
}
```

**Note:** `PointRuleService.updateById` is not currently public. Either make `pointRuleMapper` accessible or add a simple `toggleEnabled(Long ruleId)` method to `PointRuleService`.

- [ ] **Step 2: Add toggleEnabled to PointRuleService if needed**

```java
@Transactional
public void toggleEnabled(Long ruleId) {
    PointRule rule = pointRuleMapper.selectById(ruleId);
    if (rule == null) throw new IllegalArgumentException("规则不存在");
    rule.setEnabled(!rule.getEnabled());
    pointRuleMapper.updateById(rule);
}
```

Then use `pointRuleService.toggleEnabled(ruleId)` in the controller instead of direct mapper access.

- [ ] **Step 3: Commit**

```bash
git add saas-backend/carbon-points/src/main/java/com/carbonpoint/points/controller/TenantProductRuleController.java \
       saas-backend/carbon-points/src/main/java/com/carbonpoint/points/service/PointRuleService.java
git commit -m "feat: add tenant product rule toggle endpoint"
```

---

### Task 15: PackageService integration — sync on package change

**File:** `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/service/impl/PackageServiceImpl.java`

- [ ] **Step 1: Add field**

```java
private final ProductRuleTemplateService ruleTemplateService;
```

- [ ] **Step 2: In `updatePackageProducts` — sync newly added products**

After the existing logic that inserts new `package_products`, find the newly added product IDs and sync:

```java
// Sync rule templates for all products in this package to all tenants on this package
List<String> productIds = req.getProducts().stream()
        .map(PackageProductUpdateReq.ProductItem::getProductId).toList();
for (String productId : productIds) {
    ruleTemplateService.syncToTenants(productId);
}
```

- [ ] **Step 3: In `changeTenantPackage` — initialize rules from new package**

After the existing logic that updates tenant.packageId, add:

```java
// Initialize rule templates from new package's products
List<String> newProductIds = packageProductMapper.selectProductIdsByPackageId(newPackageId);
for (String productId : newProductIds) {
    ruleTemplateService.syncToTenants(productId);
}
```

- [ ] **Step 4: Commit**

```bash
git add saas-backend/carbon-system/src/main/java/com/carbonpoint/system/service/impl/PackageServiceImpl.java
git commit -m "feat: integrate rule template sync into PackageService"
```

---

### Chunk 2 Verification

- [ ] **Build**

```bash
cd saas-backend && ./mvnw clean package -Dmaven.test.skip=true -q ; echo "EXIT_CODE=$?"
```

Fix any compilation errors (missing imports, cross-module dependencies).

---

## Chunk 3: Frontend — Platform Product Config + Enterprise Tenant Page

### Task 16: API layer additions (platform.ts)

**File:** `saas-frontend/platform-frontend/src/api/platform.ts`

- [ ] **Step 1: Add interfaces after existing `Product` interface**

```typescript
export interface RuleTemplate {
  id: string;
  productId: string;
  ruleType: string;
  name: string;
  config: string;
  enabled: boolean;
  sortOrder: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface BasicConfig {
  point_params: Record<string, any>;
  behavior_params: Record<string, any>;
}
```

- [ ] **Step 2: Add `basicConfig` to `Product` interface**

Add field: `basicConfig?: string;`

- [ ] **Step 3: Add 6 API functions after existing product functions**

```typescript
// Basic Config
export const getBasicConfig = async (productId: string): Promise<BasicConfig> => {
  const res = await platformApiClient.get(`/products/${productId}/basic-config`);
  return res.data;
};

export const updateBasicConfig = async (productId: string, config: BasicConfig): Promise<any> => {
  const res = await platformApiClient.put(`/products/${productId}/basic-config`, { basicConfig: JSON.stringify(config) });
  return res.data;
};

// Rule Templates
export const getRuleTemplates = async (productId: string): Promise<RuleTemplate[]> => {
  const res = await platformApiClient.get(`/products/${productId}/rule-templates`);
  return res.data;
};

export const createRuleTemplate = async (productId: string, data: Partial<RuleTemplate>): Promise<RuleTemplate> => {
  const res = await platformApiClient.post(`/products/${productId}/rule-templates`, data);
  return res.data;
};

export const updateRuleTemplate = async (productId: string, templateId: string, data: Partial<RuleTemplate>): Promise<RuleTemplate> => {
  const res = await platformApiClient.put(`/products/${productId}/rule-templates/${templateId}`, data);
  return res.data;
};

export const deleteRuleTemplate = async (productId: string, templateId: string): Promise<any> => {
  const res = await platformApiClient.delete(`/products/${productId}/rule-templates/${templateId}`);
  return res.data;
};
```

- [ ] **Step 4: Build and commit**

```bash
pnpm --filter @carbon-point/platform-frontend build
git commit -am "feat(platform-frontend): add rule template and basic config API layer"
```

---

### Task 17: ProductConfig page (NEW)

**File:** `saas-frontend/platform-frontend/src/pages/ProductConfig.tsx`

This is a 4-tab page: Basic Info / Basic Config / Rule Templates / Feature Config. Uses `useParams` to get product ID, `useNavigate` for back navigation.

The complete component code is ~400 lines. Key structure:

```
Tabs
  ├── Tab 1: Basic Info — Form with name, description, status, sortOrder
  ├── Tab 2: Basic Config — Dynamic form by triggerType (stair vs walking params)
  ├── Tab 3: Rule Templates — CRUD table + create/edit modal with JSON config
  └── Tab 4: Feature Config — Feature list with checkbox + configValue input
```

- [ ] **Step 1: Create ProductConfig.tsx** — Write the full component (see Chunk 3 agent output for complete code)

- [ ] **Step 2: Build and commit**

```bash
pnpm --filter @carbon-point/platform-frontend build
git commit -am "feat(platform-frontend): add ProductConfig page with 4-tab layout"
```

---

### Task 18: Modify ProductManagement — simplify actions

**File:** `saas-frontend/platform-frontend/src/pages/ProductManagement.tsx`

- [ ] **Step 1: Add `useNavigate`**

```typescript
import { useNavigate } from 'react-router-dom';
// Inside component:
const navigate = useNavigate();
```

- [ ] **Step 2: Change actions column** — Replace detail/config buttons with single "配置" button that navigates:

```tsx
<Button type="link" size="small" icon={<SettingOutlined />}
  onClick={() => navigate(`/products/${record.id}/config`)}>
  配置
</Button>
```

Keep: edit modal (inline name/desc edit), delete button.
Remove: detail drawer, feature config modal, success modal, wizard-related drawer code.

- [ ] **Step 3: Remove unused state/queries/JSX** for drawer, feature modal, success modal

- [ ] **Step 4: Build and commit**

```bash
pnpm --filter @carbon-point/platform-frontend build
git commit -am "refactor(platform-frontend): simplify ProductManagement, delegate config to ProductConfig page"
```

---

### Task 19: Update App.tsx routes

**File:** `saas-frontend/platform-frontend/src/App.tsx`

- [ ] **Step 1: Add import and route**

```typescript
import ProductConfig from '@/pages/ProductConfig';
```

Add route after `/features/products`:

```tsx
<Route path="/products/:id/config" element={<ProductConfig />} />
```

- [ ] **Step 2: Build and commit**

```bash
pnpm --filter @carbon-point/platform-frontend build
git commit -am "feat(platform-frontend): add /products/:id/config route"
```

---

### Task 20: Remove rule templates from PlatformConfig

**File:** `saas-frontend/platform-frontend/src/pages/PlatformConfig.tsx`

- [ ] **Step 1: Remove the "规则模板" tab** from the Tabs items array

- [ ] **Step 2: Remove associated state, handlers, and modal** (templates state, templateForm, handleSaveTemplate, template modal JSX, SlotFields component)

- [ ] **Step 3: Build and commit**

```bash
pnpm --filter @carbon-point/platform-frontend build
git commit -am "refactor(platform-frontend): remove rule templates tab from PlatformConfig"
```

---

### Task 21: Enterprise frontend — tenant product config API

**File:** `saas-frontend/enterprise-frontend/src/api/tenantProducts.ts`

- [ ] **Step 1: Add 3 API functions**

```typescript
export const getTenantProductRules = async (productCode: string) => {
  const res = await apiClient.get(`/tenant/products/${productCode}/rules`);
  return res.data;
};

export const toggleTenantProductRule = async (productCode: string, ruleId: number) => {
  const res = await apiClient.put(`/tenant/products/${productCode}/rules/${ruleId}/toggle`);
  return res.data;
};

export const getTenantBasicConfig = async (productCode: string) => {
  const res = await apiClient.get(`/tenant/products/${productCode}/basic-config`);
  return res.data;
};
```

- [ ] **Step 2: Commit**

```bash
git commit -am "feat(enterprise-frontend): add tenant product rule API functions"
```

---

### Task 22: Enterprise frontend — ProductConfig page (NEW)

**File:** `saas-frontend/enterprise-frontend/src/pages/ProductConfig.tsx`

Tenant-facing page showing product cards with read-only basic config, rule list with toggle switches, and feature config display.

Key structure:
- Fetches tenant products via `getTenantProducts()`
- For each product: shows basic config (Descriptions), rules (Switch toggles), feature config (Tags)

- [ ] **Step 1: Create ProductConfig.tsx** — Write component (see Chunk 3 agent output)

- [ ] **Step 2: Build and commit**

```bash
pnpm --filter @carbon-point/enterprise-frontend build
git commit -am "feat(enterprise-frontend): add tenant ProductConfig page with rule toggles"
```

---

### Task 23: Enterprise App.tsx — route + menu

**File:** `saas-frontend/enterprise-frontend/src/App.tsx`

- [ ] **Step 1: Add import and route**

```typescript
import ProductConfig from '@/pages/ProductConfig';
```

Add route: `<Route path="/product-config" element={<PermissionGuard><ProductConfig /></PermissionGuard>} />`

Add menu item in static fallback menu after `/products`: `{ key: '/product-config', icon: <SettingOutlined />, label: '产品配置' }`

- [ ] **Step 2: Build and commit**

```bash
pnpm --filter @carbon-point/enterprise-frontend build
git commit -am "feat(enterprise-frontend): add /product-config route and menu item"
```

---

### Chunk 3 Verification

- [ ] **Build all frontends**

```bash
pnpm --filter @carbon-point/platform-frontend build
pnpm --filter @carbon-point/enterprise-frontend build
```

---

## Summary

| Chunk | Tasks | Commits |
|-------|-------|---------|
| 1: DB + Entity/Mapper/DTO | Tasks 1-7 | ~7 commits |
| 2: Service/Controller/Sync | Tasks 8-15 | ~8 commits |
| 3: Frontend | Tasks 16-23 | ~8 commits |
| **Total** | **23 tasks** | **~23 commits** |

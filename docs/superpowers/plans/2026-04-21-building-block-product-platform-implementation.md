# 积木组件库与产品平台实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现积木组件库与产品平台，支持平台管理员通过 4 步向导配置"爬楼送积分"等产品，完善套餐-产品-功能点链路，实现动态菜单生成。

**Architecture:** 在现有代码基础上完善产品管理向导、规则链可视化编辑器、平台配置扩展、套餐管理扩展，确保 8 人团队可以并行开发。

**Tech Stack:** Spring Boot 3.x + Java 21, React 18 + TypeScript + Ant Design 5, MyBatis-Plus, MySQL, Redis

---

## 团队配置与任务分配

| 角色 | 人员 | 负责模块 |
|------|------|----------|
| 后端架构师 | A | 整体架构协调、核心接口定义 |
| 后端开发 | B | 产品管理 API、积木组件库查询 API |
| 后端开发 | C | 规则链执行器完善、动态菜单 API |
| 后端开发 | D | 套餐管理 API、企业产品配置 API |
| 前端架构师 | E | 前端架构协调、核心组件设计 |
| 前端开发 | F | 产品管理向导（4 步）、规则链可视化编辑器 |
| 前端开发 | G | 平台配置页面扩展、套餐管理页面扩展 |
| 全栈开发 | H | 前后端联调、集成测试、动态菜单完整链路 |

---

## Chunk 1: 数据模型与数据库表完善

**Files:**
- Modify: `openspec/review/ddl/carbon-point-schema.sql`
- Create: `saas-backend/carbon-system/src/main/resources/db/migration/V1__add_product_rule_chain.sql`

### Task 1.1: 完善 product_rule_chain 表 DDL

- [ ] **Step 1: 编写 product_rule_chain 表创建脚本**

```sql
-- saas-backend/carbon-system/src/main/resources/db/migration/V1__add_product_rule_chain.sql
CREATE TABLE IF NOT EXISTS product_rule_chain (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL COMMENT '产品ID',
  rule_node_name VARCHAR(64) NOT NULL COMMENT '规则节点名称',
  sort_order INT NOT NULL COMMENT '执行顺序',
  config_json TEXT COMMENT '节点参数配置（JSON）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_product_node (product_id, rule_node_name),
  INDEX idx_product_order (product_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品规则链表';
```

- [ ] **Step 2: 验证表结构与现有表的关联**

检查 products 表、product_features 表、package_products 表、product_configs 表是否已存在且结构正确。

- [ ] **Step 3: 提交 DDL 更改**

```bash
git add saas-backend/carbon-system/src/main/resources/db/migration/V1__add_product_rule_chain.sql
git commit -m "feat: add product_rule_chain table for product rule chain configuration"
```

---

## Chunk 2: 后端核心接口与 API - 产品管理

**Files:**
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/controller/ProductController.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/dto/ProductRequest.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/dto/ProductVO.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/service/ProductService.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/service/impl/ProductServiceImpl.java`
- Modify: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/entity/ProductEntity.java`

### Task 2.1: 完善 ProductEntity 实体类

- [ ] **Step 1: 读取现有 ProductEntity（如果存在）**
- [ ] **Step 2: 确保实体类包含所有必要字段**

```java
package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("products")
public class ProductEntity {
    @TableId(type = IdType.AUTO)
    private Long id;
    
    private String code;
    private String name;
    private String category;
    private String description;
    private String triggerType;
    private Integer status;
    private Integer sortOrder;
    
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
```

- [ ] **Step 3: 提交实体类更改**

### Task 2.2: 创建 ProductRequest 和 ProductVO DTO

- [ ] **Step 1: 创建 ProductRequest.java**

```java
package com.carbonpoint.system.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

@Data
public class ProductRequest {
    @NotBlank(message = "产品编码不能为空")
    private String code;
    
    @NotBlank(message = "产品名称不能为空")
    private String name;
    
    @NotBlank(message = "产品分类不能为空")
    private String category;
    
    private String description;
    
    @NotBlank(message = "触发器类型不能为空")
    private String triggerType;
    
    private Integer status = 1;
    private Integer sortOrder = 0;
    
    private List<RuleChainItem> ruleChain;
    private List<FeatureItem> features;
    
    @Data
    public static class RuleChainItem {
        private String ruleNodeName;
        private Integer sortOrder;
        private String configJson;
    }
    
    @Data
    public static class FeatureItem {
        private String featureType;
        private String name;
        private Boolean required;
        private String configSchema;
    }
}
```

- [ ] **Step 2: 创建 ProductVO.java**
- [ ] **Step 3: 提交 DTO 类**

### Task 2.3: 创建 ProductService 接口与实现

- [ ] **Step 1: 创建 ProductService.java 接口**
- [ ] **Step 2: 创建 ProductServiceImpl.java 实现**
- [ ] **Step 3: 实现产品 CRUD 逻辑**
- [ ] **Step 4: 实现规则链保存逻辑**
- [ ] **Step 5: 实现功能点保存逻辑**
- [ ] **Step 6: 提交 Service 层代码**

### Task 2.4: 创建 ProductController API 控制器

- [ ] **Step 1: 创建 ProductController.java**

```java
package com.carbonpoint.system.controller;

import com.carbonpoint.common.Result;
import com.carbonpoint.system.dto.ProductRequest;
import com.carbonpoint.system.dto.ProductVO;
import com.carbonpoint.system.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/platform/products")
@RequiredArgsConstructor
@Tag(name = "平台产品管理", description = "平台管理员产品管理接口")
public class ProductController {

    private final ProductService productService;

    @GetMapping
    @Operation(summary = "获取产品列表")
    public Result<PageResult<ProductVO>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String category) {
        return Result.success(productService.list(page, size, category));
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取产品详情")
    public Result<ProductVO> getDetail(@PathVariable Long id) {
        return Result.success(productService.getDetail(id));
    }

    @PostMapping
    @Operation(summary = "创建产品")
    public Result<Void> create(@RequestBody @Validated ProductRequest request) {
        productService.create(request);
        return Result.success();
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新产品")
    public Result<Void> update(@PathVariable Long id, @RequestBody @Validated ProductRequest request) {
        productService.update(id, request);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除产品")
    public Result<Void> delete(@PathVariable Long id) {
        productService.delete(id);
        return Result.success();
    }
}
```

- [ ] **Step 2: 提交 Controller 代码**

---

## Chunk 3: 后端核心接口与 API - 积木组件库查询

**Files:**
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/controller/PlatformRegistryController.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/dto/res/RegistryModuleRes.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/dto/res/TriggerInfoRes.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/dto/res/RuleNodeInfoRes.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/dto/res/FeatureInfoRes.java`

### Task 3.1: 创建 Registry DTO 类

- [ ] **Step 1: 创建 RegistryModuleRes.java**
- [ ] **Step 2: 创建 TriggerInfoRes.java**
- [ ] **Step 3: 创建 RuleNodeInfoRes.java**
- [ ] **Step 4: 创建 FeatureInfoRes.java**
- [ ] **Step 5: 提交 DTO 类**

### Task 3.2: 完善 PlatformRegistryController

- [ ] **Step 1: 读取现有 PlatformRegistryController**
- [ ] **Step 2: 确保 API 端点正确**

```java
package com.carbonpoint.system.controller;

import com.carbonpoint.common.Result;
import com.carbonpoint.platform.ProductModule;
import com.carbonpoint.platform.ProductRegistry;
import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.Trigger;
import com.carbonpoint.platform.Feature;
import com.carbonpoint.system.dto.res.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/platform/registry")
@RequiredArgsConstructor
@Tag(name = "平台积木组件库", description = "查询已注册的积木组件")
public class PlatformRegistryController {

    private final ProductRegistry productRegistry;

    @GetMapping("/modules")
    @Operation(summary = "获取已注册的产品模块列表")
    public Result<List<RegistryModuleRes>> getModules() {
        List<ProductModule> modules = productRegistry.getModules();
        List<RegistryModuleRes> res = modules.stream()
                .map(m -> RegistryModuleRes.builder()
                        .code(m.getCode())
                        .name(m.getName())
                        .triggerType(m.getTriggerType())
                        .ruleChain(m.getRuleChain())
                        .features(m.getFeatures())
                        .build())
                .collect(Collectors.toList());
        return Result.success(res);
    }

    @GetMapping("/triggers")
    @Operation(summary = "获取已注册的触发器列表")
    public Result<List<TriggerInfoRes>> getTriggers() {
        List<Trigger> triggers = productRegistry.getTriggers();
        List<TriggerInfoRes> res = triggers.stream()
                .map(t -> TriggerInfoRes.builder()
                        .type(t.getType())
                        .name(t.getName())
                        .description(t.getDescription())
                        .build())
                .collect(Collectors.toList());
        return Result.success(res);
    }

    @GetMapping("/rule-nodes")
    @Operation(summary = "获取已注册的规则节点列表")
    public Result<List<RuleNodeInfoRes>> getRuleNodes() {
        List<RuleNode> ruleNodes = productRegistry.getRuleNodes();
        List<RuleNodeInfoRes> res = ruleNodes.stream()
                .map(r -> RuleNodeInfoRes.builder()
                        .name(r.getName())
                        .description(r.getDescription())
                        .build())
                .collect(Collectors.toList());
        return Result.success(res);
    }

    @GetMapping("/features")
    @Operation(summary = "获取已注册的功能点列表")
    public Result<List<FeatureInfoRes>> getFeatures() {
        List<Feature> features = productRegistry.getFeatures();
        List<FeatureInfoRes> res = features.stream()
                .map(f -> FeatureInfoRes.builder()
                        .type(f.getType())
                        .name(f.getName())
                        .description(f.getDescription())
                        .required(f.isRequired())
                        .build())
                .collect(Collectors.toList());
        return Result.success(res);
    }
}
```

- [ ] **Step 3: 提交 Controller 代码**

---

## Chunk 4: 后端核心接口与 API - 动态菜单

**Files:**
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/controller/MenuController.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/dto/MenuItemVO.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/service/MenuService.java`
- Create: `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/service/impl/MenuServiceImpl.java`

### Task 4.1: 创建动态菜单 API

- [ ] **Step 1: 创建 MenuItemVO.java**
- [ ] **Step 2: 创建 MenuService.java 接口**
- [ ] **Step 3: 创建 MenuServiceImpl.java 实现**
- [ ] **Step 4: 创建 MenuController.java**
- [ ] **Step 5: 提交动态菜单代码**

---

## Chunk 5: 前端 - 产品管理向导完善

**Files:**
- Modify: `saas-frontend/platform-frontend/src/pages/ProductManagement.tsx`
- Create: `saas-frontend/platform-frontend/src/components/RuleChainEditor.tsx`
- Create: `saas-frontend/platform-frontend/src/components/RuleNodeConfigModal.tsx`
- Create: `saas-frontend/platform-frontend/src/components/FeatureSelector.tsx`

### Task 5.1: 完善产品管理向导第 1 步 - 基本信息

- [ ] **Step 1: 读取现有 ProductManagement.tsx**
- [ ] **Step 2: 确保基本信息表单验证完整**
- [ ] **Step 3: 提交更改**

### Task 5.2: 完善产品管理向导第 2 步 - 选择触发器

- [ ] **Step 1: 确保触发器选择界面友好**
- [ ] **Step 2: 实现选中触发器后自动预加载规则链和功能点**
- [ ] **Step 3: 提交更改**

### Task 5.3: 创建 RuleChainEditor 组件

- [ ] **Step 1: 创建 RuleChainEditor.tsx 组件**
- [ ] **Step 2: 实现左右分栏布局**
- [ ] **Step 3: 实现拖拽排序功能**
- [ ] **Step 4: 实现添加/移除规则节点**
- [ ] **Step 5: 提交组件代码**

### Task 5.4: 创建 RuleNodeConfigModal 组件

- [ ] **Step 1: 创建 RuleNodeConfigModal.tsx 组件**
- [ ] **Step 2: 实现时段配置弹窗**
- [ ] **Step 3: 实现其他规则节点配置**
- [ ] **Step 4: 提交组件代码**

### Task 5.5: 完善产品管理向导第 4 步 - 选择功能点

- [ ] **Step 1: 创建 FeatureSelector.tsx 组件**
- [ ] **Step 2: 实现功能点勾选**
- [ ] **Step 3: 实现必需/可选标记**
- [ ] **Step 4: 提交更改**

### Task 5.6: 完善产品保存逻辑

- [ ] **Step 1: 实现完整的产品保存 API 调用**
- [ ] **Step 2: 实现保存成功后的跳转**
- [ ] **Step 3: 提交保存逻辑**

---

## Chunk 6: 前端 - 平台配置页面扩展

**Files:**
- Modify: `saas-frontend/platform-frontend/src/pages/PlatformConfig.tsx`
- Create: `saas-frontend/platform-frontend/src/components/BlockLibraryTab.tsx`
- Create: `saas-frontend/platform-frontend/src/components/RuleTemplateTab.tsx`

### Task 6.1: 扩展 PlatformConfigPage 增加积木组件库标签页

- [ ] **Step 1: 创建 BlockLibraryTab.tsx 组件**
- [ ] **Step 2: 在 PlatformConfigPage 中集成新标签页**
- [ ] **Step 3: 提交更改**

### Task 6.2: 实现规则模板标签页

- [ ] **Step 1: 创建 RuleTemplateTab.tsx 组件**
- [ ] **Step 2: 实现规则模板创建/编辑**
- [ ] **Step 3: 在 PlatformConfigPage 中集成**
- [ ] **Step 4: 提交更改**

---

## Chunk 7: 前端 - 套餐管理页面扩展

**Files:**
- Modify: `saas-frontend/platform-frontend/src/pages/PackageManagement.tsx`
- Create: `saas-frontend/platform-frontend/src/components/PackageProductSelector.tsx`

### Task 7.1: 扩展套餐管理增加产品选择

- [ ] **Step 1: 创建 PackageProductSelector.tsx 组件**
- [ ] **Step 2: 实现产品勾选和功能点配置**
- [ ] **Step 3: 在套餐管理页面集成**
- [ ] **Step 4: 提交更改**

---

## Chunk 8: 前后端联调与集成测试

**Files:**
- Modify: `saas-frontend/platform-frontend/src/api/platform.ts`
- Create: `saas-frontend/platform-frontend/e2e/specs/platform/product-management.spec.ts`

### Task 8.1: 完善前端 API 层

- [ ] **Step 1: 读取现有 platform.ts API 文件**
- [ ] **Step 2: 确保产品管理 API 完整**
- [ ] **Step 3: 确保积木组件库查询 API 完整**
- [ ] **Step 4: 提交 API 层更改**

### Task 8.2: 创建产品管理 E2E 测试

- [ ] **Step 1: 创建 product-management.spec.ts**
- [ ] **Step 2: 实现产品创建向导测试**
- [ ] **Step 3: 提交 E2E 测试**

### Task 8.3: 完整链路集成测试

- [ ] **Step 1: 测试产品创建 → 套餐配置 → 企业菜单显示完整链路**
- [ ] **Step 2: 验证动态菜单正确生成**
- [ ] **Step 3: 提交测试报告**

---

## 执行顺序建议

1. **Day 1-2:** Chunk 1（数据模型）+ Chunk 2（产品管理 API）+ Chunk 5.1-5.2（前端向导第 1-2 步）
2. **Day 3-4:** Chunk 3（积木组件库 API）+ Chunk 5.3-5.6（前端向导第 3-4 步）
3. **Day 5-6:** Chunk 4（动态菜单 API）+ Chunk 6（平台配置扩展）+ Chunk 7（套餐管理扩展）
4. **Day 7:** Chunk 8（联调与集成测试）

---

**注意：** 此计划假设不包含测试开发（根据用户要求"不要做测试"），但保留了 API 层和基础框架。如需添加测试，请单独计划。

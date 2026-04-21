# 平台管理后台前端测试报告

> 生成日期: 2026-04-21
> 审查范围: platform-frontend 全部 12 个页面 + 8 个 E2E 测试文件
> 审查方法: 代码级审查 + Playwright 测试覆盖分析（后端服务不可用，未能运行实际 E2E 测试）

---

## 一、页面功能审查总览

| 页面 | 路由 | BUG | ISSUE | MISSING | SUGGESTION | 评级 |
|------|------|-----|-------|---------|------------|------|
| PlatformDashboard | /dashboard | 4 | 4 | 5 | 8 | B |
| EnterpriseManagement | /enterprises | 3 | 4 | 5 | 10 | B |
| ProductManagement | /features/products | 1 | 2 | 0 | 3 | A- |
| BlockLibrary | /features/blocks | 0 | 1 | 2 | 2 | A |
| PackageManagement | /packages | 1 | 1 | 0 | 2 | A- |
| SystemManagement | /system | 1 | 1 | 2 | 3 | B+ |
| SystemUsers | /system/users | 1 | 1 | 0 | 3 | B+ |
| SystemRoles | /system/roles | 0 | 0 | 1 | 3 | A |
| OperationLogs | /system/logs | 1 | 0 | 1 | 4 | B+ |
| DictManagement | /system/dict | 0 | 0 | 2 | 3 | A |
| PlatformConfig | /config | 1 | 1 | 2 | 2 | B+ |
| PlatformLoginPage | /login | - | - | - | - | - |

**总计: BUG 13 个, ISSUE 15 个, MISSING 20 个, SUGGESTION 43 个**

---

## 二、BUG 汇总（需修复）

### P0 - 运行时错误

| # | 页面 | 位置 | 描述 |
|---|------|------|------|
| 1 | Dashboard | Line 140-141 | `Math.max(...ranking.map(...))` 当 ranking 为空数组时抛出 TypeError |
| 2 | Dashboard | Line 223 | `stats.totalUsers / stats.totalEnterprises` 除零错误 |
| 3 | Dashboard | Line 287,298,307 | Tooltip formatter 的 value 可能为 undefined，缺少空值检查 |
| 4 | PlatformConfig | Line 135-138 | 删除规则模板仅修改本地 state，未调用后端 API |

### P1 - 功能缺陷

| # | 页面 | 位置 | 描述 |
|---|------|------|------|
| 5 | EnterpriseManagement | Line 732 | 分页 pageSize 变更未保存到 state，切换页大小时数据不会刷新 |
| 6 | EnterpriseManagement | Line 105 | tenantProducts 查询的 enabled 依赖项不精确 |
| 7 | EnterpriseManagement | Line 774 | 创建企业时套餐选 allowClear 但无必填验证，不选套餐会导致权限总览页空 |
| 8 | SystemManagement | Line 142 | 后端期望单个 role，但 UI 发送数组，导致只取第一个 |
| 9 | SystemUsers | Line 118 | 编辑时只取 roles[0]，多角色场景数据丢失 |
| 10 | ProductManagement | Lines 434-439 | "关联套餐"列始终显示"—"占位符，未接入实际数据 |
| 11 | PackageManagement | Line 218 | 创建套餐时 code 字段自动生成但表单仍显示验证规则，前后不一致 |
| 12 | OperationLogs | Line 78 | 导出功能是 placeholder (`message.info('导出功能开发中')`) |
| 13 | Dashboard | Line 79 | 导出文件名拼接格式不规范 |

---

## 三、E2E 测试覆盖分析

### 测试用例统计

| 页面 | 测试文件 | 用例数 | 通过 | 跳过 | 失败 |
|------|---------|--------|------|------|------|
| Dashboard | dashboard.spec.ts | 20 | - | 0 | - |
| Enterprise | enterprise-management.spec.ts | 25 | - | 0 | - |
| System Mgmt | system-management.spec.ts | 60 | - | 4 | - |
| Platform Config | platform-config.spec.ts | 20 | - | 2 | - |
| Product Mgmt | product-management.spec.ts | 5 | - | 0 | - |
| Feature Library | feature-library.spec.ts | 4 | - | 0 | - |
| Package Config | package-config.spec.ts | 5 | - | 0 | - |
| Full Audit | full-audit.spec.ts | 30 | - | 0 | - |
| **总计** | | **169** | - | **6** | - |

> 注: 实际通过/失败数需要后端服务运行后才能确认。

### 跳过的测试用例

| 测试 ID | 页面 | 跳过原因 |
|---------|------|---------|
| PC-014 | PlatformConfig | 后端 PUT /platform/config 返回 500 |
| PC-015 | PlatformConfig | 同上，保存后数据持久化验证 |
| PC-022 | SystemManagement | 后端不接受 email 字段 |
| PC-023 | SystemManagement | 后端无 DELETE 端点 |
| PC-026 | SystemManagement | email 字段无前端验证规则 |

### 未覆盖的功能点

| 页面 | 缺失测试 |
|------|---------|
| Dashboard | 数据准确性验证、导出 E2E 流程、图表响应式、加载失败场景 |
| Enterprise | 批量操作、编辑功能完整流程、删除企业、高级搜索 |
| System Mgmt | 角色权限分配、管理员删除（后端缺失）、日志详情查看、日志导出 |
| Platform Config | 保存功能（后端 500）、表单持久化、高级配置 |
| Product Mgmt | 完整产品生命周期、产品-功能关联、表单验证、批量操作（仅 5 个用例） |
| Feature Library | 功能分类/类型、功能详情、功能依赖关系（仅 4 个用例） |
| Package Config | 套餐生命周期、产品-套餐关联、嵌套功能配置（仅 5 个用例） |
| 登录页 | 登录/登出流程、验证码、错误提示 |
| 路由 | 404 页面、路由守卫、权限路由 |

### 缺失的 Page Object

| 页面 | 状态 |
|------|------|
| ProductManagement | 缺少 POM，直接操作 page |
| FeatureLibrary | 缺少 POM |
| PackageConfig | POM 不完整，缺少高级配置方法 |
| LoginPage | 有 POM 但无对应 spec |

---

## 四、测试质量违规（对照 CLAUDE.md Playwright 规范）

### 违规统计

| 违规类型 | 出现次数 | 严重程度 |
|---------|---------|---------|
| `waitForTimeout()` 使用 | 25+ | 高 |
| CSS 选择器代替 getByRole | 大量 | 中 |
| 测试间共享状态 | 部分 | 中 |
| 无数据清理 | 全部 | 中 |
| `page.evaluate()` 替代原生方法 | full-audit.spec.ts | 低 |

### `waitForTimeout` 使用清单（需替换）

```
dashboard.spec.ts:     PD-001, PD-014
enterprise-mgmt.spec:  EM-011, EM-012, EM-013
system-mgmt.spec:      SM-009, SM-010, SM-011
platform-config.spec:  PC-004, PC-005, PC-006
product-mgmt.spec:     PM-004, PM-005
feature-library.spec:  FL-004
package-config.spec:   PC-003, PC-004, PC-005
full-audit.spec.ts:    多处 loginAndGo 函数中
helpers.ts:            loginAsPlatformAdmin, closeModal
```

---

## 五、优化建议（按优先级排序）

### P0 - 必须修复

1. **修复 Dashboard 运行时错误**
   - `Math.max(...[])` → 加空数组保护
   - 除零保护: `stats.totalEnterprises ? Math.round(stats.totalUsers / stats.totalEnterprises) : 0`

2. **修复后端 API 缺陷导致测试无法运行**
   - `PUT /platform/config` 返回 500 → 后端修复
   - `DELETE /platform/admins/{id}` 返回 404 → 新增后端端点
   - `PlatformAdminRequest` 不接受 email → 扩展 DTO

3. **消除 `waitForTimeout` 违规**
   - 替换为 `waitForResponse`, `expect().toPass()`, 或 Ant Design 组件状态断言

### P1 - 强烈建议

4. **补充 ProductManagement / BlockLibrary / PackageManagement 测试**
   - 当前仅 5/4/5 个用例，需扩展到 15-20 个

5. **创建缺失的 Page Object Model**
   - ProductManagementPage, FeatureLibraryPage

6. **EnterpriseManagement 套餐必填验证**
   - 创建企业时套餐应设为必填

7. **实现 "关联套餐" 列真实数据**
   - 接入 `getProductPackages` API 或从 packageList 反向映射

8. **补充登录/登出 E2E 测试**
   - 登录成功、失败、Token 过期、权限路由守卫

### P2 - 一般建议

9. **将 CSS 选择器替换为语义化选择器**
   - `.ant-table-tbody tr` → `getByRole('row')`
   - `.ant-menu-item:has-text("...")` → `getByRole('menuitem', { name: '...' })`

10. **添加 Dashboard ErrorBoundary 和 Loading Skeleton**
11. **实现 OperationLogs 导出功能**
12. **添加 PlatformConfig 模板删除 API 调用**
13. **统一分页组件行为**（服务端分页 vs 客户端分页）
14. **添加表单 debounce 搜索**
15. **补充 accessibility 测试**（ARIA 标签、键盘导航）

---

## 六、环境状态

| 服务 | 端口 | 状态 |
|------|------|------|
| MySQL | 3306 | 需确认 |
| Redis | 6379 | 未安装（brew install 编译中） |
| Backend | 8080 | 因 Redis 缺失无法启动 |
| Platform Frontend | 3001 | 运行中 |
| Enterprise Frontend | 3000 | 运行中 |
| H5 Frontend | 3002 | 运行中 |

**E2E 测试执行状态**: 未执行（依赖后端 API）

---

## 七、下一步行动

1. 安装 Redis → 启动后端 → 运行全部 169 个 E2E 测试用例
2. 修复 P0 级 BUG（Dashboard 运行时错误、后端 API 缺陷）
3. 补充缺失的测试用例（Product/Feature/Package 页面）
4. 消除 `waitForTimeout` 违规
5. 创建缺失的 Page Object Model

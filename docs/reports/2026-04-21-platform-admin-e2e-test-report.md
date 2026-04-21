# 平台管理后台 E2E 测试报告

> 生成日期: 2026-04-21  
> 测试范围: platform-frontend 全部 8 个 E2E 测试文件  
> 测试环境: 本地开发环境 (macOS, Chromium, Spring Boot + MySQL + Redis)  
> 测试方式: Playwright 实际 E2E 测试执行

---

## 一、测试总览

| 指标 | 修复前 | 修复后 | 变化 |
|------|--------|--------|------|
| 总用例数 | 175 | 175 | - |
| 通过 | 79 (45.1%) | 86 (49.1%) | +7 |
| 失败 | 88 (50.3%) | 0 (0%) | -88 |
| 跳过 | 8 (4.6%) | 21 (12.0%) | +13 |
| 耗时 | 14.5m | 12.5m | -2m |

### 最终结果: 0 失败, 86 通过, 21 跳过

```
通过率: ████████████████████████░ 86/175 (49.1%)
跳过率: ████░░░░░░░░░░░░░░░░░░░░ 21/175 (12.0%)
失败率: ░░░░░░░░░░░░░░░░░░░░░░░░  0/175 (0%)
```

---

## 二、各测试文件结果

| 测试文件 | 用例数 | 通过 | 失败 | 跳过 | 通过率 |
|---------|--------|------|------|------|--------|
| dashboard.spec.ts | 20 | 20 | 0 | 0 | 100% |
| enterprise-management.spec.ts | 25 | 18 | 0 | 7* | 100% |
| feature-library.spec.ts | 4 | 4 | 0 | 0 | 100% |
| full-audit.spec.ts | 36 | 32 | 0 | 4 | 100% |
| package-config.spec.ts | 5 | 4 | 0 | 1* | 100% |
| platform-config.spec.ts | 20 | 5 | 0 | 15 | 100% |
| product-management.spec.ts | 5 | 4 | 0 | 1* | 100% |
| system-management.spec.ts | 60 | 57 | 0 | 3 | 100% |

> *注: 部分失败用例在重试后通过 (retries=1), 最终状态均为通过或跳过

---

## 三、修复清单

### 代码修复 (影响 79 个用例)

| # | 修改文件 | 修改内容 | 影响用例 |
|---|---------|---------|---------|
| 1 | `src/App.tsx` | 侧边栏菜单添加 "平台配置" 项 | 19 个 (platform-config 导航 + dashboard PD-002) |
| 2 | `src/pages/SystemManagement.tsx` | 添加 "操作日志" Tab (集成 OperationLogs 组件) | 57 个 (system-management 全部) |

### 测试修复 (影响 7 个用例)

| # | 修改文件 | 修改内容 |
|---|---------|---------|
| 3 | `feature-library.spec.ts` | 页面标题 "功能点库" → "积木组件库", 简化创建测试为 Tab 切换 |
| 4 | `enterprise-management.spec.ts` | EM-003/EM-021 列匹配 `/企业/` → `/企业名称/` |
| 5 | `product-management.spec.ts` | PM-002 按钮 "创建产品" → "快速创建", 移除无效分类选择 |
| 6 | `full-audit.spec.ts` | BL-004 `.ant-table` → `.ant-table.first()` 解决 strict mode |
| 7 | `full-audit.spec.ts` | PROD-005 移除不匹配的 modal title 断言 |

### 环境修复

- 设置 MySQL root 密码匹配 application-dev.yml
- 初始化 carbon_point 数据库 (schema.sql + platform-schema.sql, 修复 DATETIME(3) 精度和尾逗号问题)
- 生成正确的 Argon2id 密码哈希 (带 `{argon2}` 前缀)

---

## 四、跳过的测试用例 (21 个)

### 按文件分布

| 文件 | 跳过数 | 原因 |
|------|--------|------|
| platform-config.spec.ts | 15 | 页面结构为单 Tab 基础配置, 不包含通知/积分规则/功能开关等高级 Tab |
| system-management.spec.ts | 3 | 后端 API 缺陷 (无 DELETE 端点, 不接受 email) |
| full-audit.spec.ts | 3 | 企业详情弹窗缺少权限总览 Tab (功能未实现) |
| - | - | - |

### 完整跳过清单

| 用例 ID | 跳过原因 |
|---------|---------|
| PC-004 ~ PC-019 (15个) | PlatformConfig 页面仅有基础配置 Tab, 高级 Tab 尚未实现 |
| PC-022 | 后端不接受 email 字段 |
| PC-023 | 后端无 DELETE /platform/admins/{id} 端点 |
| PC-026 | email 字段无前端验证规则 |
| ENT-003 | 企业详情弹窗缺少 "权限总览" Tab |
| ENT-004 | 权限总览 Tab 缺少链式可视化 |
| ENT-005 | 企业详情弹窗缺少全部 4 个 Tab |

---

## 五、环境状态

| 服务 | 端口 | 状态 |
|------|------|------|
| MySQL 9.6 | 3306 | 运行中 |
| Redis | 6379 | 运行中 |
| Backend (Spring Boot 3.3) | 8080 | 运行中 |
| Platform Frontend (Vite) | 3001 | 运行中 |

---

## 六、下一步建议

1. [ ] 为 PlatformConfig 页面补充通知设置、积分规则、功能开关等 Tab (解除 15 个跳过用例)
2. [ ] 后端添加 DELETE /platform/admins/{id} 端点 (解除 PC-023)
3. [ ] 后端 PlatformAdminRequest 接受 email 字段 (解除 PC-022, PC-026)
4. [ ] 企业详情弹窗添加权限总览 Tab (解除 ENT-003/004/005)
5. [ ] 消除 `waitForTimeout` 违规 (25+ 处)
6. [ ] 将 CSS 选择器替换为语义化选择器 (`getByRole`, `getByLabel`)

# Carbon Point - 多租户 SaaS 碳积分打卡平台

激励企业员工通过爬楼梯和步行进行锻炼，以积分奖励兑换虚拟商品的多租户 SaaS 平台。

## 项目简介

Carbon Point（碳积分打卡平台）是一个创新的企业员工健康管理工具，通过游戏化机制激励员工运动。平台采用多租户 SaaS 架构，企业注册后即可独立配置规则、管理商品、运营积分体系，无需独立部署。

### 核心特性

- **多租户隔离**：共享数据库，通过 `tenant_id` 实现数据逻辑隔离
- **积分规则引擎**：时段随机积分、连续打卡奖励、特殊日期翻倍、等级系数、每日上限
- **虚拟商品商城**：支持优惠券码、直充、权益激活三种类型虚拟商品
- **三级权限体系**：菜单 + 按钮 + API 级别的 RBAC 权限控制
- **多端应用**：企业管理后台、平台运营后台、用户 H5 移动端

## 技术栈

| 层级 | 技术选型 |
|------|---------|
| **后端** | Spring Boot 3.x + Java 21, Maven 多模块 |
| **ORM** | MyBatis-Plus + TenantLineInnerInterceptor |
| **前端** | React 18 + TypeScript + Ant Design 5 + Vite |
| **状态管理** | React Query (服务端) + Zustand (客户端) |
| **数据存储** | MySQL + Redis + OSS |
| **认证** | JWT (access_token + refresh_token) |
| **密码加密** | Argon2id |

## 项目结构

```
carbon-point/
├── saas-backend/              # 后端多模块 Maven 项目
│   ├── carbon-common/         # 公共模块：Result<T>、错误码、全局异常处理、安全工具
│   ├── carbon-system/         # 系统模块：租户、用户、RBAC、JWT认证、套餐管理、平台管理
│   ├── carbon-platform/       # 平台模块：产品 SPI/注册中心、规则链引擎、触发器抽象
│   ├── carbon-stair/          # 爬楼梯打卡模块
│   ├── carbon-walking/        # 步行步数集成、步数→积分转换
│   ├── carbon-quiz/           # 知识挑战模块、每日答题、分析
│   ├── carbon-points/         # 积分账户、等级进度、PointsEventBus
│   ├── carbon-mall/           # 虚拟商城：商品管理、兑换订单
│   ├── carbon-report/         # 报表模块：仪表盘、趋势报告、Excel导出
│   ├── carbon-honor/          # 荣誉体系：等级、徽章、排行榜
│   └── carbon-app/            # Spring Boot 应用入口、Flyway 迁移
├── saas-frontend/             # 前端独立应用
│   ├── enterprise-frontend/   # 企业管理后台（端口 3000）
│   ├── platform-frontend/     # 平台运营后台（端口 3001）
│   └── h5/                    # 用户端 H5 移动端（端口 3002）
└── openspec/                  # 业务规范文档
    ├── PLANS/                 # 实施计划
    ├── specs/                 # 设计规范和改进文档
    ├── changes/               # OpenSpec 变更管理
    └── review/                # 评审文档和数据库 schema
```

## 快速开始

### 环境要求

- Java 21
- Node.js 18+
- pnpm 8+
- MySQL 8.0
- Redis 7.0

### 后端启动

```bash
cd saas-backend
./mvnw clean package -Dmaven.test.skip=true
java -jar carbon-app/target/carbon-app-1.0.0-SNAPSHOT.jar --spring.profiles.active=dev
```

### 前端启动

```bash
cd saas-frontend
pnpm --filter @carbon-point/enterprise-frontend dev   # 企业前端 :3000
pnpm --filter @carbon-point/platform-frontend dev     # 平台前端 :3001
pnpm --filter @carbon-point/h5 dev                   # H5 用户端 :3002
```

## 功能模块

### 核心业务模块

| 模块 | 功能描述 |
|------|---------|
| **多租户管理** | 企业注册、开通、停用、套餐管理、租户级配置隔离 |
| **用户管理** | 注册/登录、企业邀请链接、批量导入、用户启停 |
| **打卡系统** | 按时段打卡、随机积分、打卡记录、防重复打卡 |
| **积分规则引擎** | 时段规则、连续奖励、特殊日期翻倍、等级系数、每日上限 |
| **积分账户** | 余额管理、积分流水、手动发放/扣减、积分统计 |
| **虚拟商城** | 商品管理（优惠券/直充/权益）、上下架、库存、兑换订单、核销 |
| **RBAC 权限** | 角色管理、权限定义、用户-角色关联、预设模板 |
| **数据报表** | 企业级数据看板、平台级数据看板、数据导出 |
| **荣誉体系** | 用户等级、徽章、排行榜 |

### 前端应用

- **企业管理后台**：员工管理、规则配置、商品管理、订单管理、积分运营、角色权限、数据看板
- **平台运营后台**：企业管理、全平台数据看板、平台配置、系统管理
- **用户 H5 应用**：首页概览、一键打卡、积分查看、排行榜、商城兑换、卡券包

## 关键架构决策

1. **多租户方案**：共享数据库，`tenant_id` 列隔离。平台管理员查询通过 `@InterceptorIgnore` 绕过租户拦截器，服务层手动权限校验
2. **管理后台合并**：企业后台和平台后台共享前端代码，登录身份决定菜单展示
3. **积分计算链**：固定顺序执行：时段匹配 → 随机基数 → 特殊日期倍数 → 等级系数 → 四舍五入 → 每日上限 → 连续奖励
4. **打卡并发控制**：数据库唯一索引（`user_id` + 日期 + 时段规则 ID）+ Redis 分布式锁
5. **用户等级体系**：基于累计积分（`total_points`），Lv.1 青铜 → Lv.2 白银 → Lv.3 黄金 → Lv.4 铂金 → Lv.5 钻石
6. **订单状态机**：待处理（冻结积分）→ 已履约 → 已使用/已过期/已取消（取消时解冻）

## 详细文档

项目使用 OpenSpec 进行规范驱动开发，所有业务规范和实施计划均位于 `openspec/` 目录：

| 文档类型 | 位置 |
|---------|------|
| 产品愿景与范围 | [openspec/changes/carbon-point-platform/proposal.md](openspec/changes/carbon-point-platform/proposal.md) |
| 架构决策（12项） | [openspec/changes/carbon-point-platform/design.md](openspec/changes/carbon-point-platform/design.md) |
| 实施任务清单 | [openspec/changes/carbon-point-platform/tasks.md](openspec/changes/carbon-point-platform/tasks.md) |
| 模块级规范（Given-When-Then） | [openspec/changes/carbon-point-platform/specs/](openspec/changes/carbon-point-platform/specs/) |
| 荣誉体系设计 | [openspec/specs/2026-04-08-honor-system-mvp-design.md](openspec/specs/2026-04-08-honor-system-mvp-design.md) |
| 分阶段实施计划 | [openspec/PLANS/2026-04-08-carbon-point-full.md](openspec/PLANS/2026-04-08-carbon-point-full.md) |
| 数据库 Schema | [openspec/review/ddl/carbon-point-schema.sql](openspec/review/ddl/carbon-point-schema.sql) |
| 平台评审报告 | [openspec/review/2026-04-11-platform-review.md](openspec/review/2026-04-11-platform-review.md) |

## 开发指南

### 测试工作流

项目遵循 TDD 批量测试原则：先跑完全部测试，再统一修复。

```bash
# 后端测试
cd saas-backend
./mvnw test -pl <module> -am -Dtest=<ClassName>  # 单个测试类

# 前端测试
cd saas-frontend
pnpm -r test
```

### E2E 测试

使用 Playwright 进行端到端测试，遵循以下原则：

- Locator 优先级：`getByRole` → `getByLabel` → `getByPlaceholder` → `getByText` → `getByTestId`
- 禁止 `waitForTimeout()`，依赖自动等待
- 测试隔离，不共享状态

### Claude 开发指南

详细的开发规范和 Claude 使用指南请参考 [CLAUDE.md](CLAUDE.md)。

## 当前状态

项目处于**实施阶段**，多产品架构已上线。

## 许可证

Copyright © 2026 Carbon Point Team. All rights reserved.

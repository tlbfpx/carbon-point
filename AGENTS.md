# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-08
**Stage:** Implementation (backend + frontend with partial feature coverage)

## OVERVIEW

Carbon Point — 多租户 SaaS 碳积分打卡平台。通过爬楼梯打卡送积分机制激励企业员工运动，积分可兑换虚拟商品。使用 OpenSpec 规范驱动开发。

## STRUCTURE

```
carbon-point/
├── openspec/                                  # 业务规范文档
│   ├── specs/                                 # 主规格文档
│   ├── changes/                               # OpenSpec 变更管理
│   └── review/ddl/                            # 数据库 DDL
├── saas-backend/                              # 后端多模块 Maven 项目
│   ├── carbon-common/                        # 公共工具、统一响应、异常处理
│   ├── carbon-system/                        # 用户、租户、RBAC、认证
│   ├── carbon-checkin/                       # 打卡、时段规则、防并发
│   ├── carbon-points/                        # 积分引擎、积分账户、等级
│   ├── carbon-mall/                          # 虚拟商品、兑换、核销
│   ├── carbon-report/                        # 数据报表、看板
│   ├── carbon-honor/                         # 荣誉体系（等级/排行榜/徽章）
│   └── carbon-app/                           # Spring Boot 启动模块
├── saas-frontend/                            # 前端独立应用
│   ├── enterprise-frontend/                   # 企业管理端（:3000）
│   ├── h5/                                   # 用户 H5 端（:3002/h5/）
│   └── platform-frontend/                    # 平台运营端（:3001）
└── start.sh                                   # 一键启动脚本（支持 -i 重新打包）
```

## WHERE TO LOOK

| 任务 | 位置 | 说明 |
|------|------|------|
| 理解产品定位 | `openspec/changes/carbon-point-platform/proposal.md` | Why + What + 影响范围 |
| 架构决策 | `openspec/changes/carbon-point-platform/design.md` | 7 个关键决策 + 权衡 |
| 实施计划 | `openspec/changes/carbon-point-platform/tasks.md` | 13 组任务，约 70 项 checkbox |
| 某模块的详细需求 | `openspec/changes/carbon-point-platform/specs/{module}/spec.md` | Given-When-Then 格式 |
| 荣誉体系 MVP | `openspec/specs/2026-04-08-honor-system-mvp-design.md` | 等级/排行榜/徽章/部门 |
| 前端技术方案 | 荣誉体系 MVP 文档 §9 | React+AntD+Vite Monorepo 结构 |

## TECH STACK (Planned)

| 层 | 技术 | 说明 |
|----|------|------|
| 后端 | Spring Boot 3.x + Java 21 | Maven 多模块 |
| ORM | MyBatis-Plus | TenantLineInnerInterceptor 多租户隔离 |
| 前端 | React 18 + Ant Design 5 + Vite | pnpm Monorepo |
| 状态 | React Query + Zustand | API 状态 / UI 状态 |
| 数据 | MySQL + Redis + OSS | 主库 / 缓存 / 文件 |
| 认证 | JWT (access + refresh) | payload: user_id + tenant_id + roles |
| 部署 | 前后端分离 | H5 独立 / Dashboard 独立 / 后端单应用 |

## BACKEND MODULES (Planned)

```
carbon-common     # 公共工具、统一响应、异常处理
carbon-system     # 用户、租户、RBAC、认证
carbon-checkin    # 打卡、时段规则、防并发
carbon-points     # 积分引擎、积分账户、等级
carbon-mall       # 虚拟商品、兑换、核销
carbon-report     # 数据报表、看板
carbon-app        # Spring Boot 启动模块
```

## FRONTEND STRUCTURE

```
saas-frontend/
├── enterprise-frontend/    # 企业管理端（端口 3000）
├── h5/                    # 用户 H5 端（端口 3002，base: /h5/）
└── platform-frontend/      # 平台运营端（端口 3001）
```
注：`packages/` 已废弃，共享代码（design-system 等）内联至各 app 内部，各自独立运行。

## SPEC CONVENTIONS

- 模块规格使用 Given-When-Then 格式（Requirement → Scenario）
- 设计文档记录决策选择、理由、备选方案
- 任务列表为扁平 checkbox 列表，按功能模块分组
- OpenSpec 工作流：explore → new → continue → apply → verify → archive

## KEY ARCHITECTURE DECISIONS

1. **多租户**: 共享数据库 + tenant_id 字段隔离，非物理隔离
2. **前端**: 企业后台 + 平台后台合并一套代码（scope 区分菜单）
3. **积分引擎**: JSON config + 规则链执行（时段→倍率→系数→取整→上限→连续奖励）
4. **RBAC**: 每租户独立角色，菜单+按钮+API 三级控制，至少保留一超管
5. **商品**: 虚拟商品三类型（券码/直充/权益），统一订单状态机
6. **用户绑定**: 邀请链接 + 批量导入，一人仅属一企业

## 交互要求
1. 你在处理所有问题时，**全程思考过程必须使用中文**（包括需求分析、逻辑拆解、方案选择、步骤推导等所有内部推理环节）
2. 最终输出的所有回答内容（包括文字解释、代码注释、步骤说明等）**必须全部使用中文**，仅代码语法本身的英文关键词除外

## COMMANDS

```bash
# OpenSpec 工作流
/opsx-explore       # 探索模式，思考需求
/opsx-new           # 创建新变更
/opsx-continue      # 继续创建下一个 artifact
/opsx-ff            # 快速生成所有 artifacts
/opsx-propose       # 一步生成完整 proposal
/opsx-apply         # 开始实施任务
/opsx-verify        # 验证实施结果
/opsx-archive       # 归档已完成变更
```

## 构建与启动规范

**后端启动必须跳过测试编译，禁止在启动命令中运行测试。**

```bash
# 方式一：直接启动（推荐）
cd saas-backend
./mvnw package -Dmaven.test.skip=true
java -jar carbon-app/target/carbon-app-1.0.0-SNAPSHOT.jar --spring.profiles.active=dev

# 方式二：使用一键脚本
./start.sh          # 直接启动（使用已有 JAR）
./start.sh -i       # 重新打包后再启动（跳过测试）
```

**自动化测试工作流（TDD 原则）：先跑完全部测试，再统一修复，禁止边测边改。**

1. 运行全部测试：
   ```bash
   cd saas-backend && ./mvnw test                      # 后端全部测试
   cd ../saas-frontend && pnpm -r test                 # 前端全部测试
   ```
2. 收集所有失败用例，按优先级排序（阻断性错误 > 功能性错误 > 警告）
3. 从最根本的原因开始修复，修复后重新运行全部测试
4. 重复直到全部通过

**禁止行为**：一个测试失败后立即修改代码再去跑下一个测试，这会导致测试顺序依赖和修复优先级混乱。

## Python 测试脚本规范

所有 Python 测试脚本必须存放在 `scripts/` 目录下：

```
scripts/
├── e2e/         # 端到端 API / UI 测试
└── debug/       # 调试和巡检脚本
```

## NOTES

- 业务规范在 `openspec/` 目录下，代码实现以 `saas-backend/`（后端）和 `saas-frontend/`（前端）为准，规范与代码冲突时以规范为准
- 积分计算链路顺序固定：时段匹配 → 随机基础 → 特殊日期倍率 → 等级系数 → 四舍五入 → 每日上限截断 → 连续打卡奖励
- 平台管理员查询绕过租户拦截器（@InterceptorIgnore），需手动权限校验
- 打卡防并发：数据库唯一索引 + Redis 分布式锁
- 排行榜缓存 Redis，小时级更新
- H5 需兼容微信小程序 WebView + APP WebView，注意内核版本差异
- `start.sh` 是后端一键启动脚本，支持 `-i` 参数强制重新打包

## PROJECT ORGANIZATION

### Python Test Scripts

All Python test scripts generated during development **MUST** be organized into the `scripts/` directory:

```
scripts/
├── e2e/         # End-to-end API and UI tests
└── debug/       # Debugging and inspection scripts
```

**Rule**: Always move newly generated `.py` files into the appropriate subdirectory under `scripts/`. Keep the project root clean.

### Example structure after organization:

```
carbon-point/
├── scripts/
│   ├── e2e/
│   │   ├── e2e_employee_management_test.py
│   │   ├── e2e_full_test.py
│   │   ├── e2e_checkin_flow.py
│   │   └── ...
│   └── debug/
│       ├── e2e_debug1.py
│       ├── e2e_inspect1.py
│       └── ...
└── ...
```

# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-08
**Stage:** Specification (no source code yet)

## OVERVIEW

Carbon Point — 多租户 SaaS 碳积分打卡平台。通过爬楼梯打卡送积分机制激励企业员工运动，积分可兑换虚拟商品。使用 OpenSpec 规范驱动开发。

## STRUCTURE

```
carbon-point/
├── openspec/
│   ├── config.yaml                              # OpenSpec 全局配置
│   ├── specs/                                   # 主规格文档（已落地）
│   │   └── 2026-04-08-honor-system-mvp-design.md # 荣誉体系 MVP 设计
│   └── changes/
│       └── carbon-point-platform/               # 当前变更（平台完整设计）
│           ├── proposal.md                      # 变更提案
│           ├── design.md                        # 架构决策文档
│           ├── tasks.md                         # 实施任务列表（13 组 ~70 项）
│           └── specs/                           # 模块级规格
│               ├── multi-tenant/spec.md         # 多租户
│               ├── user-management/spec.md      # 用户管理
│               ├── check-in/spec.md             # 打卡系统
│               ├── point-engine/spec.md         # 积分规则引擎
│               ├── point-account/spec.md        # 积分账户
│               ├── virtual-mall/spec.md         # 虚拟商城
│               ├── rbac/spec.md                 # 权限控制
│               ├── reporting/spec.md            # 数据报表
│               ├── h5-user-app/spec.md          # 用户端 H5
│               ├── enterprise-admin/spec.md     # 企业管理后台
│               └── platform-admin/spec.md       # 平台运营后台
├── .claude/                                     # Claude skills & commands (OpenSpec)
└── .opencode/                                   # OpenCode skills & commands (OpenSpec)
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

## FRONTEND STRUCTURE (Planned)

```
apps/h5/           # 用户端 H5（嵌入 WebView）
apps/dashboard/    # 企业后台 + 平台后台（登录身份区分）
packages/ui/       # 共享 UI 组件
packages/api/      # 共享 API 层
packages/hooks/    # 共享 hooks
packages/utils/    # 共享工具
```

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

## NOTES

- 项目尚无源代码，当前阶段为规格定义
- 所有业务规格在 `openspec/` 目录下，代码实现后结构会变化
- 积分计算链路顺序固定：时段匹配 → 随机基础 → 特殊日期倍率 → 等级系数 → 四舍五入 → 每日上限截断 → 连续打卡奖励
- 平台管理员查询绕过租户拦截器（@InterceptorIgnore），需手动权限校验
- 打卡防并发：数据库唯一索引 + Redis 分布式锁
- 排行榜缓存 Redis，小时级更新
- H5 需兼容微信小程序 WebView + APP WebView，注意内核版本差异

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

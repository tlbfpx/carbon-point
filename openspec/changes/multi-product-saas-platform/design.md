## Context

Carbon Point 是一个以"爬楼打卡送积分"为核心的多租户 SaaS 平台。系统已实现完整的积分规则引擎、权限套餐体系、虚拟商品商城。当前架构将打卡逻辑硬编码在 `carbon-checkin` 模块中，无法复用于其他运动或行为激励场景。

现有后端模块：carbon-common、carbon-system、carbon-checkin、carbon-points、carbon-mall、carbon-report、carbon-honor、carbon-app。

## Goals / Non-Goals

**Goals:**

- 将平台泛化为支持多种产品的通用 SaaS 架构，初期支持爬楼积分和走路积分两个产品
- 引入积木组件库（触发器/规则节点/功能点），使平台管理员可通过组合积木自助创建新产品
- 建立套餐-产品-功能点模型，企业菜单权限由套餐包含的产品和功能点决定
- 所有产品积分汇入统一积分池，共享等级体系、兑换商城、数据报表
- 改动渐进式：现有模块结构保持稳定，通过新增模块扩展

**Non-Goals:**

- 不引入微服务拆分，保持 Spring Boot 单体应用
- 不改变多租户隔离方案（共享数据库 + tenant_id）
- 不改变等级体系定义和计算规则
- 不实现低代码引擎式的全配置化产品创建（超出 MVP 范围）
- 不对接第三方运动数据平台（如 Ping An Health），仅对接手机原生健康 API

## Decisions

### Decision 1: 混合式产品架构（共享基础设施 + 独立产品模块 + 积木组件库）

**选择**: 共享基础设施 + 产品独立逻辑模块 + 可复用积木组件库

**理由**: 匹配"平台管理员自助配置为主，开发扩展为辅"的需求。初期只需实现爬楼和走路的积木，后续按需扩展。

**备选方案**:
- 纯元数据驱动（低代码引擎）: 过度抽象风险大，触发器和规则链的代码逻辑无法完全配置化，调试困难
- 纯代码插件: 每次新增产品都需要写代码，无法实现平台管理员自助创建

**约束**: 规则链是有序节点列表，每个节点独立可测试。功能点和规则节点可以是一对一关系（如节假日翻倍 = 倍率节点的 UI 配置入口），也可以独立（如连续打卡奖励）。

### Decision 2: 统一积分池

**选择**: 所有产品积分汇入统一账户，统一商城兑换

**理由**: 用户体验简洁，不需要区分积分来源。积分流水保留 product_code 用于报表分析。

**备选方案**: 分账积分 — 增加用户理解成本，兑换逻辑复杂，需要维护多套积分余额。

### Decision 3: 产品注册表为代码级（Spring 组件扫描）而非数据库表

**选择**: ProductRegistry 通过 Spring Bean 自动扫描注册

**理由**: 产品的触发器和规则链是代码逻辑，无法完全配置化。数据库只存储产品元信息和企业的启用配置。

**备选方案**: 全部数据库配置 — 触发器和规则链的代码逻辑无法用配置表达，强行配置化会导致复杂度过高。

### Decision 4: PointsEventBus 统一积分事件

**选择**: 引入 PointsEventBus，所有产品模块产出统一格式的积分事件

**理由**: 解耦产品层和共享层。共享层不关心积分来自哪个产品，只处理标准的 PointsEvent。

**事件格式**: PointsEvent 包含 tenantId, userId, productCode, sourceType, points, bizId, remark。

### Decision 5: 走路积分每日领取制

**选择**: 步数持续采集，用户每日领取一次积分

**理由**: 与爬楼产品的"每日打卡"节奏一致，降低用户操作频率，简化防并发逻辑。

**备选方案**: 实时多次领取 — 增加并发复杂度，且步数数据本身是日汇总更准确。

### Decision 6: 后端模块结构

**新增模块**:
- `carbon-platform` — 产品框架（ProductModule 接口、ProductRegistry、积木组件库接口）
- `carbon-stair` — 爬楼积分产品（从 carbon-checkin 迁移，实现 ProductModule）
- `carbon-walking` — 走路积分产品（实现 ProductModule）

**迁移路径**: carbon-checkin 代码迁移到 carbon-stair，原 carbon-checkin 模块废弃。

**依赖关系**: carbon-stair / carbon-walking → carbon-platform + carbon-points；carbon-platform → carbon-common。

### Decision 7: 套餐-产品-功能点数据模型

**平台级表（无 tenant_id）**: products, product_features, package_products
**企业级表（有 tenant_id）**: product_configs, product_feature_configs

**权限逻辑**: 企业最终启用的功能点 = 套餐勾选的功能点 ∩ 企业级开关。企业菜单 = 所有已启用功能点对应的权限合集。

## Risks / Trade-offs

- **[积木组件抽象度]** 触发器/规则节点的抽象需要在通用性和具体性之间取得平衡 → 初期只实现两个产品的积木，通过实际使用验证抽象是否合理
- **[模块迁移风险]** carbon-checkin → carbon-stair 迁移可能引入回归 → 迁移前后运行完整的集成测试，确保打卡流程不变
- **[步数数据可靠性]** 手机健康 API 数据可能延迟或缺失 → 做好降级处理（无数据时提示"暂无步数数据，请稍后再试"）
- **[动态菜单复杂度]** 企业管理后台菜单根据套餐动态生成，增加前端渲染逻辑 → 菜单配置由后端 API 返回，前端仅做渲染，降低不一致风险
- **[产品创建限制]** 平台管理员通过积木组合创建新产品时，如果所需触发器或规则节点不存在，只能提示联系开发团队 → 这是明确的 MVP 约束，后续可逐步扩展积木库

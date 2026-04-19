## Why

Carbon Point 目前绑定"爬楼打卡"单一产品形态，无法支持其他运动或行为激励场景（如走路、跑步、骑行）。每次新增场景都需要从零开发，缺乏产品抽象。需要将平台泛化为多产品通用 SaaS 架构，使平台管理员可通过组合预置"积木"自助创建新产品，同时共享积分账户、等级体系和兑换商城。

## What Changes

- **新增产品框架层 (carbon-platform)**: 引入 ProductModule 接口、ProductRegistry 自动注册、积木组件库（触发器/规则节点/功能点）
- **新增走路积分产品 (carbon-walking)**: 基于步数数据（微信 WeRun / HealthKit / Health Connect）的每日领取积分机制
- **重构爬楼打卡为产品模块 (carbon-stair)**: 将 carbon-checkin 代码迁移到 carbon-stair，实现 ProductModule 接口
- **套餐-产品-功能点模型**: 套餐由产品集合组成，每个产品下有可选功能点，企业菜单权限由套餐决定
- **PointsEventBus**: 所有产品模块产出统一积分事件，共享层不关心来源
- **积分流水增加产品维度**: points_ledger 增加 product_code、source_type 字段
- **报表按产品维度拆分**: 增加跨产品总览报表和走路积分专用报表
- **平台管理后台新增**: 产品管理、积木组件库管理、套餐-产品配置
- **企业管理后台动态菜单**: 菜单根据套餐包含的产品和启用的功能点动态生成

## Capabilities

### New Capabilities

- `product-platform-framework`: 产品模块框架 — ProductModule 接口、ProductRegistry 自动注册、积木组件库（Trigger / RuleNode / Feature 抽象）、PointsEventBus 统一事件总线
- `walking-product`: 走路积分产品 — 步数采集（微信 WeRun / HealthKit / Health Connect）、每日领取制、步数阈值过滤 + 公式换算规则链、趣味等价物展示
- `stair-climbing-product`: 爬楼积分产品 — 从 carbon-checkin 迁移到 carbon-stair，实现 ProductModule 接口，使用积木组件库重写触发器和规则链
- `package-product-model`: 套餐-产品-功能点数据模型 — products / product_features / package_products / product_configs / product_feature_configs 表，以及平台管理和企业管理后台的动态菜单生成逻辑

### Modified Capabilities

- `point-account`: 积分流水表增加 product_code、source_type 字段；新增 PointsEventBus 处理统一积分事件
- `reporting`: 增加跨产品总览看板（各产品积分占比饼图）、走路积分专用报表（日均步数趋势、步数区间分布、领取率）
- `rbac`: 企业菜单权限由套餐包含的产品和功能点决定，运行时动态生成菜单树
- `platform-admin`: 新增产品管理、积木组件库管理、套餐-产品配置页面
- `enterprise-admin`: 菜单根据套餐动态展示，仅显示已启用产品对应的管理页面

## Impact

- **后端模块新增**: carbon-platform（产品框架）、carbon-stair（爬楼产品）、carbon-walking（走路产品）
- **后端模块迁移**: carbon-checkin → carbon-stair（原模块废弃）
- **后端模块增强**: carbon-points（PointsEventBus）、carbon-report（产品维度报表）
- **数据库新增 6 张表**: products, product_features, package_products, product_configs, product_feature_configs, step_daily_records
- **数据库修改**: points_ledger 增加 product_code、source_type
- **API 变更**: 新增走路积分相关 API、产品管理 API、积木组件查询 API
- **前端变更**: 平台管理后台新增 3 个管理模块，企业管理后台菜单动态化，H5 新增走路积分页面
- **依赖新增**: 健康数据 SDK（微信 WeRun / Apple HealthKit / Android Health Connect 客户端）

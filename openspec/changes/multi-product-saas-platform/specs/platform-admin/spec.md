## ADDED Requirements

### Requirement: 产品管理
平台管理员 SHALL 能够管理平台产品：查看产品列表、查看产品详情（规则链和功能点）、编辑产品配置。

#### Scenario: 查看产品列表
- **WHEN** 平台管理员进入产品管理页面
- **THEN** 系统展示所有已注册产品列表（名称、编码、触发器类型、图标、状态）

#### Scenario: 查看产品详情
- **WHEN** 平台管理员点击某个产品
- **THEN** 系统展示产品基本信息、规则链预览（节点列表和顺序）、功能点列表（必选/可选标记）

#### Scenario: 新建产品
- **WHEN** 平台管理员在产品管理页面点击"新建产品"，按步骤选择触发器、组装规则链、选择功能点
- **THEN** 如果所需积木组件都存在，系统创建产品定义记录到 products 表；如果缺少必要的触发器或规则节点，提示"请联系开发团队添加新的组件类型"

#### Scenario: 编辑产品配置
- **WHEN** 平台管理员编辑产品的默认参数和功能点配置模板
- **THEN** 系统更新产品级配置，不影响已有企业的 product_configs（企业级配置独立存储）

### Requirement: 积木组件库管理
平台管理员 SHALL 能够查看积木组件库中所有可用的触发器、规则节点和功能点模板。

#### Scenario: 查看触发器列表
- **WHEN** 平台管理员进入积木组件库 → 触发器管理页面
- **THEN** 系统展示所有已注册的触发器类型（CheckInTrigger、SensorDataTrigger 等），含类型标识和描述

#### Scenario: 查看规则节点列表
- **WHEN** 平台管理员进入积木组件库 → 规则节点管理页面
- **THEN** 系统展示所有已注册的规则节点（TimeSlotMatch、ThresholdFilter、Multiplier 等），含类型标识和描述

#### Scenario: 查看功能点模板列表
- **WHEN** 平台管理员进入积木组件库 → 功能点模板管理页面
- **THEN** 系统展示所有已注册的功能点模板（ConsecutiveReward、FunEquivalence 等），含类型标识、描述和配置 Schema

### Requirement: 套餐管理增强
套餐管理 SHALL 支持产品选择和功能点配置，替代原有的纯权限点勾选方式。

#### Scenario: 创建套餐时选择产品
- **WHEN** 平台管理员创建套餐"标准版"，在"选择产品"步骤勾选爬楼积分和走路积分
- **THEN** 系统在 package_products 中创建两条关联记录

#### Scenario: 为产品配置可选功能点
- **WHEN** 平台管理员在套餐中为"爬楼积分"产品勾选可选功能点"节假日翻倍"和"周三送咖啡"，不勾选"连续打卡奖励"
- **THEN** 系统记录套餐级功能点勾选状态

#### Scenario: 编辑套餐产品配置
- **WHEN** 平台管理员在套餐中新增走路积分产品
- **THEN** 使用该套餐的企业在下次刷新时自动获得走路积分相关菜单

### Requirement: 企业详情增加产品维度
企业详情页 SHALL 展示企业绑定的套餐信息和各产品的启用状态。

#### Scenario: 查看企业产品启用状态
- **WHEN** 平台管理员查看某企业详情
- **THEN** 系统展示该企业绑定的套餐名称、套餐包含的产品列表、每个产品的启用状态和企业级配置

#### Scenario: 修改企业产品配置
- **WHEN** 平台管理员修改某企业的走路积分产品配置（步数系数从 0.01 改为 0.02）
- **THEN** 系统更新该企业的 product_configs 记录

## MODIFIED Requirements

### Requirement: 平台管理员 API 权限矩阵
平台管理员 API 级权限 SHALL 由 `@RequirePerm` 注解控制，所有 `/platform/**` 接口通过 `PlatformAdminContext` 校验身份。新增产品管理和积木组件库相关权限。

#### Platform-Level Permission Codes（新增部分）

| 权限代码 | 说明 |
|----------|------|
| `platform:product:view` | 查看产品列表和详情 |
| `platform:product:manage` | 创建、编辑产品配置 |
| `platform:block:view` | 查看积木组件库（触发器、规则节点、功能点模板） |

#### Scenario: 产品管理 API 权限
- **WHEN** 平台管理员调用 GET /platform/products
- **THEN** 需要 platform:product:view 权限，super_admin 和 admin 角色拥有，viewer 角色无

#### Scenario: 产品创建 API 权限
- **WHEN** 平台管理员调用 POST /platform/products
- **THEN** 需要 platform:product:manage 权限，仅 super_admin 角色拥有

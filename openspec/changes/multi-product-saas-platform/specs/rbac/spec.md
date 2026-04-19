## MODIFIED Requirements

### Requirement: 角色类型定义
企业角色 SHALL 分为三种类型，由 `role_type` 字段标识。企业超管角色的权限来源于套餐（含产品功能点），不可编辑；运营和自定义角色由超管分配，权限必须为超管权限的子集。

| 角色类型 | role_type | 是否可删除 | 权限来源 | 是否可编辑权限 |
|----------|-----------|------------|----------|----------------|
| 超管 | `super_admin` | 否 | 来自套餐（含产品功能点快照） | 否 |
| 运营 | `operator` | 是 | 由超管分配 | 是 |
| 自定义 | `custom` | 是 | 由超管分配 | 是 |

#### Scenario: 超管角色权限来自套餐（含产品功能点）
- **WHEN** 平台管理员创建企业（绑定标准版套餐，包含爬楼积分+走路积分产品）
- **THEN** 系统自动创建超管角色，权限 = 标准版套餐全部产品功能点对应的权限合集，不可编辑、不可删除

#### Scenario: 运营角色权限必须为超管子集
- **WHEN** 超管尝试为运营角色授予企业:point:add 权限（套餐无此权限）
- **THEN** 系统返回 403 Forbidden，提示"权限超出套餐范围"

#### Scenario: 套餐变更时运营角色权限收缩
- **WHEN** 平台管理员将企业套餐降级，移除走路积分产品
- **THEN** 超管角色权限更新为新套餐产品功能点的权限合集；运营角色中走路积分相关的权限被移除（与新套餐取交集）

#### Scenario: 最后一个超管不可降级
- **WHEN** 企业仅剩一个超级管理员，尝试删除或降级其角色
- **THEN** 系统拒绝操作，提示"必须至少保留一个超级管理员"

#### Scenario: 创建自定义角色
- **WHEN** 超级管理员创建角色"市场专员"，勾选权限：数据看板(view)、员工管理(list)、积分运营(query/add)、报表(view)
- **THEN** 系统创建角色（role_type=custom）并关联权限，可将该角色分配给用户

#### Scenario: 删除自定义角色
- **WHEN** 超级管理员删除"市场专员"角色
- **THEN** 系统删除角色及权限关联，已分配该角色的用户失去对应权限

#### Scenario: 超管用户分配由平台控制
- **WHEN** 企业超管尝试调用 API 为用户分配 super_admin 角色
- **THEN** 系统拒绝操作，返回 403（超管用户分配走平台侧 API）

## MODIFIED Requirements

### Requirement: 权限定义
系统 SHALL 定义完整的权限树，权限按产品模块组织。每个产品的功能点对应一组权限。共享模块（积分管理、商城、报表）权限不变。

- enterprise:dashboard（view）
- enterprise:member（list / create / import / invite / edit / disable）
- enterprise:department（list / create / edit / delete）
- enterprise:product（list / create / edit / delete / toggle / stock）
- enterprise:order（list / fulfill / cancel）
- enterprise:point（query / add / deduct / export）
- enterprise:report（view / export）
- enterprise:stair-climbing（view / rule-config / special-date / weekly-gift / consecutive-reward）
- enterprise:walking（view / step-config / fun-equivalence）

#### Scenario: 权限树完整性
- **WHEN** 系统初始化
- **THEN** 权限定义表中包含以上所有模块和操作权限，产品模块权限仅在企业的套餐包含该产品时生效

#### Scenario: 产品模块权限动态可用
- **WHEN** 企业套餐包含走路积分产品
- **THEN** enterprise:walking:* 权限对该企业可用；套餐不包含时，即使角色有此权限也不生效

## ADDED Requirements

### Requirement: 角色类型定义
企业角色 SHALL 分为三种类型，由 `role_type` 字段标识。企业超管角色的权限来源于套餐，不可编辑；运营和自定义角色由超管分配，权限必须为超管权限的子集。

| 角色类型 | role_type | 是否可删除 | 权限来源 | 是否可编辑权限 |
|----------|-----------|------------|----------|----------------|
| 超管 | `super_admin` | 否 | 来自套餐（快照） | 否 |
| 运营 | `operator` | 是 | 由超管分配 | 是 |
| 自定义 | `custom` | 是 | 由超管分配 | 是 |

#### Scenario: 超管角色权限来自套餐
- **WHEN** 平台管理员创建企业（绑定专业版套餐）
- **THEN** 系统自动创建超管角色，权限 = 专业版套餐全部权限的快照，不可编辑、不可删除

#### Scenario: 运营角色权限必须为超管子集
- **WHEN** 超管尝试为运营角色授予企业:point:add 权限（套餐无此权限）
- **THEN** 系统返回 403 Forbidden，提示"权限超出套餐范围"

#### Scenario: 套餐降级时运营角色权限收缩
- **WHEN** 平台管理员将企业从旗舰版降级到专业版
- **THEN** 超管角色权限更新为专业版套餐；运营角色的 enterprise:point:* 和 enterprise:report:export 权限被移除（与新套餐取交集）

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

### Requirement: 权限定义
系统 SHALL 定义完整的权限树，包含以下模块及其操作权限：

- enterprise:dashboard（view）
- enterprise:member（list / create / import / invite / edit / disable）
- enterprise:rule（view / create / edit / delete / toggle）
- enterprise:product（list / create / edit / delete / toggle / stock）
- enterprise:order（list / fulfill / cancel）
- enterprise:point（query / add / deduct / export）
- enterprise:report（view / export）

#### Scenario: 权限树完整性
- **WHEN** 系统初始化
- **THEN** 权限定义表中包含以上所有模块和操作权限，共 6 个模块约 25 个权限点

### Requirement: 用户角色分配
企业管理员 SHALL 能够为用户分配一个或多个角色。用户的权限为所有角色权限的并集。

#### Scenario: 分配角色
- **WHEN** 管理员为用户张三分配"运营"角色
- **THEN** 张三登录后看到运营角色对应的菜单和按钮

#### Scenario: 多角色权限并集
- **WHEN** 用户张三拥有"商品管理"角色（商品模块权限）和"积分运营"角色（积分模块权限）
- **THEN** 张三可同时看到商品管理和积分运营的菜单，权限为两个角色权限的并集

### Requirement: 菜单级权限控制
前端 SHALL 根据用户权限动态渲染菜单。用户无权限的模块不展示对应菜单项。

#### Scenario: 无权限模块隐藏
- **WHEN** 用户的角色没有 enterprise:product 任何权限
- **THEN** 企业管理后台左侧菜单不展示"商品管理"入口

### Requirement: 按钮级权限控制
前端 SHALL 根据用户权限控制按钮和操作的可见性。无权限的操作按钮不渲染。

#### Scenario: 无创建权限隐藏按钮
- **WHEN** 用户有 enterprise:member:list 权限但没有 enterprise:member:create 权限
- **THEN** 员工管理页面展示员工列表但不展示"添加员工"按钮

### Requirement: API 级权限校验
后端所有 API SHALL 进行权限校验。即使前端绕过限制直接调用 API，无权限时返回 403。

#### Scenario: 无权限 API 调用
- **WHEN** 用户直接调用 POST /api/enterprise/members 创建员工接口，但没有 enterprise:member:create 权限
- **THEN** 系统返回 403 Forbidden，操作不执行

### Requirement: 权限缓存
系统 SHALL 将用户权限列表缓存到 Redis，登录时加载。角色权限变更时主动刷新缓存。

#### Scenario: 权限变更即时生效
- **WHEN** 管理员修改某角色的权限配置
- **THEN** 拥有该角色的所有用户权限缓存立即刷新，下次 API 请求使用新权限

## ADDED Requirements

### Requirement: 权限套餐数据模型
系统 SHALL 定义 `permission_packages` 表存储平台级权限套餐，以及 `package_permissions` 表存储套餐与权限的多对多关联关系。

- `permission_packages`: 存储套餐基本信息，平台全局数据，无 tenant_id
- `package_permissions`: 存储套餐包含的权限，一个套餐可关联多个权限
- 唯一索引 `uk_package_perm(package_id, permission_code)` 防止重复关联

#### Scenario: 查询套餐权限列表
- **WHEN** 平台管理员查询套餐详情
- **THEN** 系统返回套餐基本信息及关联的所有权限列表

#### Scenario: 创建套餐关联权限
- **WHEN** 平台管理员创建套餐并勾选权限
- **THEN** 系统创建 `permission_packages` 记录，并在 `package_permissions` 中插入关联记录

### Requirement: 租户与套餐绑定
系统 SHALL 在 `tenants` 表中存储租户绑定的套餐 `package_id`，并冗余存储 `max_users`（最大用户数）和 `expire_at`（到期时间）。

#### Scenario: 创建企业绑定套餐
- **WHEN** 平台管理员创建企业时选择套餐"专业版"
- **THEN** `tenants.package_id` 关联到专业版套餐，`max_users` 和 `expire_at` 从套餐快照复制

#### Scenario: 更换企业套餐
- **WHEN** 平台管理员将企业套餐更换为"旗舰版"
- **THEN** `tenants.package_id`、`tenants.max_users`、`tenants.expire_at` 同步更新为新套餐数据

### Requirement: 删除套餐约束
已被企业绑定的套餐 SHALL NOT 允许删除。

#### Scenario: 删除已绑定套餐
- **WHEN** 平台管理员尝试删除已被企业绑定的套餐
- **THEN** 系统拒绝删除操作，提示"该套餐已被企业绑定，请先更换企业套餐后再删除"

#### Scenario: 删除未绑定套餐
- **WHEN** 平台管理员删除未被绑定的套餐
- **THEN** 系统逻辑删除套餐记录，同时删除所有 `package_permissions` 关联
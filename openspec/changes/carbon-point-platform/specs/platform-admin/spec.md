## ADDED Requirements

### Requirement: 平台管理员角色体系
平台管理员拥有独立的角色体系，与企业租户角色完全隔离。平台角色分为三级：super_admin（超级管理员）、admin（运营管理员）、viewer（只读管理员）。

#### Scenario: 超级管理员登录
- **WHEN** 超级管理员通过平台后台登录页登录
- **THEN** 系统验证身份，展示完整平台管理功能（企业管理、数据看板、系统管理、套餐管理）

#### Scenario: 运营管理员登录
- **WHEN** 运营管理员（admin 角色）登录
- **THEN** 系统展示企业管理、数据看板、套餐查看功能，不展示管理员账号管理

### Requirement: 企业管理
平台管理员 SHALL 能够查看企业列表、创建企业、编辑企业信息、开通/停用企业。企业列表展示名称、状态、用户数、创建时间、到期时间。

#### Scenario: 查看企业列表
- **WHEN** 平台管理员进入企业管理页面
- **THEN** 系统展示所有企业列表，支持按状态筛选、按名称搜索、分页浏览

#### Scenario: 创建企业
- **WHEN** 平台管理员填写企业名称、Logo、选择套餐、设置用户数上限和到期时间
- **THEN** 系统创建企业租户，自动初始化预设角色和默认规则，生成企业管理员账号

#### Scenario: 停用企业
- **WHEN** 平台管理员停用某企业
- **THEN** 该企业及所有用户立即无法使用系统，但数据保留

### Requirement: 全平台数据看板
平台运营后台 SHALL 展示全平台数据看板（同 reporting spec 中的平台级看板要求）。

#### Scenario: 查看全平台概览
- **WHEN** 平台管理员进入数据看板
- **THEN** 系统展示企业总数、活跃企业数、总用户数、总积分发放量、总兑换量，及趋势图表

### Requirement: 平台配置管理
超级管理员 SHALL 能够管理平台级配置：默认规则模板、功能开关、通知模板。

#### Scenario: 配置默认规则模板
- **WHEN** 平台管理员设置默认规则模板（早中晚三个时段、连续打卡奖励等）
- **THEN** 新创建的企业自动使用此模板初始化规则

### Requirement: 系统管理
超级管理员 SHALL 能够管理平台管理员账号（创建/编辑/禁用）、查看操作日志。

#### Scenario: 创建平台管理员
- **WHEN** 超级管理员创建新管理员账号，设置角色为 admin
- **THEN** 系统创建 platform_admins 记录，新管理员可登录平台后台

#### Scenario: 查看操作日志
- **WHEN** 管理员进入操作日志页面
- **THEN** 系统展示所有平台管理员的操作记录（操作人、操作类型、操作对象、时间、IP）

### Requirement: 平台管理员 API 权限矩阵
平台管理员 API 级权限 SHALL 由 `@RequirePerm` 注解控制，所有 `/platform/**` 接口通过 `PlatformAdminContext` 校验身份。

#### Platform-Level Permission Codes

平台级权限代码独立于企业权限代码，格式为 `platform:module:operation`：

| 权限代码 | 说明 |
|----------|------|
| `platform:tenant:view` | 查看企业列表和详情 |
| `platform:tenant:manage` | 创建、编辑、停用企业 |
| `platform:tenant:package` | 更换企业套餐 |
| `platform:tenant:super-admin` | 分配企业超管用户 |
| `platform:admin:view` | 查看平台管理员列表 |
| `platform:admin:manage` | 创建、编辑、禁用平台管理员 |
| `platform:package:view` | 查看套餐列表和详情 |
| `platform:package:manage` | 创建、编辑、删除套餐 |
| `platform:package:permission` | 管理套餐包含的权限 |
| `platform:report:view` | 查看全平台数据看板 |
| `platform:report:export` | 导出平台数据报表 |
| `platform:config:view` | 查看平台配置 |
| `platform:config:manage` | 修改平台配置 |
| `platform:log:view` | 查看操作日志 |

#### Platform API Permission Matrix

| API 路径 | super_admin | admin | viewer |
|----------|-------------|-------|--------|
| `GET /platform/tenants` | ✓ (platform:tenant:view) | ✓ (platform:tenant:view) | ✓ (platform:tenant:view) |
| `GET /platform/tenants/{id}` | ✓ (platform:tenant:view) | ✓ (platform:tenant:view) | ✓ (platform:tenant:view) |
| `POST /platform/tenants` | ✓ (platform:tenant:manage) | ✗ | ✗ |
| `PUT /platform/tenants/{id}` | ✓ (platform:tenant:manage) | ✗ | ✗ |
| `PUT /platform/tenants/{id}/status` | ✓ (platform:tenant:manage) | ✗ | ✗ |
| `GET /platform/tenants/{id}/package` | ✓ (platform:tenant:view) | ✓ (platform:tenant:view) | ✓ (platform:tenant:view) |
| `PUT /platform/tenants/{id}/package` | ✓ (platform:tenant:package) | ✗ | ✗ |
| `GET /platform/tenants/{tenantId}/users` | ✓ (platform:tenant:super-admin) | ✗ | ✗ |
| `PUT /platform/tenants/{tenantId}/super-admin` | ✓ (platform:tenant:super-admin) | ✗ | ✗ |
| `GET /platform/admins` | ✓ (platform:admin:view) | ✓ (platform:admin:view) | ✗ |
| `POST /platform/admins` | ✓ (platform:admin:manage) | ✗ | ✗ |
| `PUT /platform/admins/{id}` | ✓ (platform:admin:manage) | ✗ | ✗ |
| `PUT /platform/admins/{id}/status` | ✓ (platform:admin:manage) | ✗ | ✗ |
| `GET /platform/packages` | ✓ (platform:package:view) | ✓ (platform:package:view) | ✗ |
| `GET /platform/packages/{id}` | ✓ (platform:package:view) | ✓ (platform:package:view) | ✗ |
| `GET /platform/packages/{id}/permissions` | ✓ (platform:package:view) | ✓ (platform:package:view) | ✗ |
| `POST /platform/packages` | ✓ (platform:package:manage) | ✗ | ✗ |
| `PUT /platform/packages/{id}` | ✓ (platform:package:manage) | ✗ | ✗ |
| `DELETE /platform/packages/{id}` | ✓ (platform:package:manage) | ✗ | ✗ |
| `PUT /platform/packages/{id}/permissions` | ✓ (platform:package:permission) | ✗ | ✗ |
| `GET /platform/dashboard` | ✓ (platform:report:view) | ✓ (platform:report:view) | ✓ (platform:report:view) |
| `GET /platform/reports/*` | ✓ (platform:report:view) | ✓ (platform:report:view) | ✓ (platform:report:view) |
| `GET /platform/reports/export` | ✓ (platform:report:export) | ✓ (platform:report:export) | ✗ |
| `GET /platform/config` | ✓ (platform:config:view) | ✓ (platform:config:view) | ✓ (platform:config:view) |
| `PUT /platform/config` | ✓ (platform:config:manage) | ✗ | ✗ |
| `GET /platform/logs` | ✓ (platform:log:view) | ✓ (platform:log:view) | ✗ |

#### Scenario: viewer 角色绕过前端直接调用管理接口
- **WHEN** viewer 角色管理员绕过前端，直接调用 `POST /platform/admins` 创建管理员
- **THEN** 系统返回 403 Forbidden，后端权限拦截生效

### Requirement: 权限套餐管理
超级管理员 SHALL 能够创建、编辑、删除权限套餐，并将套餐绑定到企业。企业超管角色的权限来源于套餐，不可超出套餐范围。

#### 套餐定义

套餐（Permission Package）是平台定义的权限集合，一个套餐包含多个企业级权限代码。

| 套餐级别 | Code | 说明 |
|----------|------|------|
| 基础版 | `standard` | 基础功能：数据看板、员工管理、规则配置 |
| 专业版 | `professional` | 基础版 + 商品管理、订单管理 |
| 旗舰版 | `enterprise` | 专业版 + 积分运营、报表导出 |

套餐权限示例：

```
基础版 (standard) 包含：
  - enterprise:dashboard:view
  - enterprise:member:list, enterprise:member:create, enterprise:member:edit, enterprise:member:disable
  - enterprise:rule:view, enterprise:rule:create, enterprise:rule:edit, enterprise:rule:delete, enterprise:rule:toggle

专业版 (professional) 在基础版之上增加：
  - enterprise:product:list, enterprise:product:create, enterprise:product:edit, enterprise:product:delete, enterprise:product:toggle, enterprise:product:stock
  - enterprise:order:list, enterprise:order:fulfill, enterprise:order:cancel

旗舰版 (enterprise) 在专业版之上增加：
  - enterprise:point:query, enterprise:point:add, enterprise:point:deduct, enterprise:point:export
  - enterprise:report:view, enterprise:report:export
```

#### Scenario: 创建套餐
- **WHEN** 超级管理员创建新套餐，填写名称、描述，选择包含的权限
- **THEN** 系统创建 `permission_packages` 记录和 `package_permissions` 关联记录

#### Scenario: 套餐绑定到企业
- **WHEN** 平台管理员在创建企业时选择套餐
- **THEN** 系统创建企业租户，自动初始化超管角色（权限 = 套餐全部权限快照）

#### Scenario: 更换企业套餐
- **WHEN** 平台管理员更换企业套餐（如从基础版升级到专业版）
- **THEN** 系统更新超管角色权限为新套餐全部权限；运营/自定义角色的越权权限被移除（与新套餐取交集）

#### Scenario: 删除有企业绑定的套餐
- **WHEN** 超级管理员尝试删除已被企业绑定的套餐
- **THEN** 系统阻止删除，提示先更换企业的套餐

### Requirement: 平台与企业数据边界
平台管理员与企业管理员的数据操作范围严格隔离，不可跨边界访问。

#### 数据边界定义

| 数据维度 | 平台管理员可操作 | 企业管理员可操作 |
|----------|-----------------|-----------------|
| 企业租户元数据 | 创建/编辑/停用/查看所有企业 | 仅查看自己企业 |
| 平台管理员账号 | 创建/编辑/禁用/查看 | 不可见、不可操作 |
| 套餐定义 | 创建/编辑/删除/查看所有套餐 | 仅查看自己企业的套餐 |
| 企业超管用户 | 指定/变更企业超管 | 不可操作 |
| 企业普通用户 | 仅查看数量汇总 | 查看/管理自己企业用户 |
| 打卡记录 | 查看全平台汇总 | 查看自己企业的记录 |
| 积分账户 | 查看全平台汇总 | 管理自己企业的积分 |
| 虚拟商品 | 不可见 | 仅管理自己企业的商品 |
| 兑换订单 | 查看全平台汇总 | 仅管理自己企业的订单 |
| 操作日志 | 查看平台管理员操作 | 查看自己企业的操作 |

#### Scenario: 企业管理员尝试访问平台 API
- **WHEN** 企业管理员 Token 调用 `GET /platform/tenants`
- **THEN** 系统返回 401 Unauthorized（平台 API 校验 PlatformAdminContext，不存在则拒绝）

#### Scenario: 平台管理员尝试访问企业 API（跨租户）
- **WHEN** 平台管理员调用 `GET /api/enterprise/members`（无 tenantId 参数）
- **THEN** 系统返回 403 Forbidden（企业 API 通过 TenantLineInnerInterceptor 注入 tenant_id，平台管理员 Token 无 tenant_id 上下文）

#### Scenario: 平台管理员访问单个企业数据
- **WHEN** 平台管理员调用 `GET /platform/tenants/{tenantId}/users`
- **THEN** 系统通过 `@InterceptorIgnore` 绕过 TenantLineInnerInterceptor，使用路径中的 tenantId 查询，返回该企业的用户列表

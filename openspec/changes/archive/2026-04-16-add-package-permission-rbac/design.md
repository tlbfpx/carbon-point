## Context

Carbon Point 是多租户 SaaS 碳积分打卡平台，原有设计已经定义了完整的 RBAC 业务规则：
- 企业注册后默认账号为超级管理员
- 超级管理员角色权限来源于购买的权限套餐，不可编辑
- 运营/自定义角色权限必须为超级管理员权限的子集（即套餐权限子集）
- 套餐变更后，超管权限同步更新，子角色权限自动收缩

但当前设计缺少完整的数据库表结构：
1. 缺少 `permission_packages` 表存储平台定义的权限套餐
2. 缺少 `package_permissions` 关联表存储套餐与权限的多对多关系
3. `tenants` 表缺少与套餐的绑定关联字段

本设计补充数据模型缺口，使整个 RBAC 模型完整可实现。

## Goals / Non-Goals

**Goals:**
- 补充权限套餐和套餐权限关联两张表的完整设计
- 定义 tenants 表与套餐的绑定关系
- 保证数据模型符合现有业务规则（套餐定义 → 企业绑定 → 超管快照 → 子角色约束）
- 支持套餐变更时的数据一致性（超管权限更新 + 子角色收缩）

**Non-Goals:**
- 不修改现有业务规则和流程
- 不实现 API 和前端功能，仅定义数据模型
- 不改变 RBAC 三级权限控制机制（菜单+按钮+API）

## Decisions

### 1. 数据模型：独立权限套餐表 + 关联表，租户表绑定套餐

**选择**:
- `permission_packages`: 存储套餐定义（平台级数据，无 tenant_id）
- `package_permissions`: 套餐与权限的多对多关联（平台级数据）
- `tenants` 表增加 `package_id` 外键绑定套餐，并存储 `max_users` 和 `expire_at` 快照

**理由**:
- 套餐是平台定义的模板，多个企业可绑定同一个套餐，复用定义减少冗余
- 绑定关系在 tenants 表，一个企业仅绑定一个套餐，符合 SaaS 售卖模型
- `max_users` 和 `expire_at` 做冗余存储（快照），避免联表查询，提高性能
- 套餐权限变更不影响已有企业（企业超管权限是创建时快照），符合设计原则

**备选方案**:
- 套餐按租户复制：每个企业一份套餐拷贝 → 数据冗余，套餐统一更新麻烦
- 多套餐绑定：一个企业可绑定多个套餐 → 需求不支持，每个企业只买一个套餐

### 2. 超管权限存储：快照存储在 role_permissions，而非动态计算

**选择**: 企业创建时，根据套餐权限一次性复制到 `role_permissions` 作为快照，后续变更套餐手动触发更新。

**理由**:
- 符合原有设计中"超管角色权限 = 套餐权限快照"的业务规则
- 权限查询时不需要联表计算，性能更好
- 允许企业在创建后，即使套餐定义变更，企业权限保持不变（除非主动更换套餐）
- 变更套餐时只需重新同步超管角色权限，业务逻辑清晰

**备选方案**:
- 动态合并：每次查询时从套餐读取 → 性能差，且不支持企业独立快照

### 3. 数据隔离：权限套餐是平台级数据，租户查询无需 tenant_id

**选择**: `permission_packages` 和 `package_permissions` 不包含 `tenant_id` 字段，属于平台全局数据。

**理由**:
- 套餐由平台管理员定义，对所有企业可见（企业仅能看到自己绑定的套餐信息，但不修改定义）
- 符合当前"平台管理后台 + 企业管理后台"权限分离架构
- 平台管理员查询绕过租户拦截器，企业管理员仅能查看自己绑定套餐

## 表结构设计

### permission_packages（权限套餐表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | PK 自增 |
| package_code | VARCHAR(50) | 套餐编码唯一索引: standard/professional/enterprise |
| package_name | VARCHAR(100) | 套餐名称 |
| description | VARCHAR(500) | 描述 |
| max_users | INT | 最大用户数限制 |
| is_deleted | TINYINT | 0-否 1-是 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### package_permissions（套餐权限关联表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | PK 自增 |
| package_id | BIGINT | FK → permission_packages.id |
| permission_code | VARCHAR(100) | FK → permissions.permission_code |
| created_at | DATETIME | 创建时间 |
| UK(package_id, permission_code) | | 唯一索引 |

### tenants（企业租户表 - 变更）

原有表基础上增加字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| package_id | BIGINT | FK → permission_packages.id，绑定的套餐 |
| max_users | INT | 最大用户数（快照，冗余） |
| expire_at | DATETIME | 套餐到期时间，可为空 |

### roles 角色表（原有确认）

已有 `role_type` 区分 `super_admin/operator/custom`，满足要求：
- `super_admin`: 权限来自套餐快照，不可编辑删除
- `operator/custom`: 权限由超管分配，必须为超管权限子集

## Risks / Trade-offs

- **[套餐定义变更不自动同步]** → 业务需求要求，企业权限是创建时快照，变更需平台管理员手动操作更换套餐，符合设计
- **[max_users 冗余存储]** → 空间换时间，避免查询时联表，租户查询频繁，性能收益大于存储成本
- **[删除套餐被企业绑定]** → 业务规则已经定义：禁止删除已绑定套餐，必须先更换企业套餐，解决约束

## Migration Plan

1. 新增两张表 `permission_packages` 和 `package_permissions`
2. `tenants` 表 DDL 增加字段 `package_id`、`max_users`、`expire_at`
3. 初始化预设套餐数据（基础版/专业版/旗舰版）
4. 初始化预设套餐权限关联数据

回滚：删除两张表，回滚 `tenants` 表 DDL 即可
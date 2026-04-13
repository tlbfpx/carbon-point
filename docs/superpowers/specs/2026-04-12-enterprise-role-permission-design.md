# 企业角色权限设计方案

## 1. 背景与目标

### 现状问题
- 当前系统允许企业随意创建角色，权限完全自管理
- 平台层没有对企业的权限边界进行控制
- 企业超管权限来源于企业自己，无法被平台约束

### 设计目标
1. **平台定义套餐边界**：平台管理员创建权限套餐，每个企业被分配一个套餐
2. **企业超管权限来自套餐**：企业超管角色的权限由平台通过套餐授予，不可超出套餐范围
3. **运营/自定义角色由超管分配**：企业超管在套餐权限范围内，为运营和自定义角色分配权限
4. **套餐升级不自动赋权**：企业升级套餐时，运营已有权限不变，新权限需超管手动分配

---

## 2. 核心概念

| 概念 | 说明 |
|------|------|
| **套餐 (Permission Package)** | 平台管理员定义的权限集合，一个套餐包含多个权限 |
| **企业套餐绑定 (TenantPackage)** | 记录某企业绑定到哪个套餐，以及套餐的版本快照 |
| **企业超管角色 (SuperAdminRole)** | 平台在企业创建时自动生成的角色，直接复制套餐全部权限，不可编辑 |
| **企业运营角色 (OperatorRole)** | 超管创建的预设角色，权限由超管在套餐范围内分配 |
| **企业自定义角色 (CustomRole)** | 超管自行创建的角色，权限 subset of 超管 |

---

## 3. 套餐管理（平台管理员）

### 3.1 数据模型

**新增表：`permission_packages`**
```sql
CREATE TABLE permission_packages (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    code            VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    description     VARCHAR(255),
    status          TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=启用 0=禁用',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**新增表：`package_permissions`**
```sql
CREATE TABLE package_permissions (
    package_id      BIGINT NOT NULL,
    permission_code VARCHAR(60) NOT NULL,
    PRIMARY KEY (package_id, permission_code),
    FOREIGN KEY (package_id) REFERENCES permission_packages(id) ON DELETE CASCADE
);
```

**修改表：`tenants`**
```sql
-- 废弃 package_type 列（原有 free/pro/enterprise 区分），迁移逻辑见下文
ALTER TABLE tenants ADD COLUMN package_id BIGINT AFTER enterprise_name;
ALTER TABLE tenants ADD CONSTRAINT fk_tenant_package FOREIGN KEY (package_id) REFERENCES permission_packages(id);
```

**现有 `package_type` 字段迁移方案：**
- `package_type = 'free'` → 平台创建一个"免费版"套餐（仅 dashboard:view 权限），绑定到该企业
- `package_type = 'pro'` → 平台创建一个"专业版"套餐并绑定
- `package_type = 'enterprise'` → 平台创建一个"旗舰版"套餐并绑定
- 迁移后 `package_type` 列保留，但标注为废弃字段，前端不再展示

**修改表：`roles`**
```sql
ALTER TABLE roles ADD COLUMN role_type ENUM('super_admin', 'operator', 'custom') NOT NULL DEFAULT 'custom';
ALTER TABLE roles ADD COLUMN is_editable TINYINT(1) NOT NULL DEFAULT 1 COMMENT '超管角色不可编辑删除';
```

**现有 `is_preset` 字段迁移方案：**
- `is_preset = true` → `role_type = 'super_admin'`，`is_editable = 0`
- `is_preset = false` → `role_type = 'custom'`，`is_editable = 1`
- 迁移后 `is_preset` 列保留，标注为废弃字段

### 3.2 套餐与权限关系

权限代码沿用现有 `permissions` 表的 code，使用 `module:operation` 格式。

套餐权限示例：
```
标准版套餐包含：
  - enterprise:dashboard:view
  - enterprise:member:list, enterprise:member:create, enterprise:member:edit, enterprise:member:disable
  - enterprise:rule:view, enterprise:rule:create, enterprise:rule:edit

专业版套餐在标准版基础上增加：
  - enterprise:product:*
  - enterprise:order:list, enterprise:order:fulfill, enterprise:order:cancel

旗舰版套餐在专业版基础上增加：
  - enterprise:point:*
  - enterprise:report:view, enterprise:report:export
```

### 3.3 平台管理员套餐管理 API

| 方法 | 路径 | 说明 | 权限要求 |
|------|------|------|---------|
| GET | /platform/packages | 套餐列表 | `platform:package:view` |
| POST | /platform/packages | 创建套餐 | `platform:package:manage` |
| PUT | /platform/packages/{id} | 编辑套餐 | `platform:package:manage` |
| DELETE | /platform/packages/{id} | 删除套餐（检查是否有企业绑定） | `platform:package:manage` |
| GET | /platform/packages/{id}/permissions | 获取套餐包含的权限 | `platform:package:view` |
| PUT | /platform/packages/{id}/permissions | 更新套餐包含的权限 | `platform:package:manage` |

> 所有 `/platform/packages/**` 接口均需平台管理员身份，通过 `PlatformAdminContext` 校验。

### 3.4 企业绑定套餐 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /platform/tenants/{id}/package | 获取企业当前套餐 |
| PUT | /platform/tenants/{id}/package | 更换企业套餐（触发角色重建） |

---

## 4. 企业角色管理

### 4.1 角色类型

| 角色类型 | role_type | 是否可删除 | 权限来源 | 是否可编辑权限 |
|----------|-----------|------------|----------|----------------|
| 超管 | `super_admin` | 否 | 来自套餐（快照） | 否 |
| 运营 | `operator` | 是 | 由超管分配 | 是 |
| 自定义 | `custom` | 是 | 由超管分配 | 是 |

**超管角色特性：**
- 在企业创建时由平台自动创建
- 权限 = 套餐全部权限的快照（绑定时的套餐权限）
- 不可修改权限，不可删除
- 不可更改绑定的用户（由平台管理员在平台侧控制）

**运营/自定义角色特性：**
- 由企业超管创建
- 权限 subset of 超管权限
- 可分配给企业任意成员

### 4.2 企业创建时的角色初始化

当平台管理员创建企业时，后端自动执行：

1. 根据 `tenants.package_id` 加载套餐包含的权限 codes
2. 创建 `super_admin` 角色，复制所有套餐权限，`is_editable=0`
3. 创建初始超管用户（如有指定）

```
POST /platform/tenants → 创建企业 + 初始化超管角色
```

### 4.3 套餐变更时的角色重建

当企业更换套餐时（如 标准版 → 专业版，或旗舰版 → 标准版降级）：

1. 查询新套餐的权限 codes
2. 更新 `super_admin` 角色的权限为新套餐全部权限
3. **运营/自定义角色**：清理超出新套餐范围的权限（与新套餐权限取交集）
   - 任意套餐变更：`operator_permissions = operator_permissions ∩ new_package_permissions`
   - 新套餐多出的权限：运营角色默认不获得，待超管手动分配
4. 记录套餐变更日志（含变更前后套餐ID、操作人、时间）

```
PUT /platform/tenants/{id}/package → 更新超管角色权限 + 清理运营越权权限
```

> **安全模型说明**：运营角色权限始终 subset of 超管权限，任何套餐变更时强制取交集，保证不变体被破坏。

### 4.4 企业角色管理 API（企业侧）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/roles | 角色列表（返回 role_type） |
| POST | /api/roles | 创建自定义角色 |
| PUT | /api/roles/{id} | 编辑自定义角色 |
| DELETE | /api/roles/{id} | 删除自定义角色（检查是否有人使用） |
| GET | /api/roles/{id}/permissions | 获取某角色的权限 |
| PUT | /api/roles/{id}/permissions | 更新某角色的权限（仅限 operator/custom） |
| GET | /api/roles/available | 获取当前超管可分配的权限列表（用于角色编辑时的权限树） |

**权限校验逻辑：**
- 运营/自定义角色的权限变更时，后端校验：变更后的权限必须 subset of `super_admin` 的权限
- 尝试授予超管未拥有的权限 → 返回 403
- `RoleServiceImpl.assignUsers()` 需检查目标角色 `role_type`：`super_admin` 不允许从企业侧分配

### 4.5 超管用户分配（平台侧专属）

超管角色的用户分配由平台管理员控制，企业侧不可操作。

| 方法 | 路径 | 说明 |
|------|------|------|
| PUT | /platform/tenants/{tenantId}/super-admin | 指定企业的超管用户 |
| GET | /platform/tenants/{tenantId}/users | 查询企业用户列表及角色绑定 |

**实现约束：**
- `role_type = 'super_admin'` 的用户分配走平台侧 API
- `RoleService.assignUsers()` 内部增加 `role_type` 校验：禁止将 `super_admin` 角色分配给企业侧调用
- Redis 权限缓存：套餐变更时刷新该企业所有用户的缓存（含运营用户）

---

## 5. 前端改动

### 5.1 平台管理员侧

**套餐管理页面**（新增）：`/platform/config`

- 套餐列表（名称、描述、包含权限数量、状态、绑定企业数）
- 创建/编辑套餐：选择权限（树形选择器，按 module 分组）
- 查看某套餐详情：权限列表 + 绑定企业列表
- 删除套餐：检查是否有企业绑定，有则提示先解绑

**企业管理页面**（改造）：`/platform/enterprises`

- 企业列表新增"套餐"列，显示当前套餐名称
- 企业详情/编辑：可更换套餐（下拉选择）
- 套餐升级后显示确认提示（说明运营角色权限不受影响）

### 5.2 企业管理员侧

**角色管理页面**（改造）：`/enterprise/roles`

- 区分显示三种角色类型
- 超管角色：**只读**，显示"平台配置，不可编辑"，显示权限数量（不可点击权限详情）
- 运营角色：可编辑权限、可删除
- 自定义角色：可创建/编辑/删除
- 创建自定义角色：输入名称 + 描述 + 权限树
- 编辑角色权限：权限树，已选中的权限中，超管没有的权限显示为禁用状态

**权限树交互：**
- 根节点 = module 名称，不可选中
- 子节点 = operations，可多选
- 超管未拥有的权限：展示为禁用（checkbox 灰色），hover 提示"平台未授权"
- 展开/收起状态在各 Tab 间共享

### 5.3 菜单动态化（任务 5.8 补全）

**现状：** 左侧菜单是静态 hardcoded 数组，不受权限控制

**改动：** 在 `authStore` 中增加 `permissions` 字段（从登录响应或 /api/permissions/my 获取），菜单渲染时通过显式权限映射过滤：

```tsx
// 菜单权限元数据（显式映射，避免字符串推导）
const MENU_PERMISSION_MAP = {
  '/enterprise/dashboard': 'enterprise:dashboard:view',
  '/enterprise/members': 'enterprise:member:list',
  '/enterprise/rules': 'enterprise:rule:view',
  '/enterprise/products': 'enterprise:product:list',
  '/enterprise/orders': 'enterprise:order:list',
  '/enterprise/points': 'enterprise:point:query',
  '/enterprise/reports': 'enterprise:report:view',
  '/enterprise/roles': 'enterprise:role:list',
};

const visibleMenuItems = EnterpriseMenuItems.filter(item => {
  const perm = MENU_PERMISSION_MAP[item.key];
  return !perm || permissions.includes(perm);
});
```

**按钮级权限指令（v-permission）**（任务 5.8 补全）：

```tsx
// 假设实现一个 usePermission hook
const { hasPermission } = usePermission();

// 使用方式
{hasPermission('enterprise:member:create') && <Button>新增员工</Button>}
```

---

## 6. 数据流

### 6.1 企业创建时序

```
平台管理员提交创建企业（包含 package_id）
  → TenantService.createTenant()
    → PackageService.getPackagePermissions(packageId)
    → RoleService.createSuperAdminRole(tenantId, permissions)
    → 创建企业根用户并绑定 super_admin 角色
  → 返回企业信息
```

### 6.2 企业超管分配运营权限时序

```
企业超管提交：更新运营角色权限
  → RoleService.updateRolePermissions(roleId, newPermissions)
    → 获取 role.role_type（必须是 operator 或 custom）
    → 获取 super_admin 角色的 permissions
    → 校验：newPermissions ⊆ super_admin.permissions
    → 更新 role_permissions 表
    → 刷新 Redis 缓存
  → 返回成功
```

### 6.3 套餐升级时序

```
平台管理员提交：更换企业套餐（tenantId, newPackageId）
  → TenantService.updateTenantPackage(tenantId, newPackageId)
    → 获取新套餐的 permissions
    → 更新 super_admin 角色的权限（新套餐全部权限）
    → 记录套餐变更日志
  → 返回成功
```

---

## 7. 数据库变更汇总

| 操作 | 表 | 变更内容 |
|------|-----|---------|
| 新增 | `permission_packages` | 套餐主表 |
| 新增 | `package_permissions` | 套餐-权限关联表 |
| 修改 | `tenants` | 增加 package_id 外键 |
| 修改 | `roles` | 增加 role_type, is_editable 字段 |
| 修改 | `permissions` | 无变更，沿用现有 |

---

## 8. 实施计划

### Phase 1: 数据模型 + 平台侧 API
1. 新增 `permission_packages`、`package_permissions` 表
2. 实现套餐 CRUD API（含 `@RequirePerm` 权限拦截）
3. 修改 `tenants`、`roles` 表结构（含 `package_type` 和 `is_preset` 迁移脚本）
4. **改造 `PlatformTenantServiceImpl.createTenant()`**：在企业创建时调用 `RoleService.createSuperAdminRole()` 初始化超管角色（现有代码第 121 行有 TODO 标注，需在此阶段实现）
5. 新增平台侧超管用户分配 API：`PUT /platform/tenants/{tenantId}/super-admin`
6. 套餐管理页面（平台侧）

### Phase 2: 企业侧 API 改造
1. 修改角色权限变更 API，增加 subset 校验
2. 新增 `/api/roles/available` 接口（返回超管拥有的权限）
3. 实现套餐升级时的角色重建逻辑

### Phase 3: 前端改造
1. 平台侧：套餐管理 UI + 企业套餐更换 UI
2. 企业侧：角色管理 UI 改造（区分三种角色、权限树、禁用状态）
3. 动态菜单 + 按钮级权限控制

---

## 9. 边界情况处理

| 场景 | 处理方式 |
|------|---------|
| 删除套餐时有企业绑定 | 阻止删除，提示先更换企业套餐 |
| 运营角色被授予超管未拥有的权限 | 后端返回 403，前端提示"权限超出套餐范围" |
| 企业超管删除自己唯一的角色 | 运营角色至少保留一个时可删除；超管角色不可删除 |
| 套餐降级（旗舰版 → 标准版） | 超管角色权限收缩到新套餐；运营超出范围的权限自动移除（取交集）；降级后运营可用权限始终 ⊆ 新套餐 |
| 超管想分配更多权限给自己 | 不允许，超管权限由平台控制，企业侧不可修改 |

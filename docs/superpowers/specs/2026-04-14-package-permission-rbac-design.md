# 权限套餐 RBAC 实现设计

> **状态**: 已讨论确认
> **日期**: 2026-04-14
> **讨论次数**: 7 轮全部完成

## 1. 概述

本设计文档详细规定权限套餐（Permission Package）RBAC 体系的实现方案，包括数据库表结构、后端服务逻辑、API 设计、缓存策略、前端渲染规则。

### 1.1 背景

Carbon Point 是多租户 SaaS 碳积分打卡平台，需要实现以下业务规则：
- 企业注册后默认账号为超级管理员
- 超级管理员角色权限来源于购买的权限套餐（快照），不可编辑
- 运营/自定义角色权限必须为超级管理员权限的子集
- 套餐变更后，超管权限同步更新，子角色权限自动收缩

### 1.2 设计目标

| 目标 | 说明 |
|------|------|
| 数据模型完整 | 补充 `permission_packages`、`package_permissions` 表设计 |
| 权限边界清晰 | `platform:*` 和 `enterprise:*` 两套权限体系完全隔离 |
| 变更一致性 | 套餐变更时保证超管权限更新和子角色权限收缩的事务性 |
| 性能可控 | 混合缓存方案 + 批量操作优化 |
| 前端可预期 | 信任服务端返回的最终权限，前端不做二次校验 |

---

## 2. 数据模型

### 2.1 新增表结构

#### permission_packages（权限套餐表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | PK，自增 |
| package_code | VARCHAR(50) | 套餐编码，唯一索引（standard/professional/enterprise） |
| package_name | VARCHAR(100) | 套餐名称 |
| description | VARCHAR(500) | 描述 |
| max_users | INT | 最大用户数限制 |
| status | TINYINT | 1=启用，0=禁用 |
| is_deleted | TINYINT | 0=正常，1=删除 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

```sql
CREATE TABLE permission_packages (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    package_code    VARCHAR(50) NOT NULL UNIQUE COMMENT '套餐编码',
    package_name    VARCHAR(100) NOT NULL COMMENT '套餐名称',
    description     VARCHAR(500) COMMENT '描述',
    max_users       INT NOT NULL DEFAULT 50 COMMENT '最大用户数',
    status          TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1=启用 0=禁用',
    is_deleted      TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限套餐表';
```

#### package_permissions（套餐权限关联表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | PK，自增 |
| package_id | BIGINT | FK → permission_packages.id |
| permission_code | VARCHAR(60) | 权限编码 |
| created_at | DATETIME | 创建时间 |

**约束**: UNIQUE(package_id, permission_code) 防止重复关联

```sql
CREATE TABLE package_permissions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    package_id      BIGINT NOT NULL COMMENT '套餐ID',
    permission_code VARCHAR(60) NOT NULL COMMENT '权限编码',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_package_permission (package_id, permission_code),
    INDEX idx_package_id (package_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐权限关联表';
```

### 2.2 租户表变更

在 `tenants` 表中新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| package_id | BIGINT | FK → permission_packages.id，当前绑定套餐 |
| expire_at | DATETIME | 套餐到期时间（可为 NULL 表示永久） |

```sql
ALTER TABLE tenants ADD COLUMN package_id BIGINT COMMENT '绑定的套餐ID';
ALTER TABLE tenants ADD COLUMN expire_at DATETIME COMMENT '套餐到期时间';

-- 添加外键约束
ALTER TABLE tenants ADD CONSTRAINT fk_tenant_package FOREIGN KEY (package_id)
    REFERENCES permission_packages(id);
```

### 2.3 现有表确认

#### roles（角色表）

现有表结构无需变更，`role_type` 字段区分角色类型：

| role_type | 说明 | 权限来源 | 是否可编辑 |
|-----------|------|---------|-----------|
| super_admin | 超级管理员 | 来自套餐快照 | 否 |
| operator | 运营 | 由超管分配 | 是 |
| custom | 自定义 | 由超管分配 | 是 |

#### role_permissions（角色权限关联表）

现有表无需变更，存储角色与权限的关联关系。

---

## 3. 后端服务设计

### 3.1 子角色越权校验

**校验位置**: 后端 API（真正的安全边界），前端不做强校验

**校验流程**:

```
1. 调用者必须是该租户的超管（platform:enterprise:manage 或 tenant:super_admin）
2. 目标角色必须是 operator 或 custom（不能是 super_admin）
3. 要添加的权限必须在企业的套餐权限列表中
4. 套餐权限列表从 package_permissions 表实时查询
```

**服务方法**:

```java
// RolePermissionService.java

/**
 * 为子角色添加权限（含套餐范围校验）
 */
public void addPermissionToRole(Long requesterId, Long tenantId, Long roleId, String permissionCode) {
    // 1. 校验调用者是该租户的超管
    User requester = userService.getById(requesterId);
    if (!permissionService.isSuperAdmin(tenantId, requesterId)) {
        throw new BusinessException(403, "只有超级管理员可以管理角色权限");
    }

    // 2. 目标角色不能是超管
    Role targetRole = roleService.getById(roleId);
    if (targetRole.isSuperAdmin()) {
        throw new BusinessException(403, "超级管理员权限来源于企业套餐，不可编辑");
    }

    // 3. 目标角色必须属于该租户
    if (!targetRole.getTenantId().equals(tenantId)) {
        throw new BusinessException(403, "无权操作该角色");
    }

    // 4. 校验权限在套餐范围内（实时查询）
    List<String> packagePermissions = packageService.getPermissionCodes(tenantId);
    if (!packagePermissions.contains(permissionCode)) {
        throw new BusinessException(403, "权限超出企业套餐范围，无法添加");
    }

    // 5. 添加权限
    rolePermissionMapper.insert(new RolePermission(roleId, permissionCode));

    // 6. 刷新该角色所有用户的权限缓存
    permissionCacheService.refreshByRoleId(roleId);
}

/**
 * 从子角色删除权限（不校验套餐范围）
 */
public void removePermissionFromRole(Long requesterId, Long roleId, String permissionCode) {
    // 1. 校验调用者是该租户的超管
    // ...

    // 2. 目标角色不能是超管
    // ...

    // 3. 删除权限（不校验套餐范围）
    rolePermissionMapper.delete(new RolePermission(roleId, permissionCode));

    // 4. 刷新缓存
    permissionCacheService.refreshByRoleId(roleId);
}
```

### 3.2 套餐变更权限同步

**触发场景**: 平台管理员调用 `PUT /platform/tenants/{id}/package`

**核心逻辑**:
1. 更新租户套餐信息
2. 重建超管角色权限（覆盖为新套餐全部权限）
3. 收缩所有子角色权限（与新套餐取交集）

**事务设计**:

```java
// PackageService.java

@Transactional(rollbackFor = Exception.class)
public PackageChangeResult changeTenantPackage(Long tenantId, Long newPackageId) {
    Tenant tenant = tenantMapper.selectById(tenantId);

    // 幂等检查
    if (tenant.getPackageId().equals(newPackageId)) {
        return PackageChangeResult.noChange();
    }

    Package newPackage = packageMapper.selectById(newPackageId);

    // 1. 更新租户套餐信息
    Long oldPackageId = tenant.getPackageId();
    tenant.setPackageId(newPackageId);
    tenant.setMaxUsers(newPackage.getMaxUsers());
    tenant.setExpireAt(newPackage.getExpireAt());
    tenantMapper.updateById(tenant);

    // 2. 获取新套餐权限列表
    List<String> newPackagePerms = packagePermissionMapper
        .selectPermCodesByPackageId(newPackageId);

    // 3. 重建超管角色权限
    Role superAdminRole = roleService.getSuperAdminRole(tenantId);
    rolePermissionMapper.deleteByRoleId(superAdminRole.getId());
    batchInsertRolePermissions(superAdminRole.getId(), newPackagePerms);

    // 4. 收缩子角色权限
    List<Role> subRoles = roleService.getSubRoles(tenantId); // operator + custom
    List<SubRoleImpact> impacts = shrinkSubRolePermissions(subRoles, newPackagePerms);

    // 5. 刷新缓存
    List<Long> affectedRoleIds = new ArrayList<>();
    affectedRoleIds.add(superAdminRole.getId());
    affectedRoleIds.addAll(subRoles.stream().map(Role::getId).toList());
    permissionCacheService.refreshByRoleIds(affectedRoleIds);

    // 6. 记录操作日志
    operationLogService.logPackageChange(tenantId, oldPackageId, newPackageId);

    return new PackageChangeResult(oldPackageId, newPackageId, superAdminRole.getId(), impacts);
}

/**
 * 收缩子角色权限（批量操作）
 */
private List<SubRoleImpact> shrinkSubRolePermissions(List<Role> subRoles, List<String> newPackagePerms) {
    List<SubRoleImpact> impacts = new ArrayList<>();

    if (subRoles.isEmpty()) {
        return impacts;
    }

    // 一次性获取所有子角色的当前权限
    List<Long> subRoleIds = subRoles.stream().map(Role::getId).toList();
    Map<Long, List<String>> rolePermsMap = rolePermissionMapper.selectPermCodesByRoleIds(subRoleIds);

    // 批量删除和插入
    List<RolePermission> toDelete = new ArrayList<>();
    List<RolePermission> toInsert = new ArrayList<>();
    List<Long> affectedRoleIds = new ArrayList<>();

    for (Role subRole : subRoles) {
        List<String> currentPerms = rolePermsMap.getOrDefault(subRole.getId(), Collections.emptyList());
        List<String> validPerms = currentPerms.stream()
            .filter(newPackagePerms::contains) // 交集
            .toList();

        if (validPerms.size() < currentPerms.size()) {
            affectedRoleIds.add(subRole.getId());
            List<String> removedPerms = currentPerms.stream()
                .filter(p -> !validPerms.contains(p))
                .toList();

            for (String perm : currentPerms) {
                if (!validPerms.contains(perm)) {
                    toDelete.add(new RolePermission(subRole.getId(), perm));
                }
            }

            impacts.add(new SubRoleImpact(subRole.getId(), subRole.getName(), removedPerms));
        }
    }

    // 批量删除越权权限
    if (!toDelete.isEmpty()) {
        rolePermissionMapper.deleteBatch(toDelete);
    }

    return impacts;
}
```

### 3.3 套餐 CRUD 约束

```java
// PackageService.java

/**
 * 删除套餐（需校验无企业绑定）
 */
public void deletePackage(Long packageId) {
    // 1. 校验是否有企业绑定该套餐
    long bindingCount = tenantMapper.countByPackageId(packageId);
    if (bindingCount > 0) {
        throw new BusinessException(400, "该套餐已被企业绑定，请先更换企业套餐后再删除");
    }

    // 2. 逻辑删除套餐
    packageMapper.updateIsDeleted(packageId, 1);

    // 3. 删除套餐权限关联（物理删除）
    packagePermissionMapper.deleteByPackageId(packageId);
}

/**
 * 创建套餐
 */
public Long createPackage(CreatePackageDTO dto) {
    // 1. 校验编码唯一
    if (packageMapper.existsByPackageCode(dto.getPackageCode())) {
        throw new BusinessException(400, "套餐编码已存在");
    }

    // 2. 创建套餐
    PermissionPackage pkg = new PermissionPackage();
    pkg.setPackageCode(dto.getPackageCode());
    pkg.setPackageName(dto.getPackageName());
    pkg.setDescription(dto.getDescription());
    pkg.setMaxUsers(dto.getMaxUsers());
    pkg.setStatus(1);
    packageMapper.insert(pkg);

    // 3. 插入权限关联
    if (dto.getPermissionCodes() != null && !dto.getPermissionCodes().isEmpty()) {
        List<PackagePermission> perms = dto.getPermissionCodes().stream()
            .map(code -> new PackagePermission(pkg.getId(), code))
            .toList();
        packagePermissionMapper.batchInsert(perms);
    }

    return pkg.getId();
}

/**
 * 更新套餐权限（不影响已绑定企业的权限）
 */
public void updatePackagePermissions(Long packageId, List<String> permissionCodes) {
    // 1. 删除旧权限关联
    packagePermissionMapper.deleteByPackageId(packageId);

    // 2. 插入新权限关联
    if (permissionCodes != null && !permissionCodes.isEmpty()) {
        List<PackagePermission> perms = permissionCodes.stream()
            .map(code -> new PackagePermission(packageId, code))
            .toList();
        packagePermissionMapper.batchInsert(perms);
    }

    // 注意：此变更不影响已绑定企业的超管权限快照
    // 新企业创建时会使用新的套餐权限定义
}
```

---

## 4. API 设计

### 4.1 套餐管理 API

| API | 方法 | 路径 | 说明 |
|-----|------|------|------|
| 套餐列表 | GET | `/platform/packages` | 分页查询套餐 |
| 套餐详情 | GET | `/platform/packages/{id}` | 含权限列表 |
| 创建套餐 | POST | `/platform/packages` | 含权限列表 |
| 编辑套餐 | PUT | `/platform/packages/{id}` | 不含权限 |
| 删除套餐 | DELETE | `/platform/packages/{id}` | 需校验无绑定 |
| 套餐权限 | GET | `/platform/packages/{id}/permissions` | 获取权限列表 |
| 更新权限 | PUT | `/platform/packages/{id}/permissions` | 更新权限配置 |

### 4.2 企业套餐 API

| API | 方法 | 路径 | 说明 |
|-----|------|------|------|
| 企业详情 | GET | `/platform/tenants/{id}` | 含当前套餐信息 |
| 更换套餐 | PUT | `/platform/tenants/{id}/package` | 含权限同步 |

### 4.3 请求响应示例

**更换套餐响应**:

```json
// PUT /platform/tenants/{id}/package
// Response: 200 OK
{
  "code": 200,
  "message": "套餐更换成功",
  "data": {
    "tenantId": 1,
    "oldPackageId": 2,
    "newPackageId": 3,
    "superAdminRoleId": 10,
    "affectedSubRoles": [
      {
        "roleId": 11,
        "roleName": "运营",
        "removedPermissions": ["enterprise:point:add", "enterprise:report:export"]
      },
      {
        "roleId": 12,
        "roleName": "市场专员",
        "removedPermissions": []
      }
    ]
  }
}
```

**幂等响应**:

```json
// PUT /platform/tenants/{id}/package
// 如果已经是目标套餐
{
  "code": 200,
  "message": "套餐已是目标版本，无需变更",
  "data": null
}
```

---

## 5. 缓存策略

### 5.1 缓存 Key 设计

**混合方案**：角色维度 + 用户维度

```
perm:role:{roleId}     → 角色权限列表 ["enterprise:member:list", ...]
perm:user:{tenantId}:{userId} → 用户最终权限（所有角色权限并集）
```

### 5.2 缓存刷新规则

| 触发场景 | 刷新范围 |
|---------|---------|
| 套餐升级 | 该企业所有用户（超管权限更新 + 可能新增可用权限） |
| 套餐降级 | 该企业所有用户（超管权限更新 + 子角色越权清理） |
| 子角色权限变更 | 该角色关联的所有用户 |
| 用户角色分配变更 | 该用户 |

### 5.3 缓存实现

```java
// PermissionCacheService.java

private static final String ROLE_PERM_KEY = "perm:role:";
private static final String USER_PERM_KEY = "perm:user:";
private static final long TTL_SECONDS = 3600; // 1小时

/**
 * 刷新角色权限缓存
 */
public void refreshByRoleId(Long roleId) {
    List<String> perms = rolePermissionMapper.selectPermCodesByRoleId(roleId);
    redis.setex(ROLE_PERM_KEY + roleId, TTL_SECONDS, perms);

    // 删除所有该角色关联用户的缓存
    List<Long> userIds = userRoleMapper.selectUserIdsByRoleId(roleId);
    for (Long userId : userIds) {
        // 按 tenantId 维度组织 keys
        Long tenantId = userMapper.selectTenantIdByUserId(userId);
        redis.del(USER_PERM_KEY + tenantId + ":" + userId);
    }
}

/**
 * 批量刷新角色权限缓存
 */
public void refreshByRoleIds(List<Long> roleIds) {
    // 批量获取角色权限
    Map<Long, List<String>> rolePermsMap = rolePermissionMapper.selectPermCodesByRoleIds(roleIds);

    for (Long roleId : roleIds) {
        List<String> perms = rolePermsMap.getOrDefault(roleId, Collections.emptyList());
        redis.setex(ROLE_PERM_KEY + roleId, TTL_SECONDS, perms);
    }

    // 批量获取并删除用户缓存
    List<Long> userIds = userRoleMapper.selectUserIdsByRoleIds(roleIds);
    if (!userIds.isEmpty()) {
        List<String> userKeys = new ArrayList<>();
        for (Long userId : userIds) {
            Long tenantId = userMapper.selectTenantIdByUserId(userId);
            userKeys.add(USER_PERM_KEY + tenantId + ":" + userId);
        }
        redis.del(userKeys.toArray(new String[0]));
    }
}

/**
 * 获取用户权限（带缓存）
 */
public List<String> getUserPermissions(Long userId) {
    Long tenantId = userMapper.selectTenantIdByUserId(userId);
    String key = USER_PERM_KEY + tenantId + ":" + userId;

    List<String> cached = redis.get(key);
    if (cached != null) {
        return cached;
    }

    // 缓存未命中，重新计算
    List<Long> roleIds = userRoleMapper.selectRoleIdsByUserId(userId);
    List<String> userPerms = new ArrayList<>();
    for (Long roleId : roleIds) {
        List<String> rolePerms = redis.get(ROLE_PERM_KEY + roleId);
        if (rolePerms == null) {
            rolePerms = rolePermissionMapper.selectPermCodesByRoleId(roleId);
            redis.setex(ROLE_PERM_KEY + roleId, TTL_SECONDS, rolePerms);
        }
        userPerms.addAll(rolePerms);
    }

    // 去重并缓存
    List<String> distinctPerms = userPerms.stream().distinct().toList();
    if (distinctPerms.isEmpty()) {
        // 缓存空列表，避免穿透
        redis.setex(key, TTL_SECONDS, Collections.emptyList());
    } else {
        redis.setex(key, TTL_SECONDS, distinctPerms);
    }

    return distinctPerms;
}
```

### 5.4 TTL 策略

- **TTL 设置**: 1 小时
- **主动刷新优先**: 权限变更时主动刷新
- **TTL 兜底**: 即使主动刷新漏了，最多 1 小时后自动修复
- **空权限缓存**: 缓存空列表 `[]`，避免缓存穿透

---

## 6. 前端渲染规则

### 6.1 权限边界

| 权限前缀 | 归属 | 说明 |
|---------|------|------|
| `platform:*` | 平台管理员 | 如 `platform:config:view`、`platform:enterprise:list` |
| `enterprise:*` | 企业管理员 | 如 `enterprise:member:list`、`enterprise:product:manage` |

两套权限体系**完全隔离**，无交集。

### 6.2 菜单渲染

```tsx
// EnterpriseApp.tsx

const ENTERPRISE_PERMISSION_MAP = {
  '/enterprise/dashboard': 'enterprise:dashboard:view',
  '/enterprise/members': 'enterprise:member:list',
  '/enterprise/rules': 'enterprise:rule:view',
  '/enterprise/products': 'enterprise:product:list',
  '/enterprise/orders': 'enterprise:order:list',
  '/enterprise/points': 'enterprise:point:query',
  '/enterprise/reports': 'enterprise:report:view',
  '/enterprise/roles': 'enterprise:role:list',
};

const menuItems = PlatformMenuItems
  .filter(item => {
    const key = String((item as any).key);
    const perm = ENTERPRISE_PERMISSION_MAP[key];
    // 服务端返回的 permissions 已过滤套餐范围，前端直接信任
    return !perm || permissions.includes(perm);
  })
  .map(item => ({
    ...item,
    onClick: () => navigate(item.key),
  }));
```

**关键原则**:
1. 信任服务端返回的 `permissions` 数组（已过滤套餐范围）
2. 前端不做二次套餐范围校验
3. 权限变更后，用户下次刷新页面时自动获取新权限

### 6.3 按钮级权限控制

```tsx
// 按钮级权限组件
const PermissionButton = ({
  permission,
  children,
  ...props
}: {
  permission: string;
  children: React.ReactNode;
} & ButtonProps) => {
  const { permissions } = useAuthStore();

  // 服务端已过滤套餐范围，这里直接检查用户权限列表
  if (!permissions.includes(permission)) {
    return null;
  }

  return <Button {...props}>{children}</Button>;
};

// 使用
<PermissionButton permission="enterprise:member:create">
  添加员工
</PermissionButton>
```

### 6.4 套餐变更后前端响应

```
套餐降级 → 子角色权限收缩 → 用户缓存刷新 → 下次登录/刷新时获取新权限 → 菜单自动更新

前端不需要主动处理，因为：
1. 权限变更后，用户缓存被清除
2. 用户下次请求时，服务端返回新的权限列表
3. 前端根据新权限列表重新渲染菜单
```

---

## 7. 权限变更场景总结

### 7.1 套餐升级（专业版 → 旗舰版）

| 角色 | 变更前 | 变更后 |
|------|-------|-------|
| 超管 | 专业版全部权限 | 自动更新为旗舰版全部权限（覆盖） |
| 运营 | 专业版部分权限 | **不变**（独立维护，超管可手动扩展） |
| 自定义 | 自定义权限 | **不变** |

### 7.2 套餐降级（旗舰版 → 专业版）

| 角色 | 变更前 | 变更后 |
|------|-------|-------|
| 超管 | 旗舰版全部权限 | 自动更新为专业版全部权限（覆盖） |
| 运营 | 含超出专业版权患 | **立即收缩**，移除越权权限 |
| 自定义 | 含超出专业版权患 | **立即收缩**，移除越权权限 |

### 7.3 子角色权限添加

| 场景 | 结果 |
|------|------|
| 权限在套餐范围内 | 添加成功 |
| 权限超出套餐范围 | 返回 403，前端提示 |

### 7.4 子角色权限删除

| 场景 | 结果 |
|------|------|
| 超管删除子角色权限 | 允许，不校验套餐范围 |
| 删除后子角色权限为空 | **允许**，不阻止 |

---

## 8. 非功能性设计

### 8.1 幂等性

套餐变更 API 支持幂等：
- 如果企业已是目标套餐，直接返回成功
- 重试不会导致重复变更

### 8.2 事务保证

- `@Transactional(rollbackFor = Exception.class)` 保证原子性
- 任一步骤失败，全部回滚

### 8.3 性能优化

- 批量 DELETE + BATCH INSERT 替代逐条操作
- Redis 缓存减少数据库查询
- 按 tenantId 维度批量删除用户缓存

### 8.4 初期不考虑

- 消息队列（Redis DEL 足够快）
- 套餐变更 Preview 模式
- 自动通知机制（只记录日志）

---

## 9. 影响范围

| 模块 | 影响 |
|------|------|
| carbon-system | 新增 PackageService、修改 TenantService、RolePermissionService |
| 数据库 | 新增 2 张表，修改 1 张表 |
| API | 新增/修改 7 个接口 |
| 前端 Dashboard | 无需修改（信任服务端权限） |

---

## 10. 讨论决策索引

| 讨论点 | 决策 |
|--------|------|
| 子角色越权校验 | 纯后端校验，前端只做 UX |
| 删除权限校验 | 不校验，只校验调用者是超管 |
| 套餐降级越权处理 | 立即收缩 |
| 事务边界 | @Transactional |
| 批量操作 | 批量 DELETE + BATCH INSERT |
| 幂等性 | 检查已是目标套餐则直接返回 |
| 缓存设计 | 混合方案 + TTL 1h |
| 空权限缓存 | 缓存空列表防穿透 |
| 套餐升级处理 | 已存在角色权限不变 |
| 前端渲染 | 信任服务端返回的权限列表 |
| 权限边界 | platform:* 和 enterprise:* 完全隔离 |

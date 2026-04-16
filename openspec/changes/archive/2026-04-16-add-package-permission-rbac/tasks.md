## 1. 数据库 Schema

- [x] 1.1 创建 `permission_packages` 表 DDL ✓ (in V2 migration)
- [x] 1.2 创建 `package_permissions` 表 DDL ✓ (in V2 migration)
- [x] 1.3 修改 `tenants` 表 DDL，添加 `package_id`、`max_users`、`expire_at` 字段 ✓ (in V1 migration)
- [x] 1.4 初始化基础数据：插入预设套餐（基础版/专业版/旗舰版） ✓ (in V2 migration)
- [x] 1.5 初始化基础数据：插入预设套餐权限关联数据 ✓ (in V2 migration)

## 2. 后端 carbon-system 模块

- [x] 2.1 创建 `PermissionPackage` Entity 实体类 ✓
- [x] 2.2 创建 `PackagePermission` Entity 实体类 ✓
- [x] 2.3 创建 `PermissionPackageMapper` MyBatis-Plus Mapper ✓
- [x] 2.4 创建 `PackagePermissionMapper` MyBatis-Plus Mapper ✓
- [x] 2.5 创建 `PermissionPackageService` 服务类 ✓
- [x] 2.6 实现套餐 CRUD 业务逻辑（含删除约束校验） ✓
- [x] 2.7 修改 `TenantService` 创建企业时绑定套餐并初始化超管权限 ✓
- [x] 2.8 实现更换套餐时权限同步逻辑：更新超管权限 + 收缩子角色权限 ✓
- [x] 2.9 修改 `RolePermissionService` 添加权限时校验套餐范围约束 ✓

## 3. 平台管理后台 API

- [x] 3.1 实现套餐列表查询 API `GET /platform/packages` ✓
- [x] 3.2 实现套餐详情查询 API `GET /platform/packages/{id}` ✓
- [x] 3.3 实现创建套餐 API `POST /platform/packages` ✓
- [x] 3.4 实现编辑套餐 API `PUT /platform/packages/{id}` ✓
- [x] 3.5 实现删除套餐 API `DELETE /platform/packages/{id}` ✓
- [x] 3.6 实现更新套餐权限 API `PUT /platform/packages/{id}/permissions` ✓
- [x] 3.7 实现更换企业套餐 API `PUT /platform/tenants/{id}/package` ✓

## 4. 测试验证

- [x] 4.1 单元测试：套餐创建/编辑/删除约束验证 ✓ (tests exist)
- [x] 4.2 单元测试：更换套餐权限同步验证 ✓ (tests exist)
- [x] 4.3 单元测试：子角色权限越权校验验证 ✓ (tests exist)
- [x] 4.4 集成测试：创建企业绑定套餐 → 超管权限正确初始化 ✓ (tests exist)
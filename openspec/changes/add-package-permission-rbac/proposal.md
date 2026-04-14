## Why

当前 RBAC 规格已经定义了权限套餐的业务规则，但缺少完整的数据库表结构设计支持：权限套餐表 `permission_packages` 和套餐-权限关联表 `package_permissions`，以及租户表与套餐的绑定关系。完整的数据库设计是实现"企业超级管理员权限来自购买套餐"需求的基础，需要补充设计。

## What Changes

- 补充权限套餐表 `permission_packages` 的设计，支持平台管理员创建、编辑、删除权限套餐
- 补充套餐-权限关联表 `package_permissions` 的设计，支持套餐与权限多对多关联
- 补充租户表 `tenants` 的套餐字段设计，支持企业绑定到具体套餐
- 完善 RBAC 模型中角色权限与套餐权限的约束关系：企业子角色权限必须为套餐权限子集
- 不修改现有业务规则，仅补全数据库 schema 设计缺口

## Capabilities

### New Capabilities
- `permission-package`: 权限套餐数据模型设计与数据库表结构

### Modified Capabilities
- `rbac`: 完善 RBAC 规格，补充套餐权限约束与数据库表关系

## Impact

- 后端：carbon-system 模块，新增两张表，修改 tenants 表结构
- 数据库：新增 `permission_packages`、`package_permissions`
- 平台管理后台：套餐管理功能需要此数据模型
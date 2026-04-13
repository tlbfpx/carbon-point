## Why

数据库设计经过代码评审发现多处可以优化的地方：缺少逻辑删除、索引不全、部分表缺少租户ID、实体定义重复等。这些问题影响数据一致性、查询性能和代码可维护性，需要系统性整改。

## What Changes

- **数据一致性**：所有业务表添加 `deleted` 逻辑删除字段，支持软删除和数据审计
- **查询性能**：为高频查询添加缺失的复合索引，优化分页查询性能
- **多租户完整性**：`user_badges` 表补全 `tenant_id` 字段，确保租户隔离完整
- **代码清理**：删除重复定义的 `PermissionEntity`，统一权限实体定义
- **并发控制**：为 `check_in_records` 添加乐观锁 `version` 字段，防止并发打卡冲突
- **标准化**：统一ID生成策略为数据库自增，统一数值类型（Badge id → Long）
- **索引补全**：为关联表和常用查询条件添加缺失的复合索引

## Capabilities

### Modified Capabilities

- `multi-tenant`: 补全user_badges表租户隔离，修正多租户设计完整性
- `user-management`: 添加逻辑删除字段，统一ID生成策略
- `check-in`: 添加乐观锁version字段，增强并发控制
- `point-account`: 添加逻辑删除字段到point_transactions
- `virtual-mall`: 已经完成库存null→-1语义修正，本次添加缺失索引
- `rbac`: 删除重复实体定义，清理权限表索引
- `honor-system`: 补全user_badges tenant_id，统一badge id类型

## Impact

- **Affected modules**: carbon-system, carbon-checkin, carbon-points, carbon-mall, carbon-honor, carbon-common
- **Database schema change**: 需要ALTER TABLE添加字段和索引
- **Backward compatible**: 大部分变更向后兼容，新增字段可为空
- **Migration**: 需要Flyway/Liquibase迁移脚本添加字段和索引

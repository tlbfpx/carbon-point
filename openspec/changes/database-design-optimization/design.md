## Context

本次变更基于代码评审发现的数据库设计问题进行系统性整改。当前项目已完成所有功能开发，进入稳定优化阶段。数据库设计存在以下问题：

1. 所有业务表缺少逻辑删除字段，当前使用物理删除，无法审计和恢复
2. 多个高频查询缺少复合索引，影响查询性能
3. `user_badges` 表缺少 `tenant_id`，多租户隔离不完整
4. 存在重复实体定义 (`Permission` vs `PermissionEntity`)
5. `CheckInRecordEntity` 缺少乐观锁，并发打卡可能导致连续天数计算错误
6. ID生成策略不统一，部分表使用NONE需要手动赋值

## Goals / Non-Goals

**Goals:**
- 所有业务表支持逻辑删除，保留历史数据
- 补全所有缺失索引，提升查询性能
- 补全多租户隔离，消除数据泄露风险
- 清理重复代码，统一实体定义
- 增强并发控制，消除积分/打卡并发冲突
- 统一ID生成策略，减少人为错误

**Non-Goals:**
- 不改变现有业务功能
- 不改变对外API接口契约
- 不重构整体架构
- 不迁移数据库（保持MySQL）

## Decisions

### 1. 逻辑删除方案 → MyBatis-Plus 内置 @TableLogic

**选择：** 使用MyBatis-Plus提供的 `@TableLogic` 注解，配置 `deleted` 字段（integer类型，0未删除，1已删除）

**理由：**
- 框架原生支持，无需自定义逻辑
- 自动过滤已删除记录，无需开发者记住添加条件
- 回滚简单，只需要设置 `deleted=0` 即可恢复数据

**备选方案：**
- 使用 `is_deleted` 布尔字段 → MySQL中布尔也是integer存储，不如统一integer方便

### 2. UserBadge 增加 tenant_id → 直接添加，允许NULL用于迁移

**选择：** 在 `UserBadge` 添加 `tenant_id` 字段，迁移时可以从 `userId` → `users.tenant_id` 更新数据

**理由：**
- 没有tenant_id无法完成租户隔离，必须添加
- 允许NULL在迁移过程中不破坏现有代码，迁移完成后设置为NOT NULL

### 3. 删除 PermissionEntity → 统一使用 carbon-system.Permission

**选择：** 删除 `carbon-common` 中的 `PermissionEntity`，所有地方统一使用 `carbon-point/carbon-system/src/main/java/com/carbonpoint/system/entity/Permission.java`

**理由：**
- 权限是系统核心概念，属于用户管理模块，放在carbon-system合理
- 重复定义导致维护困难，修改需要同时改两处
- common模块只放公共基础实体，不应该放业务实体

### 4. CheckInRecord 增加 version 乐观锁

**选择：** 添加 `@Version Long version;` 字段

**理由：**
- 连续天数计算基于查询当前值计算然后写回，没有乐观锁会产生丢失更新
- MyBatis-Plus原生支持乐观锁，不需要额外代码

### 5. ID生成策略统一 → IdType.AUTO

**选择：** 所有实体表统一使用数据库自增ID，`@TableId(type = IdType.AUTO)`

**当前问题：**
- `User.id` 现在是 `IdType.NONE`，需要手动设置ID
- 其他表大部分是 `AUTO`，不一致容易出错

**理由：**
- 简化开发，不需要开发者关心ID生成
- 自增ID性能好，空间紧凑
- 对于分布式ID，未来如果需要可以再改，当前单体应用足够

### 6. BadgeDefinition.id → Integer → Long

**选择：** 修改ID类型从Integer改为Long，与所有其他表保持一致

**理由：**
- 徽章数量虽然少，但统一类型减少认知负担
- 未来如果需要更多徽章不需要修改类型
- MyBatis-Plus对自增ID用Long更一致

### 7. 索引设计 → 基于查询模式创建复合索引

**选择：** 按照最左前缀原则，将常用过滤条件放在最左边

详见tasks.md中的索引列表。

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| 添加字段需要ALTER TABLE，大表加字段会锁表 | 中 | 生产环境使用pt-online-schema-change或MySQL 8.0+ Online DDL |
| 逻辑删除增加存储空间 | 低 | 删除数据本来就需要保留，空间换可审计性值得 |
| 更多索引增加插入/更新开销 | 低 | 索引都是添加在查询频繁的表，写入频率远低于查询频率 |
| 数据迁移失败 | 中 | 先在测试库验证，有回滚脚本 |

## Migration Plan

1. **Phase 1**: Java实体添加新字段（nullable），部署
2. **Phase 2**: 执行数据库迁移脚本（添加字段、创建索引）
3. **Phase 3**: 回填数据（user_badges.tenant_id from users.tenant_id）
4. **Phase 4**: 将字段改为NOT NULL（可选，生产可保持nullable）
5. **Phase 5**: 删除PermissionEntity，更新所有引用
6. **验证**: 迁移后检查所有表结构和数据

**回滚：** 如果问题严重，回滚Java代码+回滚DDL即可

## Open Questions

None - 所有决策明确，可以实施

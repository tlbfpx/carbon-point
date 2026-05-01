# 回滚指南

## 概述

本文档描述了从新统一资源架构回滚到旧架构的完整流程和脚本。

## 回滚场景

| 场景 | 触发条件 | 回滚方案 |
|------|---------|---------|
| **紧急回滚** | 新架构严重故障，影响业务 | 快速回滚到旧架构 |
| **数据不一致** | 发现数据一致性问题且无法快速修复 | 回滚到一致的时间点 |
| **性能不达标** | 新架构性能严重下降 | 回滚后优化 |
| **功能缺失** | 关键功能在新架构中不可用 | 回滚后补充实现 |

## 回滚前检查清单

- [ ] 确认需要回滚的范围 (全量 / 部分功能)
- [ ] 确认回滚目标时间点
- [ ] 备份当前新架构的所有数据
- [ ] 确认旧架构的表和数据完整
- [ ] 准备回滚脚本并在测试环境验证
- [ ] 通知相关团队
- [ ] 准备回滚后的验证计划
- [ ] 安排运维和开发人员待命

## 回滚脚本

### 1. 快速回滚脚本 (rollback_quick.sql)

用于紧急情况，快速切换回旧架构:

```sql
-- ============================================
-- 快速回滚脚本
-- ============================================

-- 1. 记录回滚开始
INSERT INTO migration_control (migration_name, status, started_at, error_message)
VALUES ('rollback_to_old_arch', 'IN_PROGRESS', NOW(), '紧急回滚');

-- 2. 恢复租户表的 package_type
UPDATE tenants
SET package_type = CASE
    WHEN (SELECT code FROM permission_packages WHERE id = tenants.package_id) = 'FREE' THEN 'free'
    WHEN (SELECT code FROM permission_packages WHERE id = tenants.package_id) = 'PRO' THEN 'pro'
    WHEN (SELECT code FROM permission_packages WHERE id = tenants.package_id) = 'ENTERPRISE' THEN 'enterprise'
    ELSE 'free'
END
WHERE package_id IS NOT NULL;

-- 3. 同步租户资源配置回到旧表 (如果需要)
INSERT IGNORE INTO product_configs_old (tenant_id, product_code, enabled, config_json, created_at, updated_at)
SELECT
    trc.tenant_id,
    REPLACE(LOWER(SUBSTRING(trc.resource_code, 9)), '_', '-'),
    trc.enabled,
    trc.config,
    trc.createdAt,
    trc.updatedAt
FROM tenant_resource_configs trc
WHERE trc.resource_code LIKE 'PRODUCT_%'
  AND NOT EXISTS (
      SELECT 1 FROM product_configs_old pc
      WHERE pc.tenant_id = trc.tenant_id
        AND pc.product_code = REPLACE(LOWER(SUBSTRING(trc.resource_code, 9)), '_', '-')
  );

-- 4. 更新旧配置表 (如果有冲突则合并)
UPDATE product_configs_old pc
JOIN tenant_resource_configs trc
  ON pc.tenant_id = trc.tenant_id
 AND REPLACE(LOWER(SUBSTRING(trc.resource_code, 9)), '_', '-') = pc.product_code
SET pc.enabled = trc.enabled,
    pc.config_json = trc.config,
    pc.updated_at = NOW();

-- 5. 标记回滚完成
UPDATE migration_control
SET status = 'COMPLETED',
    completed_at = NOW(),
    records_processed = (SELECT COUNT(*) FROM tenant_resource_configs)
WHERE migration_name = 'rollback_to_old_arch';

-- 6. 查询回滚结果
SELECT '回滚完成' AS result, NOW() AS completed_at;
SELECT * FROM migration_control WHERE migration_name = 'rollback_to_old_arch';
```

### 2. 完整回滚脚本 (rollback_complete.sql)

用于完整回滚所有变更:

```sql
-- ============================================
-- 完整回滚脚本
-- ============================================

-- 1. 禁用外键检查 (临时)
SET FOREIGN_KEY_CHECKS = 0;

-- 2. 备份可能需要的数据 (可选)
CREATE TABLE IF NOT EXISTS tenant_resource_configs_backup_YYYYMMDD AS SELECT * FROM tenant_resource_configs;
CREATE TABLE IF NOT EXISTS platform_resources_backup_YYYYMMDD AS SELECT * FROM platform_resources;

-- 3. 删除新架构的变更日志
DROP TABLE IF EXISTS change_log;
DROP TABLE IF EXISTS sync_status;

-- 4. 删除新架构的菜单定义 (如果决定不用)
-- DROP TABLE IF EXISTS menu_definitions;

-- 5. 恢复平台产品数据
INSERT IGNORE INTO platform_products_old (id, code, name, description, category, status, sort_order, created_at, updated_at)
SELECT
    UUID(),
    REPLACE(LOWER(SUBSTRING(pr.code, 9)), '_', '-'),
    pr.name,
    pr.description,
    pr.category,
    CASE pr.status WHEN 'ENABLED' THEN 1 ELSE 0 END,
    pr.sortOrder,
    pr.createdAt,
    pr.updatedAt
FROM platform_resources pr
WHERE pr.type = 'FUNCTION_PRODUCT'
  AND pr.deleted = FALSE
  AND NOT EXISTS (
      SELECT 1 FROM platform_products_old p
      WHERE p.code = REPLACE(LOWER(SUBSTRING(pr.code, 9)), '_', '-')
  );

-- 6. 恢复功能点数据
INSERT IGNORE INTO product_features_old (id, code, product_code, name, description, feature_type, is_required, sort_order, created_at, updated_at)
SELECT
    UUID(),
    REPLACE(LOWER(SUBSTRING(pr.code, 9)), '_', '-'),
    'default',
    pr.name,
    pr.description,
    'default',
    pr.isRequired != NULL AND pr.isRequired,
    pr.sortOrder,
    pr.createdAt,
    pr.updatedAt
FROM platform_resources pr
WHERE pr.type = 'FEATURE'
  AND pr.deleted = FALSE
  AND NOT EXISTS (
      SELECT 1 FROM product_features_old f
      WHERE f.code = REPLACE(LOWER(SUBSTRING(pr.code, 9)), '_', '-')
  );

-- 7. 恢复租户产品配置
INSERT IGNORE INTO product_configs_old (tenant_id, product_code, enabled, config_json, created_at, updated_at)
SELECT
    trc.tenant_id,
    REPLACE(LOWER(SUBSTRING(trc.resource_code, 9)), '_', '-'),
    trc.enabled,
    trc.config,
    trc.createdAt,
    trc.updatedAt
FROM tenant_resource_configs trc
WHERE trc.resource_code LIKE 'PRODUCT_%'
  AND NOT EXISTS (
      SELECT 1 FROM product_configs_old pc
      WHERE pc.tenant_id = trc.tenant_id
        AND pc.product_code = REPLACE(LOWER(SUBSTRING(trc.resource_code, 9)), '_', '-')
  );

-- 8. 更新旧配置表
UPDATE product_configs_old pc
JOIN tenant_resource_configs trc
  ON pc.tenant_id = trc.tenant_id
 AND REPLACE(LOWER(SUBSTRING(trc.resource_code, 9)), '_', '-') = pc.product_code
SET pc.enabled = trc.enabled,
    pc.config_json = trc.config,
    pc.updated_at = NOW();

-- 9. 恢复租户套餐信息
UPDATE tenants t
LEFT JOIN tenant_packages tp ON t.id = tp.tenant_id AND tp.status = 'ACTIVE'
LEFT JOIN permission_packages pp ON tp.package_id = pp.id
SET t.package_type = CASE pp.code
    WHEN 'FREE' THEN 'free'
    WHEN 'PRO' THEN 'pro'
    WHEN 'ENTERPRISE' THEN 'enterprise'
    ELSE 'free'
END;

-- 10. 重新启用外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- 11. 记录回滚完成
SELECT '完整回滚完成' AS result, NOW() AS completed_at;
```

### 3. 应用回滚步骤

**步骤 1: 停止应用服务**

```bash
# 停止后端服务
systemctl stop carbon-point-backend

# 停止前端服务 (如有需要)
systemctl stop carbon-point-frontend
```

**步骤 2: 执行数据库备份**

```bash
# 备份当前数据库
mysqldump -u [username] -p [database_name] > backup_before_rollback_$(date +%Y%m%d_%H%M%S).sql
```

**步骤 3: 执行回滚脚本**

```bash
# 方式 1: 快速回滚
mysql -u [username] -p [database_name] < rollback_quick.sql

# 方式 2: 完整回滚
mysql -u [username] -p [database_name] < rollback_complete.sql
```

**步骤 4: 验证回滚结果**

执行验证 SQL:

```sql
-- 验证租户套餐
SELECT id, name, package_type, package_id
FROM tenants
LIMIT 10;

-- 验证产品配置数量
SELECT
    (SELECT COUNT(*) FROM product_configs_old) AS old_config_count,
    (SELECT COUNT(*) FROM product_configs) AS new_config_count;

-- 验证平台产品
SELECT COUNT(*) FROM platform_products_old WHERE status = 1;
```

**步骤 5: 切换应用配置回旧架构**

修改 `application.yml` 或相关配置:

```yaml
# 禁用新架构特性
carbon:
  feature:
    unified-resource-architecture: false
    resource-driven-menu: false
```

**步骤 6: 重启应用服务**

```bash
# 启动后端服务
systemctl start carbon-point-backend

# 启动前端服务
systemctl start carbon-point-frontend
```

**步骤 7: 进行业务验证**

参考 `rollback_verification_checklist.md` 进行完整验证。

## 回滚验证检查清单

### 功能验证

- [ ] 用户登录正常
- [ ] 菜单显示正常 (旧架构)
- [ ] 租户套餐信息正确
- [ ] 产品配置正确加载
- [ ] 爬楼打卡功能正常
- [ ] 积分兑换功能正常
- [ ] 数据统计功能正常

### 数据验证

- [ ] 租户数据完整
- [ ] 用户数据完整
- [ ] 产品配置数据完整
- [ ] 积分记录完整
- [ ] 订单记录完整

### 性能验证

- [ ] 页面加载时间正常
- [ ] API 响应时间正常
- [ ] 数据库查询性能正常

## 回滚后处理

### 1. 清理临时数据

```sql
-- 清理备份表 (确认回滚成功后)
-- DROP TABLE IF EXISTS tenant_resource_configs_backup_YYYYMMDD;
-- DROP TABLE IF EXISTS platform_resources_backup_YYYYMMDD;

-- 清理迁移控制表记录 (可选)
-- DELETE FROM migration_control WHERE migration_name LIKE '%rollback%';
```

### 2. 记录回滚事件

在项目文档中记录:
- 回滚时间
- 回滚原因
- 回滚过程中的问题
- 后续改进计划

### 3. 分析根因

组织复盘会议:
- 分析导致需要回滚的原因
- 识别预防措施
- 更新相关文档和流程

## 分阶段回滚策略

如果不需要全量回滚，可以考虑分阶段回滚:

### 阶段 1: 只回滚菜单

保持数据层不变，只切换菜单回旧实现:

```yaml
carbon:
  feature:
    resource-driven-menu: false
```

### 阶段 2: 回滚租户配置

保持平台资源不变，只回滚租户配置层:

```sql
-- 恢复 product_configs 表的使用
-- 应用代码回退到读取 product_configs
```

### 阶段 3: 完全回滚

按完整回滚脚本执行。

## 常见问题

### Q1: 回滚后发现部分数据丢失怎么办?

A: 使用之前的备份进行恢复，参考 `data_recovery_guide.md`。

### Q2: 回滚脚本执行失败怎么办?

A:
1. 检查错误信息
2. 确认数据库用户权限
3. 检查表是否存在
4. 如需要，手动执行关键步骤
5. 联系 DBA 支持

### Q3: 如何验证新旧数据一致?

A: 执行一致性检查脚本 `consistency_checks.sql`。

### Q4: 回滚后还能再升级到新架构吗?

A: 可以，修复问题后重新执行迁移脚本即可。

## 联系支持

- 后端开发: [待补充]
- DBA: [待补充]
- 运维: [待补充]

---

**版本**: 1.0
**最后更新**: 2026-04-30

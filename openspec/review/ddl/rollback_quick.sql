-- ============================================
-- Carbon Point 快速回滚脚本
-- 版本: V2.0
-- 用途: 紧急情况下快速回滚到旧架构
-- ============================================

-- 1. 记录回滚开始
INSERT INTO migration_control (migration_name, status, started_at, error_message)
VALUES ('rollback_to_old_arch', 'IN_PROGRESS', NOW(3), '紧急回滚');

-- 2. 恢复租户表的 package_type
UPDATE tenants
SET package_type = CASE
    WHEN EXISTS (SELECT 1 FROM permission_packages WHERE id = tenants.package_id AND code = 'FREE') THEN 'free'
    WHEN EXISTS (SELECT 1 FROM permission_packages WHERE id = tenants.package_id AND code = 'PRO') THEN 'pro'
    WHEN EXISTS (SELECT 1 FROM permission_packages WHERE id = tenants.package_id AND code = 'ENTERPRISE') THEN 'enterprise'
    ELSE 'free'
END
WHERE package_id IS NOT NULL;

-- 3. 同步租户资源配置回到旧表 (INSERT IGNORE 防止重复)
INSERT IGNORE INTO product_configs_old (tenant_id, product_code, enabled, config_json, created_at, updated_at)
SELECT
    trc.tenant_id,
    REPLACE(LOWER(SUBSTRING(trc.resource_code, 9)), '_', '-'),
    trc.enabled,
    trc.config,
    trc.created_at,
    trc.updated_at
FROM tenant_resource_configs trc
WHERE trc.resource_code LIKE 'PRODUCT_%'
  AND NOT EXISTS (
      SELECT 1 FROM product_configs_old pc
      WHERE pc.tenant_id = trc.tenant_id
        AND pc.product_code = REPLACE(LOWER(SUBSTRING(trc.resource_code, 9)), '_', '-')
  );

-- 4. 更新旧配置表 (合并新架构的变更)
UPDATE product_configs_old pc
JOIN tenant_resource_configs trc
  ON pc.tenant_id = trc.tenant_id
 AND REPLACE(LOWER(SUBSTRING(trc.resource_code, 9)), '_', '-') = pc.product_code
SET pc.enabled = trc.enabled,
    pc.config_json = trc.config,
    pc.updated_at = NOW(3);

-- 5. 标记回滚完成
UPDATE migration_control
SET status = 'COMPLETED',
    completed_at = NOW(3),
    records_processed = (SELECT COUNT(*) FROM tenant_resource_configs)
WHERE migration_name = 'rollback_to_old_arch';

-- 6. 查询回滚结果
SELECT '回滚完成' AS result, NOW(3) AS completed_at;
SELECT * FROM migration_control WHERE migration_name = 'rollback_to_old_arch';

-- 7. 验证数据
SELECT
    '数据验证' AS verification,
    (SELECT COUNT(*) FROM tenants) AS tenant_count,
    (SELECT COUNT(*) FROM product_configs_old) AS old_config_count,
    (SELECT COUNT(*) FROM tenant_resource_configs) AS new_config_count;

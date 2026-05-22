-- ============================================
-- Carbon Point 数据一致性检查脚本
-- 版本: V1.0
-- 用途: 验证新旧架构之间的数据一致性
-- ============================================

-- ============================================
-- 检查 1: 租户套餐一致性
-- ============================================
SELECT
    '租户套餐一致性' AS check_name,
    COUNT(*) AS total_tenants,
    SUM(CASE WHEN t.package_type = CASE pp.code WHEN 'FREE' THEN 'free' WHEN 'PRO' THEN 'pro' WHEN 'ENTERPRISE' THEN 'enterprise' ELSE 'free' END THEN 1 ELSE 0 END) AS consistent_count,
    SUM(CASE WHEN t.package_type != CASE pp.code WHEN 'FREE' THEN 'free' WHEN 'PRO' THEN 'pro' WHEN 'ENTERPRISE' THEN 'enterprise' ELSE 'free' END THEN 1 ELSE 0 END) AS inconsistent_count
FROM tenants t
LEFT JOIN permission_packages pp ON t.package_id = pp.id;

-- 显示不一致的租户
SELECT
    '不一致租户详情' AS detail,
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.package_type AS old_package_type,
    pp.code AS new_package_code
FROM tenants t
LEFT JOIN permission_packages pp ON t.package_id = pp.id
WHERE t.package_type != CASE pp.code WHEN 'FREE' THEN 'free' WHEN 'PRO' THEN 'pro' WHEN 'ENTERPRISE' THEN 'enterprise' ELSE 'free' END
   OR (t.package_id IS NULL AND t.package_type IS NOT NULL);

-- ============================================
-- 检查 2: 平台产品与资源一致性
-- ============================================
SELECT
    '平台产品与资源一致性' AS check_name,
    (SELECT COUNT(*) FROM platform_products_old WHERE status = 1) AS old_active_product_count,
    (SELECT COUNT(*) FROM platform_resources WHERE type = 'FUNCTION_PRODUCT' AND status = 'ENABLED' AND deleted = FALSE) AS new_active_resource_count,
    (SELECT COUNT(*) FROM platform_products_old p LEFT JOIN platform_resources r ON r.code = CONCAT('PRODUCT_', UPPER(REPLACE(p.code, '-', '_'))) WHERE r.id IS NULL) AS missing_in_new_count,
    (SELECT COUNT(*) FROM platform_resources r LEFT JOIN platform_products_old p ON CONCAT('PRODUCT_', UPPER(REPLACE(p.code, '-', '_'))) = r.code WHERE r.type = 'FUNCTION_PRODUCT' AND p.id IS NULL) AS extra_in_new_count;

-- 显示缺失的产品
SELECT
    '旧架构中存在但新架构缺失的产品' AS missing,
    p.id,
    p.code,
    p.name
FROM platform_products_old p
LEFT JOIN platform_resources r ON r.code = CONCAT('PRODUCT_', UPPER(REPLACE(p.code, '-', '_')))
WHERE r.id IS NULL;

-- ============================================
-- 检查 3: 租户产品配置一致性
-- ============================================
SELECT
    '租户产品配置一致性' AS check_name,
    COUNT(*) AS total_tenant_configs,
    SUM(CASE WHEN trc.enabled = pc.enabled THEN 1 ELSE 0 END) AS consistent_enabled_count,
    SUM(CASE WHEN trc.config = pc.config_json THEN 1 ELSE 0 END) AS consistent_config_count
FROM product_configs_old pc
JOIN tenant_resource_configs trc
  ON pc.tenant_id = trc.tenant_id
 AND trc.resource_code = CONCAT('PRODUCT_', UPPER(REPLACE(pc.product_code, '-', '_')));

-- 显示不一致的配置
SELECT
    '不一致配置详情' AS detail,
    pc.tenant_id,
    pc.product_code,
    pc.enabled AS old_enabled,
    trc.enabled AS new_enabled,
    CASE WHEN pc.enabled = trc.enabled THEN '一致' ELSE '不一致' END AS enabled_match,
    CASE WHEN pc.config_json = trc.config THEN '一致' ELSE '不一致' END AS config_match
FROM product_configs_old pc
LEFT JOIN tenant_resource_configs trc
  ON pc.tenant_id = trc.tenant_id
 AND trc.resource_code = CONCAT('PRODUCT_', UPPER(REPLACE(pc.product_code, '-', '_')))
WHERE trc.id IS NULL
   OR pc.enabled != trc.enabled
   OR pc.config_json != trc.config;

-- ============================================
-- 检查 4: 套餐资源关联一致性
-- ============================================
SELECT
    '套餐资源关联一致性' AS check_name,
    pp.code AS package_code,
    pp.name AS package_name,
    (SELECT COUNT(*) FROM package_products_old WHERE package_id = pp.id) AS old_product_count,
    (SELECT COUNT(*) FROM package_resources WHERE package_id = pp.id AND resource_code LIKE 'PRODUCT_%') AS new_resource_count
FROM permission_packages pp;

-- ============================================
-- 检查 5: 同步状态检查
-- ============================================
SELECT
    '同步状态检查' AS check_name,
    COUNT(*) AS pending_count
FROM change_log
WHERE sync_status = 'PENDING';

SELECT
    '同步失败检查' AS check_name,
    COUNT(*) AS failed_count
FROM change_log
WHERE sync_status = 'FAILED'
  AND retry_count >= 3;

-- 显示失败的同步记录
SELECT
    id,
    table_name,
    record_id,
    operation_type,
    sync_error,
    retry_count,
    created_at
FROM change_log
WHERE sync_status = 'FAILED'
  AND retry_count >= 3
ORDER BY created_at DESC;

-- ============================================
-- 检查 6: 租户资源配置完整性
-- ============================================
SELECT
    '租户资源配置完整性' AS check_name,
    t.id AS tenant_id,
    t.name AS tenant_name,
    COUNT(DISTINCT pr.resource_code) AS expected_resource_count,
    COUNT(DISTINCT trc.id) AS actual_resource_config_count
FROM tenants t
JOIN tenant_packages tp ON t.id = tp.tenant_id AND tp.status = 'ACTIVE'
JOIN package_resources pr ON tp.package_id = pr.package_id
LEFT JOIN tenant_resource_configs trc ON t.id = trc.tenant_id AND pr.resource_code = trc.resource_code
GROUP BY t.id, t.name
HAVING expected_resource_count != actual_resource_config_count;

-- ============================================
-- 总体检查摘要
-- ============================================
SELECT
    '总体一致性检查摘要' AS summary,
    NOW(3) AS check_time,
    (SELECT COUNT(*) FROM tenants) AS tenant_count,
    (SELECT COUNT(*) FROM platform_products_old) AS old_product_count,
    (SELECT COUNT(*) FROM platform_resources WHERE type = 'FUNCTION_PRODUCT') AS new_resource_count,
    (SELECT COUNT(*) FROM product_configs_old) AS old_config_count,
    (SELECT COUNT(*) FROM tenant_resource_configs) AS new_config_count,
    (SELECT COUNT(*) FROM change_log WHERE sync_status = 'PENDING') AS pending_sync_count,
    (SELECT COUNT(*) FROM change_log WHERE sync_status = 'FAILED' AND retry_count >= 3) AS failed_sync_count;

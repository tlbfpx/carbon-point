-- ============================================================
-- Carbon Point 数据迁移脚本
-- 版本: V2.1
-- 说明: 从旧架构迁移到统一资源架构
-- ============================================================

-- ============================================================
-- 1. 迁移平台产品数据
-- ============================================================
INSERT INTO platform_products (id, code, name, description, trigger_type, status, sort_order, created_at, updated_at)
SELECT
    UUID_TO_BIN(UUID()),
    CONCAT('PRODUCT_', UPPER(REPLACE(pp.code, '-', '_'))),
    pp.name,
    pp.description,
    pp.trigger_type,
    pp.status,
    pp.sort_order,
    pp.created_at,
    pp.updated_at
FROM (SELECT DISTINCT code, name, description, trigger_type, status, sort_order, created_at, updated_at
      FROM platform_products_old) pp
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP(3);

-- ============================================================
-- 2. 迁移平台商城商品数据
-- ============================================================
INSERT INTO platform_mall_products (id, code, name, description, image_url, type,
                                      base_points_price, stock, max_per_user, validity_days,
                                      fulfillment_config, status, created_at, updated_at)
SELECT
    UUID_TO_BIN(UUID()),
    CONCAT('MALL_', UPPER(pm.type), '_', pm.id),
    pm.name,
    pm.description,
    pm.image_url,
    pm.type,
    pm.price_cents,
    pm.stock,
    pm.max_per_user,
    30,
    pm.fulfillment_config,
    pm.status,
    pm.created_at,
    pm.updated_at
FROM platform_mall_products_old pm
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP(3);

-- ============================================================
-- 3. 迁移功能点数据
-- ============================================================
INSERT INTO features (id, code, product_code, name, description, feature_type,
                       is_required, status, sort_order, created_at, updated_at)
SELECT
    UUID_TO_BIN(UUID()),
    CONCAT('FEATURE_', UPPER(pf.feature_type)),
    CONCAT('PRODUCT_', UPPER(pf.product_code)),
    pf.name,
    pf.description,
    pf.feature_type,
    pf.is_required,
    'ENABLED',
    pf.sort_order,
    pf.created_at,
    pf.updated_at
FROM (SELECT DISTINCT feature_type, product_code, name, description, is_required, sort_order, created_at, updated_at
      FROM product_features_old) pf
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP(3);

-- ============================================================
-- 4. 迁移租户产品配置
-- ============================================================
INSERT INTO product_configs (tenant_id, product_code, enabled, config_json, created_at, updated_at)
SELECT
    pc.tenant_id,
    CONCAT('PRODUCT_', UPPER(pc.product_code)),
    pc.enabled,
    pc.config_json,
    pc.created_at,
    pc.updated_at
FROM product_configs_old pc
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP(3);

-- ============================================================
-- 5. 迁移租户套餐关联
-- ============================================================
INSERT INTO tenant_packages (tenant_id, package_id, status, starts_at, created_at, updated_at)
SELECT
    t.id,
    pp.id,
    'ACTIVE',
    COALESCE(t.created_at, CURRENT_TIMESTAMP(3)),
    COALESCE(t.created_at, CURRENT_TIMESTAMP(3)),
    CURRENT_TIMESTAMP(3)
FROM tenants t
JOIN permission_packages pp ON
    CASE t.package_type
        WHEN 'free' THEN pp.code = 'FREE'
        WHEN 'pro' THEN pp.code = 'PRO'
        WHEN 'enterprise' THEN pp.code = 'ENTERPRISE'
        ELSE pp.code = 'FREE'
    END
WHERE t.package_id IS NULL
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP(3);

-- ============================================================
-- 6. 更新租户表的package_id
-- ============================================================
UPDATE tenants t
JOIN tenant_packages tp ON t.id = tp.tenant_id AND tp.status = 'ACTIVE'
SET t.package_id = tp.package_id
WHERE t.package_id IS NULL;

-- ============================================================
-- 7. 迁移租户商品货架
-- ============================================================
INSERT INTO tenant_product_shelf (tenant_id, platform_product_id, shelf_status,
                                   sort_order, created_at, updated_at)
SELECT
    tsp.tenant_id,
    pmp.id,
    tsp.shelf_status,
    tsp.sort_order,
    tsp.created_at,
    tsp.updated_at
FROM tenant_product_shelf_old tsp
JOIN platform_mall_products pmp ON pmp.id = tsp.platform_product_id
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP(3);

-- ============================================================
-- 8. 自动为现有租户创建资源配置
-- ============================================================
INSERT INTO tenant_resource_configs (tenant_id, resource_code, enabled, created_at, updated_at)
SELECT DISTINCT
    t.id,
    pr.resource_code,
    pr.is_required,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM tenants t
JOIN tenant_packages tp ON t.id = tp.tenant_id AND tp.status = 'ACTIVE'
JOIN package_resources pr ON tp.package_id = pr.package_id
LEFT JOIN tenant_resource_configs trc ON t.id = trc.tenant_id AND pr.resource_code = trc.resource_code
WHERE trc.id IS NULL;

-- ============================================================
-- 迁移完成验证
-- ============================================================
SELECT
    '迁移统计' as summary,
    (SELECT COUNT(*) FROM platform_resources) as platform_resources_count,
    (SELECT COUNT(*) FROM permission_packages) as packages_count,
    (SELECT COUNT(*) FROM package_resources) as package_resources_count,
    (SELECT COUNT(*) FROM tenant_packages) as tenant_packages_count,
    (SELECT COUNT(*) FROM tenant_resource_configs) as tenant_resource_configs_count,
    (SELECT COUNT(*) FROM menu_definitions) as menu_definitions_count;

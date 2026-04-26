-- ============================================================
-- 修复权限总览中功能点显示为 0/0 的问题
-- 补充 package_product_features 表的数据
-- ============================================================

-- ============================================================
-- 为缺少功能配置的产品添加默认的 product_features
-- ============================================================
SELECT 'Checking and adding missing product_features...' AS status;

-- 为 stairs_basic 产品添加默认功能
INSERT IGNORE INTO product_features (product_id, feature_id, config_value, is_required, is_enabled, created_at, updated_at)
SELECT 'd7420b12-3d07-11f1-be46-7db6195c8277', 'checkin.stairs', 'true', 1, 1, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM product_features
    WHERE product_id = 'd7420b12-3d07-11f1-be46-7db6195c8277' AND feature_id = 'checkin.stairs'
);

INSERT IGNORE INTO product_features (product_id, feature_id, config_value, is_required, is_enabled, created_at, updated_at)
SELECT 'd7420b12-3d07-11f1-be46-7db6195c8277', 'points.exchange', 'true', 0, 1, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM product_features
    WHERE product_id = 'd7420b12-3d07-11f1-be46-7db6195c8277' AND feature_id = 'points.exchange'
);

-- 为 stairs_pro 产品添加默认功能
INSERT IGNORE INTO product_features (product_id, feature_id, config_value, is_required, is_enabled, created_at, updated_at)
SELECT 'd7420eb4-3d07-11f1-be46-7db6195c8277', 'checkin.stairs', 'true', 1, 1, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM product_features
    WHERE product_id = 'd7420eb4-3d07-11f1-be46-7db6195c8277' AND feature_id = 'checkin.stairs'
);

INSERT IGNORE INTO product_features (product_id, feature_id, config_value, is_required, is_enabled, created_at, updated_at)
SELECT 'd7420eb4-3d07-11f1-be46-7db6195c8277', 'points.exchange', 'true', 0, 1, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM product_features
    WHERE product_id = 'd7420eb4-3d07-11f1-be46-7db6195c8277' AND feature_id = 'points.exchange'
);

INSERT IGNORE INTO product_features (product_id, feature_id, config_value, is_required, is_enabled, created_at, updated_at)
SELECT 'd7420eb4-3d07-11f1-be46-7db6195c8277', 'mall.virtual', 'true', 0, 1, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM product_features
    WHERE product_id = 'd7420eb4-3d07-11f1-be46-7db6195c8277' AND feature_id = 'mall.virtual'
);

-- 为 walking_pro 产品添加默认功能
INSERT IGNORE INTO product_features (product_id, feature_id, config_value, is_required, is_enabled, created_at, updated_at)
SELECT 'd74211de-3d07-11f1-be46-7db6195c8277', 'checkin.walking', 'true', 1, 1, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM product_features
    WHERE product_id = 'd74211de-3d07-11f1-be46-7db6195c8277' AND feature_id = 'checkin.walking'
);

INSERT IGNORE INTO product_features (product_id, feature_id, config_value, is_required, is_enabled, created_at, updated_at)
SELECT 'd74211de-3d07-11f1-be46-7db6195c8277', 'points.exchange', 'true', 0, 1, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM product_features
    WHERE product_id = 'd74211de-3d07-11f1-be46-7db6195c8277' AND feature_id = 'points.exchange'
);

INSERT IGNORE INTO product_features (product_id, feature_id, config_value, is_required, is_enabled, created_at, updated_at)
SELECT 'd74211de-3d07-11f1-be46-7db6195c8277', 'mall.virtual', 'true', 0, 1, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM product_features
    WHERE product_id = 'd74211de-3d07-11f1-be46-7db6195c8277' AND feature_id = 'mall.virtual'
);

-- 为 walking 产品添加默认功能（确保有数据）
INSERT IGNORE INTO product_features (product_id, feature_id, config_value, is_required, is_enabled, created_at, updated_at)
SELECT 'walking', 'checkin.walking', 'true', 1, 1, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM product_features
    WHERE product_id = 'walking' AND feature_id = 'checkin.walking'
);

INSERT IGNORE INTO product_features (product_id, feature_id, config_value, is_required, is_enabled, created_at, updated_at)
SELECT 'walking', 'points.exchange', 'true', 0, 1, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM product_features
    WHERE product_id = 'walking' AND feature_id = 'points.exchange'
);

INSERT IGNORE INTO product_features (product_id, feature_id, config_value, is_required, is_enabled, created_at, updated_at)
SELECT 'walking', 'mall.virtual', 'true', 0, 1, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM product_features
    WHERE product_id = 'walking' AND feature_id = 'mall.virtual'
);

-- ============================================================
-- 为每个套餐的每个产品添加功能配置
-- 使用 product_features 表中的默认配置
-- ============================================================
SELECT 'Adding package_product_features data...' AS status;

-- 为所有套餐的所有产品添加功能配置
INSERT IGNORE INTO package_product_features (package_id, product_id, feature_id, config_value, is_enabled, is_customized, created_at, updated_at)
SELECT pp.package_id, pp.product_id, pf.feature_id, pf.config_value, pf.is_enabled, 0, NOW(), NOW()
FROM package_products pp
JOIN product_features pf ON pp.product_id = pf.product_id
WHERE pp.package_id IN (1, 2, 3);

-- ============================================================
-- 验证结果
-- ============================================================
SELECT 'Verifying package_product_features data...' AS status;

SELECT
    pp.package_id,
    pkg.code AS package_code,
    pkg.name AS package_name,
    pp.product_id,
    p.code AS product_code,
    p.name AS product_name,
    COUNT(ppf.feature_id) AS feature_count
FROM package_products pp
JOIN permission_packages pkg ON pp.package_id = pkg.id
JOIN platform_products p ON pp.product_id = p.id
LEFT JOIN package_product_features ppf ON pp.package_id = ppf.package_id AND pp.product_id = ppf.product_id
WHERE pp.package_id IN (1, 2, 3)
GROUP BY pp.package_id, pkg.code, pkg.name, pp.product_id, p.code, p.name
ORDER BY pp.package_id, pp.product_id;

-- 查看详细的功能配置
SELECT
    ppf.package_id,
    pkg.code AS package_code,
    p.code AS product_code,
    f.code AS feature_code,
    f.name AS feature_name,
    ppf.is_enabled
FROM package_product_features ppf
JOIN permission_packages pkg ON ppf.package_id = pkg.id
JOIN platform_products p ON ppf.product_id = p.id
JOIN features f ON ppf.feature_id = f.id
WHERE ppf.package_id IN (1, 2, 3)
ORDER BY ppf.package_id, pp.product_id, f.code;

SELECT 'Done! The permission overview should now display correct feature counts.' AS status;

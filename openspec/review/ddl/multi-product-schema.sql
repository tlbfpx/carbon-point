-- ============================================================
-- Carbon Point 多产品扩展 Schema
-- 包含: 产品功能关联、套餐产品关联、租户产品配置、步行打卡、积分流水扩展
-- 日期: 2026-04-19
-- 说明: 配合 Task Group 7 数据库 Schema 任务，DDL 参考文件
-- 引擎: InnoDB / 字符集: utf8mb4 / 排序: utf8mb4_unicode_ci
-- ============================================================

-- ============================================================
-- 7.1 product_features — 平台产品与功能点关联
-- Java Entity: ProductFeatureEntity → @TableName("product_features")
-- ============================================================
CREATE TABLE IF NOT EXISTS product_features (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id      VARCHAR(36) NOT NULL COMMENT '平台产品ID，关联 platform_products.id',
    feature_id      VARCHAR(36) NOT NULL COMMENT '功能点ID，关联 features.id',
    config_value    VARCHAR(500) COMMENT '功能点的默认配置值',
    is_required     TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否为产品必需功能: 0=可选, 1=必需',
    is_enabled      TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用: 0=禁用, 1=启用',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=正常, 1=已删除',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    UNIQUE KEY uk_product_feature (product_id, feature_id),
    INDEX idx_product_id (product_id),
    INDEX idx_feature_id (feature_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品功能关联表';

-- ============================================================
-- 7.2 package_products — 权限套餐与平台产品 M:N 关联
-- Java Entity: PackageProductEntity → @TableName("package_products")
-- ============================================================
CREATE TABLE IF NOT EXISTS package_products (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    package_id      BIGINT NOT NULL COMMENT '权限套餐ID，关联 permission_packages.id',
    product_id      VARCHAR(36) NOT NULL COMMENT '平台产品ID，关联 platform_products.id',
    sort_order      INT NOT NULL DEFAULT 0 COMMENT '展示排序',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=正常, 1=已删除',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    UNIQUE KEY uk_package_product (package_id, product_id),
    INDEX idx_package_id (package_id),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐产品关联表';

-- ============================================================
-- 7.3 package_product_features — 套餐级产品功能配置（覆盖产品默认值）
-- Java Entity: PackageProductFeatureEntity → @TableName("package_product_features")
-- ============================================================
CREATE TABLE IF NOT EXISTS package_product_features (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    package_id      BIGINT NOT NULL COMMENT '权限套餐ID，关联 permission_packages.id',
    product_id      VARCHAR(36) NOT NULL COMMENT '平台产品ID，关联 platform_products.id',
    feature_id      VARCHAR(36) NOT NULL COMMENT '功能点ID，关联 features.id',
    config_value    VARCHAR(500) COMMENT '自定义配置值（覆盖产品默认值）',
    is_enabled      TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用: 0=禁用, 1=启用',
    is_customized   TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已自定义（与产品默认值不同）: 0=继承默认, 1=已自定义',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=正常, 1=已删除',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    UNIQUE KEY uk_package_product_feature (package_id, product_id, feature_id),
    INDEX idx_package_id (package_id),
    INDEX idx_product_id (product_id),
    INDEX idx_feature_id (feature_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐产品功能配置表';

-- ============================================================
-- 7.4 product_configs — 租户级产品启用/配置
-- ============================================================
CREATE TABLE IF NOT EXISTS product_configs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL COMMENT '租户ID，关联 tenants.id',
    product_id      VARCHAR(36) NOT NULL COMMENT '平台产品ID，关联 platform_products.id',
    enabled         TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用: 0=禁用, 1=启用',
    config_json     JSON COMMENT '产品级配置JSON（如步数目标、时间段等）',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=正常, 1=已删除',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    UNIQUE KEY uk_tenant_product (tenant_id, product_id),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户产品配置表';

-- ============================================================
-- 7.5 product_feature_configs — 租户级产品功能开关
-- ============================================================
CREATE TABLE IF NOT EXISTS product_feature_configs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL COMMENT '租户ID，关联 tenants.id',
    product_id      VARCHAR(36) NOT NULL COMMENT '平台产品ID，关联 platform_products.id',
    feature_id      VARCHAR(36) NOT NULL COMMENT '功能点ID，关联 features.id',
    enabled         TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用: 0=禁用, 1=启用',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=正常, 1=已删除',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    UNIQUE KEY uk_tenant_product_feature (tenant_id, product_id, feature_id),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_product_id (product_id),
    INDEX idx_feature_id (feature_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户产品功能配置表';

-- ============================================================
-- 7.6 step_daily_records — 步行产品：每日步数记录
-- ============================================================
CREATE TABLE IF NOT EXISTS step_daily_records (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL COMMENT '租户ID，关联 tenants.id',
    user_id         BIGINT NOT NULL COMMENT '用户ID，关联 users.id',
    record_date     DATE NOT NULL COMMENT '记录日期',
    step_count      INT NOT NULL DEFAULT 0 COMMENT '步数',
    points_awarded  INT NOT NULL DEFAULT 0 COMMENT '已发放积分',
    claimed         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=未领取, 1=已领取积分',
    source          VARCHAR(20) COMMENT '数据来源: werun/healthkit/health_connect',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=正常, 1=已删除',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    UNIQUE KEY uk_user_date (user_id, record_date),
    INDEX idx_tenant_date (tenant_id, record_date),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日步数记录表';

-- ============================================================
-- 7.7 ALTER point_transactions — 添加产品编码和来源类型
-- ============================================================
-- 加列（idempotent: 仅在列不存在时添加）
DROP PROCEDURE IF EXISTS add_columns_to_point_transactions;
DELIMITER //
CREATE PROCEDURE add_columns_to_point_transactions()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'point_transactions'
          AND COLUMN_NAME = 'product_code'
    ) THEN
        ALTER TABLE point_transactions ADD COLUMN product_code VARCHAR(50) DEFAULT NULL
            COMMENT '产品编码: stair_climbing/walking/...' AFTER type;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'point_transactions'
          AND COLUMN_NAME = 'source_type'
    ) THEN
        ALTER TABLE point_transactions ADD COLUMN source_type VARCHAR(50) DEFAULT NULL
            COMMENT '来源类型: check_in/steps_claimed/streak_bonus/...' AFTER product_code;
    END IF;
END //
DELIMITER ;
CALL add_columns_to_point_transactions();
DROP PROCEDURE IF EXISTS add_columns_to_point_transactions;

-- 索引（idempotent: 仅在索引不存在时创建）
DROP PROCEDURE IF EXISTS add_pt_indexes;
DELIMITER //
CREATE PROCEDURE add_pt_indexes()
BEGIN
    DECLARE idx_exists INT DEFAULT 0;

    SELECT COUNT(*) INTO idx_exists
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'point_transactions'
      AND index_name = 'idx_product_code';
    IF idx_exists = 0 THEN
        ALTER TABLE point_transactions ADD INDEX idx_product_code (product_code);
    END IF;

    SET idx_exists = 0;
    SELECT COUNT(*) INTO idx_exists
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'point_transactions'
      AND index_name = 'idx_source_type';
    IF idx_exists = 0 THEN
        ALTER TABLE point_transactions ADD INDEX idx_source_type (source_type);
    END IF;
END //
DELIMITER ;
CALL add_pt_indexes();
DROP PROCEDURE IF EXISTS add_pt_indexes;

-- 回填: 已有打卡积分记录 → stair_climbing
UPDATE point_transactions
SET product_code = 'stair_climbing'
WHERE product_code IS NULL
  AND type IN ('check_in', 'streak_bonus');

-- 回填: 已有兑换积分记录 → exchange
UPDATE point_transactions
SET product_code = 'exchange'
WHERE product_code IS NULL
  AND type = 'exchange';

-- 回填: 来源类型与类型一致
UPDATE point_transactions
SET source_type = type
WHERE source_type IS NULL;

-- ============================================================
-- 7.8 种子数据: 平台产品 — 爬楼梯 & 步行
-- INSERT IGNORE 保证幂等
-- ============================================================
INSERT IGNORE INTO platform_products (id, code, name, category, description, status, sort_order) VALUES
('stair_climbing', 'stair_climbing', '爬楼梯打卡', 'stairs_climbing', '员工爬楼梯打卡获取积分', 1, 1),
('walking',        'walking',        '步行打卡',   'walking',         '员工步行打卡获取积分，支持微信运动/HealthKit/Health Connect', 1, 2);

-- ============================================================
-- 7.9 种子数据: 产品功能关联 (product_features)
-- 使用子查询从 platform_products / features 按 code 关联，保证幂等
-- ============================================================

-- 爬楼梯产品 → 爬楼梯打卡功能
INSERT INTO product_features (product_id, feature_id, config_value, is_required, is_enabled)
SELECT pp.id, f.id, 'true', 1, 1
FROM platform_products pp
CROSS JOIN features f
WHERE pp.code = 'stair_climbing'
  AND f.code = 'checkin.stairs'
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- 爬楼梯产品 → 积分兑换功能
INSERT INTO product_features (product_id, feature_id, config_value, is_required, is_enabled)
SELECT pp.id, f.id, 'true', 0, 1
FROM platform_products pp
CROSS JOIN features f
WHERE pp.code = 'stair_climbing'
  AND f.code = 'points.exchange'
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- 步行产品 → 步行打卡功能
INSERT INTO product_features (product_id, feature_id, config_value, is_required, is_enabled)
SELECT pp.id, f.id, 'true', 1, 1
FROM platform_products pp
CROSS JOIN features f
WHERE pp.code = 'walking'
  AND f.code = 'checkin.walking'
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- 步行产品 → 积分兑换功能
INSERT INTO product_features (product_id, feature_id, config_value, is_required, is_enabled)
SELECT pp.id, f.id, 'true', 0, 1
FROM platform_products pp
CROSS JOIN features f
WHERE pp.code = 'walking'
  AND f.code = 'points.exchange'
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- 步行产品 → 虚拟商品兑换功能
INSERT INTO product_features (product_id, feature_id, config_value, is_required, is_enabled)
SELECT pp.id, f.id, 'true', 0, 1
FROM platform_products pp
CROSS JOIN features f
WHERE pp.code = 'walking'
  AND f.code = 'mall.virtual'
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- ============================================================
-- 7.10 种子数据: 套餐产品关联 (package_products)
-- free  → 仅爬楼梯
-- pro   → 爬楼梯 + 步行
-- enterprise → 爬楼梯 + 步行
-- ============================================================

-- free 套餐 → 爬楼梯
INSERT INTO package_products (package_id, product_id, sort_order)
SELECT ppkg.id, pp.id, 1
FROM permission_packages ppkg
CROSS JOIN platform_products pp
WHERE ppkg.code = 'free'
  AND pp.code = 'stair_climbing'
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order);

-- pro 套餐 → 爬楼梯
INSERT INTO package_products (package_id, product_id, sort_order)
SELECT ppkg.id, pp.id, 1
FROM permission_packages ppkg
CROSS JOIN platform_products pp
WHERE ppkg.code = 'pro'
  AND pp.code = 'stair_climbing'
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order);

-- pro 套餐 → 步行
INSERT INTO package_products (package_id, product_id, sort_order)
SELECT ppkg.id, pp.id, 2
FROM permission_packages ppkg
CROSS JOIN platform_products pp
WHERE ppkg.code = 'pro'
  AND pp.code = 'walking'
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order);

-- enterprise 套餐 → 爬楼梯
INSERT INTO package_products (package_id, product_id, sort_order)
SELECT ppkg.id, pp.id, 1
FROM permission_packages ppkg
CROSS JOIN platform_products pp
WHERE ppkg.code = 'enterprise'
  AND pp.code = 'stair_climbing'
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order);

-- enterprise 套餐 → 步行
INSERT INTO package_products (package_id, product_id, sort_order)
SELECT ppkg.id, pp.id, 2
FROM permission_packages ppkg
CROSS JOIN platform_products pp
WHERE ppkg.code = 'enterprise'
  AND pp.code = 'walking'
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order);

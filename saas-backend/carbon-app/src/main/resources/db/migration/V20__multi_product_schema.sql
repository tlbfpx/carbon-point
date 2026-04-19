-- ============================================================
-- V20: Multi-product schema — create platform tables, add columns
-- Covers: product_features, package_products, package_product_features,
--         product_configs, product_feature_configs, step_daily_records,
--         point_transactions extensions
-- ============================================================

-- ── 1. product_features ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_features (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id      VARCHAR(36) NOT NULL COMMENT '平台产品ID',
    feature_id      VARCHAR(36) NOT NULL COMMENT '功能点ID',
    config_value    VARCHAR(500) COMMENT '功能点默认配置值',
    is_required     TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=可选, 1=必需',
    is_enabled      TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0=禁用, 1=启用',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=正常, 1=已删除',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_product_feature (product_id, feature_id),
    INDEX idx_product_id (product_id),
    INDEX idx_feature_id (feature_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品功能关联表';

-- ── 2. package_products ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS package_products (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    package_id      BIGINT NOT NULL COMMENT '权限套餐ID',
    product_id      VARCHAR(36) NOT NULL COMMENT '平台产品ID(UUID)',
    sort_order      INT NOT NULL DEFAULT 0 COMMENT '展示排序',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=正常, 1=已删除',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_package_product (package_id, product_id),
    INDEX idx_package_id (package_id),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐产品关联表';

-- ── 3. package_product_features ─────────────────────────────────
CREATE TABLE IF NOT EXISTS package_product_features (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    package_id      BIGINT NOT NULL COMMENT '权限套餐ID',
    product_id      VARCHAR(36) NOT NULL COMMENT '平台产品ID',
    feature_id      VARCHAR(36) NOT NULL COMMENT '功能点ID',
    config_value    VARCHAR(500) COMMENT '自定义配置值',
    is_enabled      TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0=禁用, 1=启用',
    is_customized   TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=继承默认, 1=已自定义',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=正常, 1=已删除',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_package_product_feature (package_id, product_id, feature_id),
    INDEX idx_package_id (package_id),
    INDEX idx_product_id (product_id),
    INDEX idx_feature_id (feature_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐产品功能配置表';

-- ── 4. product_configs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_configs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL COMMENT '租户ID',
    product_id      VARCHAR(36) NOT NULL COMMENT '平台产品ID',
    enabled         TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0=禁用, 1=启用',
    config_json     JSON COMMENT '产品级配置JSON',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=正常, 1=已删除',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_tenant_product (tenant_id, product_id),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户产品配置表';

-- ── 5. product_feature_configs ──────────────────────────────────
CREATE TABLE IF NOT EXISTS product_feature_configs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL COMMENT '租户ID',
    product_id      VARCHAR(36) NOT NULL COMMENT '平台产品ID',
    feature_id      VARCHAR(36) NOT NULL COMMENT '功能点ID',
    enabled         TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0=禁用, 1=启用',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=正常, 1=已删除',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_tenant_product_feature (tenant_id, product_id, feature_id),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_product_id (product_id),
    INDEX idx_feature_id (feature_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户产品功能配置表';

-- ── 6. step_daily_records ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS step_daily_records (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL COMMENT '租户ID',
    user_id         BIGINT NOT NULL COMMENT '用户ID',
    record_date     DATE NOT NULL COMMENT '记录日期',
    step_count      INT NOT NULL DEFAULT 0 COMMENT '步数',
    points_awarded  INT NOT NULL DEFAULT 0 COMMENT '已发放积分',
    claimed         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=未领取, 1=已领取积分',
    source          VARCHAR(20) COMMENT '数据来源: werun/healthkit/health_connect',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=正常, 1=已删除',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_user_date (user_id, record_date),
    INDEX idx_tenant_date (tenant_id, record_date),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日步数记录表';

-- ── 7. ALTER point_transactions ─────────────────────────────────
-- Idempotent: only add columns if they don't exist

DROP PROCEDURE IF EXISTS V20_add_pt_columns;
DELIMITER //
CREATE PROCEDURE V20_add_pt_columns()
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

    -- Add indexes if missing
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'point_transactions'
          AND INDEX_NAME = 'idx_pt_product_code'
    ) THEN
        ALTER TABLE point_transactions ADD INDEX idx_pt_product_code (product_code);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'point_transactions'
          AND INDEX_NAME = 'idx_pt_source_type'
    ) THEN
        ALTER TABLE point_transactions ADD INDEX idx_pt_source_type (source_type);
    END IF;
END //
DELIMITER ;
CALL V20_add_pt_columns();
DROP PROCEDURE IF EXISTS V20_add_pt_columns;

-- ── 8. Add deleted column to platform_products (if missing) ─────
DROP PROCEDURE IF EXISTS V20_add_platform_products_deleted;
DELIMITER //
CREATE PROCEDURE V20_add_platform_products_deleted()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'platform_products'
          AND COLUMN_NAME = 'deleted'
    ) THEN
        ALTER TABLE platform_products ADD COLUMN deleted TINYINT(1) NOT NULL DEFAULT 0
            COMMENT '0=正常, 1=已删除' AFTER sort_order;
    END IF;
END //
DELIMITER ;
CALL V20_add_platform_products_deleted();
DROP PROCEDURE IF EXISTS V20_add_platform_products_deleted;

-- ── 9. Backfill existing point_transactions ─────────────────────
UPDATE point_transactions
SET product_code = 'stair_climbing'
WHERE product_code IS NULL
  AND type IN ('check_in', 'streak_bonus');

UPDATE point_transactions
SET product_code = 'exchange'
WHERE product_code IS NULL
  AND type = 'exchange';

UPDATE point_transactions
SET source_type = type
WHERE source_type IS NULL;

-- ============================================================
-- Carbon Point 批量数据迁移脚本
-- 版本: V2.2
-- 说明: 从旧架构批量迁移数据到新统一资源架构
-- 前置条件: V2__unified_resource_architecture.sql 已执行
-- ============================================================

-- ============================================================
-- 迁移前准备: 创建旧表备份（如果不存在）
-- ============================================================

-- 备份旧平台产品表
CREATE TABLE IF NOT EXISTS platform_products_old AS SELECT * FROM platform_products WHERE 1=0;
-- 备份旧商城商品表
CREATE TABLE IF NOT EXISTS platform_mall_products_old AS SELECT * FROM platform_mall_products WHERE 1=0;
-- 备份旧功能点表
CREATE TABLE IF NOT EXISTS product_features_old AS SELECT * FROM features WHERE 1=0;
-- 备份旧租户产品配置表
CREATE TABLE IF NOT EXISTS product_configs_old AS SELECT * FROM product_configs WHERE 1=0;
-- 备份旧租户商品货架表
CREATE TABLE IF NOT EXISTS tenant_product_shelf_old AS SELECT * FROM tenant_product_shelf WHERE 1=0;

-- ============================================================
-- 0. 创建迁移控制表
-- ============================================================
CREATE TABLE IF NOT EXISTS migration_control (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    migration_name VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    started_at TIMESTAMP(3) NULL,
    completed_at TIMESTAMP(3) NULL,
    records_processed BIGINT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_status (status),
    INDEX idx_migration_name (migration_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='迁移控制表';

-- ============================================================
-- 1. 迁移平台资源 - 从旧产品/功能/权限组映射
-- ============================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS migrate_platform_resources()
BEGIN
    DECLARE v_started INT DEFAULT 0;
    DECLARE v_count INT DEFAULT 0;
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
        @p1 = MESSAGE_TEXT;
        UPDATE migration_control
        SET status = 'FAILED',
            error_message = @p1,
            completed_at = CURRENT_TIMESTAMP(3)
        WHERE migration_name = 'platform_resources';
    END;

    -- 检查是否已迁移
    IF EXISTS (SELECT 1 FROM migration_control WHERE migration_name = 'platform_resources' AND status = 'COMPLETED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'platform_resources already migrated';
    END IF;

    -- 开始迁移
    INSERT INTO migration_control (migration_name, status, started_at)
    VALUES ('platform_resources', 'IN_PROGRESS', CURRENT_TIMESTAMP(3));
    SET v_started = 1;

    -- 迁移功能产品到平台资源
    INSERT IGNORE INTO platform_resources (id, code, type, name, category, description, status, sort_order, created_at, updated_at)
    SELECT
        UUID_TO_BIN(UUID()),
        CONCAT('PRODUCT_', UPPER(REPLACE(code, '-', '_'))),
        'FUNCTION_PRODUCT',
        name,
        category,
        description,
        CASE WHEN status = 1 THEN 'ENABLED' ELSE 'DISABLED' END,
        sort_order,
        created_at,
        updated_at
    FROM platform_products_old;

    -- 迁移功能点到平台资源
    INSERT IGNORE INTO platform_resources (id, code, type, name, category, description, status, sort_order, created_at, updated_at)
    SELECT
        UUID_TO_BIN(UUID()),
        CONCAT('FEATURE_', UPPER(REPLACE(code, '.', '_'))),
        'FEATURE',
        name,
        NULL,
        description,
        'ENABLED',
        sort_order,
        created_at,
        updated_at
    FROM product_features_old;

    -- 获取处理记录数
    SELECT COUNT(*) INTO v_count FROM platform_resources;

    -- 更新迁移状态
    UPDATE migration_control
    SET status = 'COMPLETED',
        completed_at = CURRENT_TIMESTAMP(3),
        records_processed = v_count
    WHERE migration_name = 'platform_resources';

    SELECT CONCAT('platform_resources migrated: ', v_count, ' records') AS result;
END //

DELIMITER ;

-- ============================================================
-- 2. 迁移套餐资源关联
-- ============================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS migrate_package_resources()
BEGIN
    DECLARE v_started INT DEFAULT 0;
    DECLARE v_count INT DEFAULT 0;
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
        @p1 = MESSAGE_TEXT;
        UPDATE migration_control
        SET status = 'FAILED',
            error_message = @p1,
            completed_at = CURRENT_TIMESTAMP(3)
        WHERE migration_name = 'package_resources';
    END;

    IF EXISTS (SELECT 1 FROM migration_control WHERE migration_name = 'package_resources' AND status = 'COMPLETED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'package_resources already migrated';
    END IF;

    INSERT INTO migration_control (migration_name, status, started_at)
    VALUES ('package_resources', 'IN_PROGRESS', CURRENT_TIMESTAMP(3));
    SET v_started = 1;

    -- 从旧套餐产品关联迁移
    INSERT IGNORE INTO package_resources (package_id, resource_code, is_required, sort_order, created_at)
    SELECT
        pp.package_id,
        CONCAT('PRODUCT_', UPPER(REPLACE(p.code, '-', '_'))),
        TRUE,
        pp.sort_order,
        CURRENT_TIMESTAMP(3)
    FROM package_products_old pp
    JOIN platform_products_old p ON pp.product_id = p.id
    JOIN permission_packages pkg ON pp.package_id = pkg.id;

    -- 从旧套餐功能关联迁移
    INSERT IGNORE INTO package_resources (package_id, resource_code, is_required, sort_order, created_at)
    SELECT
        ppf.package_id,
        CONCAT('FEATURE_', UPPER(REPLACE(f.code, '.', '_'))),
        ppf.is_required,
        ppf.sort_order,
        CURRENT_TIMESTAMP(3)
    FROM package_product_features_old ppf
    JOIN product_features_old f ON ppf.feature_id = f.id
    JOIN permission_packages pkg ON ppf.package_id = pkg.id;

    SELECT COUNT(*) INTO v_count FROM package_resources;

    UPDATE migration_control
    SET status = 'COMPLETED',
        completed_at = CURRENT_TIMESTAMP(3),
        records_processed = v_count
    WHERE migration_name = 'package_resources';

    SELECT CONCAT('package_resources migrated: ', v_count, ' records') AS result;
END //

DELIMITER ;

-- ============================================================
-- 3. 迁移租户套餐
-- ============================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS migrate_tenant_packages()
BEGIN
    DECLARE v_started INT DEFAULT 0;
    DECLARE v_count INT DEFAULT 0;
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
        @p1 = MESSAGE_TEXT;
        UPDATE migration_control
        SET status = 'FAILED',
            error_message = @p1,
            completed_at = CURRENT_TIMESTAMP(3)
        WHERE migration_name = 'tenant_packages';
    END;

    IF EXISTS (SELECT 1 FROM migration_control WHERE migration_name = 'tenant_packages' AND status = 'COMPLETED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'tenant_packages already migrated';
    END IF;

    INSERT INTO migration_control (migration_name, status, started_at)
    VALUES ('tenant_packages', 'IN_PROGRESS', CURRENT_TIMESTAMP(3));
    SET v_started = 1;

    -- 为每个租户创建套餐关联
    INSERT IGNORE INTO tenant_packages (tenant_id, package_id, status, starts_at, created_at, updated_at)
    SELECT
        t.id,
        CASE t.package_type
            WHEN 'free' THEN (SELECT id FROM permission_packages WHERE code = 'FREE')
            WHEN 'pro' THEN (SELECT id FROM permission_packages WHERE code = 'PRO')
            WHEN 'enterprise' THEN (SELECT id FROM permission_packages WHERE code = 'ENTERPRISE')
            ELSE (SELECT id FROM permission_packages WHERE code = 'FREE')
        END,
        'ACTIVE',
        COALESCE(t.created_at, CURRENT_TIMESTAMP(3)),
        COALESCE(t.created_at, CURRENT_TIMESTAMP(3)),
        CURRENT_TIMESTAMP(3)
    FROM tenants t
    WHERE t.package_id IS NULL;

    -- 更新租户表
    UPDATE tenants t
    JOIN tenant_packages tp ON t.id = tp.tenant_id AND tp.status = 'ACTIVE'
    SET t.package_id = tp.package_id
    WHERE t.package_id IS NULL;

    SELECT COUNT(*) INTO v_count FROM tenant_packages;

    UPDATE migration_control
    SET status = 'COMPLETED',
        completed_at = CURRENT_TIMESTAMP(3),
        records_processed = v_count
    WHERE migration_name = 'tenant_packages';

    SELECT CONCAT('tenant_packages migrated: ', v_count, ' records') AS result;
END //

DELIMITER ;

-- ============================================================
-- 4. 迁移租户资源配置
-- ============================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS migrate_tenant_resource_configs()
BEGIN
    DECLARE v_started INT DEFAULT 0;
    DECLARE v_count INT DEFAULT 0;
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
        @p1 = MESSAGE_TEXT;
        UPDATE migration_control
        SET status = 'FAILED',
            error_message = @p1,
            completed_at = CURRENT_TIMESTAMP(3)
        WHERE migration_name = 'tenant_resource_configs';
    END;

    IF EXISTS (SELECT 1 FROM migration_control WHERE migration_name = 'tenant_resource_configs' AND status = 'COMPLETED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'tenant_resource_configs already migrated';
    END IF;

    INSERT INTO migration_control (migration_name, status, started_at)
    VALUES ('tenant_resource_configs', 'IN_PROGRESS', CURRENT_TIMESTAMP(3));
    SET v_started = 1;

    -- 从租户产品配置迁移
    INSERT IGNORE INTO tenant_resource_configs (tenant_id, resource_code, enabled, config, created_at, updated_at)
    SELECT
        pc.tenant_id,
        CONCAT('PRODUCT_', UPPER(REPLACE(pc.product_code, '-', '_'))),
        pc.enabled,
        pc.config_json,
        pc.created_at,
        pc.updated_at
    FROM product_configs_old pc;

    -- 为所有租户自动创建套餐包含的资源配置
    INSERT IGNORE INTO tenant_resource_configs (tenant_id, resource_code, enabled, created_at, updated_at)
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

    SELECT COUNT(*) INTO v_count FROM tenant_resource_configs;

    UPDATE migration_control
    SET status = 'COMPLETED',
        completed_at = CURRENT_TIMESTAMP(3),
        records_processed = v_count
    WHERE migration_name = 'tenant_resource_configs';

    SELECT CONCAT('tenant_resource_configs migrated: ', v_count, ' records') AS result;
END //

DELIMITER ;

-- ============================================================
-- 执行迁移的主存储过程
-- ============================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS execute_bulk_migration()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 按顺序执行各迁移步骤
    CALL migrate_platform_resources();
    CALL migrate_package_resources();
    CALL migrate_tenant_packages();
    CALL migrate_tenant_resource_configs();

    COMMIT;

    SELECT 'Bulk migration completed successfully' AS final_result;
END //

DELIMITER ;

-- ============================================================
-- 验证迁移结果
-- ============================================================
CREATE OR REPLACE VIEW migration_validation AS
SELECT
    mc.migration_name,
    mc.status,
    mc.records_processed,
    mc.started_at,
    mc.completed_at,
    TIMESTAMPDIFF(SECOND, mc.started_at, mc.completed_at) AS duration_seconds,
    mc.error_message
FROM migration_control mc
ORDER BY mc.id;

-- ============================================================
-- 使用说明:
-- 1. 确保已执行 V2__unified_resource_architecture.sql
-- 2. 将旧数据填充到 *_old 备份表中
-- 3. 执行: CALL execute_bulk_migration();
-- 4. 查看结果: SELECT * FROM migration_validation;
-- ============================================================

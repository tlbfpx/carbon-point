-- ============================================================
-- Flyway V1: Schema Optimization Migration
-- Adds soft-delete columns, indexes, tenant_id on user_badges,
-- and backfills user_badges.tenant_id from users table.
-- ============================================================

-- ============================================================
-- 1. Add `deleted` column (INTEGER, DEFAULT 0) to all tables
--    These are idempotent: column is added only if it doesn't exist.
-- ============================================================

-- tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记';

-- users
ALTER TABLE users ADD COLUMN IF NOT EXISTS `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记';

-- permissions
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记';

-- roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记';

-- user_roles
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记';

-- role_permissions
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记';

-- tenant_invitations
ALTER TABLE tenant_invitations ADD COLUMN IF NOT EXISTS `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记';

-- check_in_records
ALTER TABLE check_in_records ADD COLUMN IF NOT EXISTS `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记';

-- time_slot_rules
ALTER TABLE time_slot_rules ADD COLUMN IF NOT EXISTS `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记';

-- point_rules
ALTER TABLE point_rules ADD COLUMN IF NOT EXISTS `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记';

-- products
ALTER TABLE products ADD COLUMN IF NOT EXISTS `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记';

-- exchange_orders
ALTER TABLE exchange_orders ADD COLUMN IF NOT EXISTS `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记';

-- departments
ALTER TABLE departments ADD COLUMN IF NOT EXISTS `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记';

-- badge_definitions
ALTER TABLE badge_definitions ADD COLUMN IF NOT EXISTS `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记';

-- user_badges
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记';

-- ============================================================
-- 2. Add `tenant_id` column on user_badges (idempotent)
-- ============================================================
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS `tenant_id` BIGINT NOT NULL DEFAULT 0 COMMENT '所属租户';

-- ============================================================
-- 3. Backfill user_badges.tenant_id from users.tenant_id
-- ============================================================
UPDATE user_badges ub
INNER JOIN users u ON ub.user_id = u.id
SET ub.tenant_id = u.tenant_id
WHERE ub.tenant_id = 0 OR ub.tenant_id IS NULL;

-- ============================================================
-- 4. Add indexes
--    All index additions are idempotent using ADD INDEX IF NOT EXISTS
--    Note: MySQL does not support IF NOT EXISTS for ADD INDEX natively.
--    We use a stored procedure pattern to make each idempotent.
-- ============================================================

-- Helper: add index if not exists (MySQL 8.0 compatible via procedure)
DROP PROCEDURE IF EXISTS add_index_if_not_exists;
DELIMITER //
CREATE PROCEDURE add_index_if_not_exists(
    IN p_table_name VARCHAR(64),
    IN p_index_name VARCHAR(64),
    IN p_index_def  VARCHAR(512)
)
BEGIN
    DECLARE idx_exists INT DEFAULT 0;
    SELECT COUNT(*) INTO idx_exists
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name   = p_table_name
      AND index_name   = p_index_name;
    IF idx_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', p_table_name, ' ADD INDEX ', p_index_name, p_index_def);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- Index: idx_tenant_date ON check_in_records (tenant_id, checkin_date)
-- Note: this is an alternative to the existing idx_tenant_date for date-only queries
CALL add_index_if_not_exists('check_in_records', 'idx_tenant_created', '(tenant_id, created_at)');

-- Index: idx_user_created ON check_in_records (user_id, created_at)
CALL add_index_if_not_exists('check_in_records', 'idx_user_created', '(user_id, created_at)');

-- Index: idx_user_created ON point_transactions (user_id, created_at)
CALL add_index_if_not_exists('point_transactions', 'idx_user_created', '(user_id, created_at)');

-- Index: idx_tenant_created ON point_transactions (tenant_id, created_at)
CALL add_index_if_not_exists('point_transactions', 'idx_tenant_created', '(tenant_id, created_at)');

-- Index: idx_tenant_user_status ON exchange_orders (tenant_id, user_id, order_status)
CALL add_index_if_not_exists('exchange_orders', 'idx_tenant_user_status', '(tenant_id, user_id, order_status)');

-- Note: uk_coupon (coupon_code) unique index already exists in schema.sql for exchange_orders.
-- It only applies where coupon_code IS NOT NULL (coupon-type orders).
-- No additional unique index needed.

-- Index: idx_role ON user_roles (role_id)
-- Note: idx_role already exists; procedure call below is a no-op for this table.
CALL add_index_if_not_exists('user_roles', 'idx_role', '(role_id)');

-- Index: idx_tenant_status ON products (tenant_id, status, sort_order)
CALL add_index_if_not_exists('products', 'idx_tenant_status', '(tenant_id, status, sort_order)');

-- Index: idx_tenant ON departments (tenant_id)
-- Note: idx_tenant already exists; procedure call below is a no-op for this table.
CALL add_index_if_not_exists('departments', 'idx_tenant', '(tenant_id)');

-- Index: idx_user ON user_badges (user_id)
-- Note: idx_user already exists in schema.sql; procedure call below is a no-op for this table.
CALL add_index_if_not_exists('user_badges', 'idx_user', '(user_id)');

-- ============================================================
-- 5. Clean up helper procedure
-- ============================================================
DROP PROCEDURE IF EXISTS add_index_if_not_exists;

-- ============================================================
-- Index Migration Script
-- Purpose: Add missing indexes for query performance optimization
-- Created: 2026-04-14
-- ============================================================

-- ============================================================
-- 1. check_in_records indexes
-- ============================================================

-- Add unique key for user + date (without time_slot_rule_id for simpler lookups)
-- Note: uk_user_date_slot already exists in schema as (user_id, checkin_date, time_slot_rule_id)
ALTER TABLE check_in_records ADD UNIQUE KEY uk_user_date (user_id, checkin_date);

-- Add index for tenant + created_at (missing in docs/review/ddl/carbon-point-schema.sql)
ALTER TABLE check_in_records ADD INDEX idx_tenant_created (tenant_id, created_at);

-- ============================================================
-- 2. point_transactions indexes
-- ============================================================

-- Add index for user + created_at (missing in docs/review/ddl/carbon-point-schema.sql)
ALTER TABLE point_transactions ADD INDEX idx_user_created (user_id, created_at);

-- Add index for tenant + created_at (missing in docs/review/ddl/carbon-point-schema.sql)
ALTER TABLE point_transactions ADD INDEX idx_tenant_created (tenant_id, created_at);

-- ============================================================
-- 3. exchange_orders indexes
-- ============================================================

-- Add composite index for tenant + user + status (missing in docs/review/ddl/carbon-point-schema.sql)
ALTER TABLE exchange_orders ADD INDEX idx_tenant_user_status (tenant_id, user_id, order_status);

-- Add unique key for coupon_code (missing in docs/review/ddl/carbon-point-schema.sql)
-- Note: coupon_code column may be NULL for non-coupon orders, so we handle this
ALTER TABLE exchange_orders ADD UNIQUE KEY uk_coupon (coupon_code);

-- ============================================================
-- 4. user_roles indexes
-- ============================================================

-- Add index for user_id (missing in docs/review/ddl/carbon-point-schema.sql)
ALTER TABLE user_roles ADD INDEX idx_user (user_id);

-- Add index for role_id (missing in docs/review/ddl/carbon-point-schema.sql)
ALTER TABLE user_roles ADD INDEX idx_role (role_id);

-- ============================================================
-- 5. role_permissions indexes
-- ============================================================

-- Add composite index for role_id + permission_code (missing in docs/review/ddl/carbon-point-schema.sql)
ALTER TABLE role_permissions ADD INDEX idx_role_permission (role_id, permission_code);

-- ============================================================
-- 6. products indexes
-- ============================================================

-- Add composite index for tenant + status + sort_order (missing in docs/review/ddl/carbon-point-schema.sql)
ALTER TABLE products ADD INDEX idx_tenant_status (tenant_id, status, sort_order);

-- ============================================================
-- 7. departments indexes
-- ============================================================

-- Add index for tenant_id (missing in docs/review/ddl/carbon-point-schema.sql)
ALTER TABLE departments ADD INDEX idx_tenant (tenant_id);

-- ============================================================
-- 8. user_badges indexes
-- ============================================================

-- Add index for user_id (missing in docs/review/ddl/carbon-point-schema.sql)
ALTER TABLE user_badges ADD INDEX idx_user (user_id);

-- ============================================================
-- Rollback (if needed)
-- ============================================================

-- -- Rollback statements for reverting these changes
-- ALTER TABLE check_in_records DROP KEY uk_user_date;
-- ALTER TABLE check_in_records DROP INDEX idx_tenant_created;
-- ALTER TABLE point_transactions DROP INDEX idx_user_created;
-- ALTER TABLE point_transactions DROP INDEX idx_tenant_created;
-- ALTER TABLE exchange_orders DROP INDEX idx_tenant_user_status;
-- ALTER TABLE exchange_orders DROP KEY uk_coupon;
-- ALTER TABLE user_roles DROP INDEX idx_user;
-- ALTER TABLE user_roles DROP INDEX idx_role;
-- ALTER TABLE role_permissions DROP INDEX idx_role_permission;
-- ALTER TABLE products DROP INDEX idx_tenant_status;
-- ALTER TABLE departments DROP INDEX idx_tenant;
-- ALTER TABLE user_badges DROP INDEX idx_user;

-- ============================================================
-- Flyway V9: Remove unused tenant_id column from user_roles
-- ============================================================
-- The UserRole.tenantId field was never used (no set/get calls in code).
-- Tenant isolation is handled via TenantLineInnerInterceptor and Role.tenantId.
-- Indexes idx_user_roles_tenant_id and idx_user_roles_user_tenant were created in V7.
-- They are also removed as they indexed a non-queryable column.
-- Drop them first (order matters for MySQL), then drop the column.

-- Indexes may not exist if table was never initialized — use pre-check
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_roles' AND INDEX_NAME = 'idx_user_roles_user_tenant');
SET @sqlstmt := IF(@exist > 0, 'DROP INDEX idx_user_roles_user_tenant ON user_roles', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_roles' AND INDEX_NAME = 'idx_user_roles_tenant_id');
SET @sqlstmt := IF(@exist > 0, 'DROP INDEX idx_user_roles_tenant_id ON user_roles', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE user_roles DROP COLUMN IF EXISTS tenant_id;

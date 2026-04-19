-- ============================================================
-- Flyway V12: Add package_id column to tenants table
-- Required by Tenant.java:25 (packageId field) and the permission-package RBAC design.
-- References: docs/review/ddl/permission-package-schema.sql §ALTER tenants
-- ============================================================

-- Add package_id column (idempotent: only runs if column doesn't exist)
SET @dbname = DATABASE();
SET @tablename = 'tenants';
SET @columnname = 'package_id';
SET @preparedStatement = (SELECT IF(
    (
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @dbname
          AND TABLE_NAME = @tablename
          AND COLUMN_NAME = @columnname
    ) > 0,
    'SELECT 1',
    'ALTER TABLE tenants ADD COLUMN package_id BIGINT COMMENT ''绑定的权限套餐ID，关联 permission_packages 表'' AFTER logo'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on package_id for fast lookup
SET @indexname = 'idx_package';
SET @idxStatement = (SELECT IF(
    (
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @dbname
          AND TABLE_NAME = @tablename
          AND INDEX_NAME = @indexname
          AND COLUMN_NAME = 'package_id'
    ) > 0,
    'SELECT 1',
    'ALTER TABLE tenants ADD INDEX idx_package (package_id)'
));
PREPARE idxStmt FROM @idxStatement;
EXECUTE idxStmt;
DEALLOCATE PREPARE idxStmt;

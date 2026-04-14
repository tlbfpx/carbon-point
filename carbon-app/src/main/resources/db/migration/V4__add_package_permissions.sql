-- ============================================================
-- Flyway V4: Add package_permissions Table
-- ============================================================

CREATE TABLE IF NOT EXISTS package_permissions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    package_id      BIGINT NOT NULL COMMENT '套餐ID',
    permission_code VARCHAR(60) NOT NULL COMMENT '权限编码',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_package_permission (package_id, permission_code),
    INDEX idx_package_id (package_id),
    INDEX idx_permission_code (permission_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐权限关联表';

-- Alter permission_packages: add max_users and drop tenant_id (idempotent)
DROP PROCEDURE IF EXISTS alter_permission_packages;
DELIMITER //
CREATE PROCEDURE alter_permission_packages()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'permission_packages'
          AND COLUMN_NAME = 'max_users'
    ) THEN
        ALTER TABLE permission_packages ADD COLUMN max_users INT NOT NULL DEFAULT 50 COMMENT '最大用户数' AFTER description;
    END IF;
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'permission_packages'
          AND COLUMN_NAME = 'tenant_id'
    ) THEN
        ALTER TABLE permission_packages DROP COLUMN tenant_id;
    END IF;
END //
DELIMITER ;
CALL alter_permission_packages();
DROP PROCEDURE IF EXISTS alter_permission_packages;

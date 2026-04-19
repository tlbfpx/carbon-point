-- ============================================================
-- V17: Create platform_roles table
-- Platform-level role definitions
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_roles (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    code                VARCHAR(50) NOT NULL UNIQUE COMMENT '角色编码',
    name                VARCHAR(100) NOT NULL COMMENT '角色名称',
    description         VARCHAR(200) COMMENT '角色描述',
    permission_codes    TEXT COMMENT '权限编码列表(JSON数组)',
    status              TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1=启用, 0=禁用',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_code (code),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='平台角色表';

INSERT INTO platform_roles (code, name, description, permission_codes, status) VALUES
('super_admin', '超级管理员', '平台超级管理员，拥有所有权限', '["*"]', 1),
('admin', '运营管理员', '平台运营管理员', '["tenant:manage", "package:manage", "product:manage", "feature:manage", "dict:manage", "role:manage", "admin:manage", "log:view"]', 1),
('viewer', '查看者', '只读查看者', '["log:view"]', 1);

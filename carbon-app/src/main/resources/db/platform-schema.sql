-- ============================================================
-- Platform Admin Module Schema
-- Phase 11: 平台运营后台后端
-- ============================================================

-- 平台配置表
CREATE TABLE IF NOT EXISTS platform_configs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    config_key      VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
    config_value    TEXT COMMENT '配置值（JSON字符串）',
    description     VARCHAR(200) COMMENT '配置描述',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='平台配置表';

-- 平台操作日志表
CREATE TABLE IF NOT EXISTS platform_operation_logs (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    admin_id            BIGINT NOT NULL COMMENT '平台管理员ID',
    admin_name          VARCHAR(50) NOT NULL COMMENT '管理员用户名',
    admin_role          VARCHAR(20) NOT NULL COMMENT '管理员角色',
    operation_type      VARCHAR(50) NOT NULL COMMENT '操作类型',
    operation_object    VARCHAR(100) COMMENT '操作对象描述',
    request_method      VARCHAR(10) COMMENT 'HTTP方法',
    request_url         VARCHAR(500) COMMENT '请求URL',
    request_params      TEXT COMMENT '请求参数',
    response_status     INT COMMENT '响应状态码',
    ip_address          VARCHAR(45) COMMENT '客户端IP',
    user_agent          VARCHAR(500) COMMENT 'User-Agent',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_admin_id (admin_id),
    INDEX idx_operation_type (operation_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='平台操作日志表';

-- 初始化平台管理员默认账号
-- 密码: admin123 (Argon2id hash, for demo/development only)
INSERT INTO platform_admins (username, password_hash, display_name, role, status)
VALUES ('admin', '$argon2id$v=19$m=65536,t=3,p=4$X09iamVsdXNlcm5hbWU$hWF0wFD7VHJlbWVtYmVyT2ZNaXNzaW5nQ29tbWVudHMh', '平台超级管理员', 'super_admin', 'active')
ON DUPLICATE KEY UPDATE username = username, password_hash = VALUES(password_hash), display_name = VALUES(display_name);

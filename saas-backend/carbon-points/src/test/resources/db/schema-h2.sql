-- H2 test schema for carbon-points module tests

CREATE TABLE IF NOT EXISTS tenants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    package_type VARCHAR(20) NOT NULL DEFAULT 'free',
    max_users INT NOT NULL DEFAULT 50,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    level_mode VARCHAR(20) NOT NULL DEFAULT 'strict',
    version BIGINT DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    avatar VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    level INT NOT NULL DEFAULT 1,
    total_points INT NOT NULL DEFAULT 0,
    available_points INT NOT NULL DEFAULT 0,
    frozen_points INT NOT NULL DEFAULT 0,
    consecutive_days INT NOT NULL DEFAULT 0,
    last_checkin_date DATE,
    department_id BIGINT,
    version BIGINT DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS point_rules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    type VARCHAR(30) NOT NULL,
    name VARCHAR(100),
    config TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS point_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    amount INT NOT NULL,
    type VARCHAR(30) NOT NULL,
    reference_id VARCHAR(64),
    product_code VARCHAR(50) DEFAULT NULL,
    source_type VARCHAR(50) DEFAULT NULL,
    balance_after INT NOT NULL,
    frozen_after INT NOT NULL DEFAULT 0,
    remark VARCHAR(200),
    expire_time DATETIME,
    version BIGINT DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Notification tables (needed by NotificationTrigger in LevelService)
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    type VARCHAR(30) NOT NULL,
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    reference_type VARCHAR(30),
    reference_id VARCHAR(64),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notification_templates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(30) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    title_template VARCHAR(200) NOT NULL,
    content_template TEXT NOT NULL,
    is_preset BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RBAC tables (needed by PermissionService)
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    is_preset BOOLEAN NOT NULL DEFAULT FALSE,
    role_type VARCHAR(20),
    is_editable BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS permissions (
    code VARCHAR(60) PRIMARY KEY,
    module VARCHAR(30) NOT NULL,
    operation VARCHAR(20) NOT NULL,
    description VARCHAR(100),
    sort_order INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT NOT NULL,
    permission_code VARCHAR(60) NOT NULL,
    deleted INT NOT NULL DEFAULT 0,
    PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    tenant_id BIGINT,
    deleted INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, role_id)
);

-- Email send log (referenced by EmailService mock)
CREATE TABLE IF NOT EXISTS email_send_logs (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    email VARCHAR(100),
    type VARCHAR(30),
    subject VARCHAR(200),
    content TEXT,
    result VARCHAR(20),
    error_msg VARCHAR(200),
    retry_count INT DEFAULT 0,
    next_retry_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed notification templates
INSERT INTO notification_templates (id, type, channel, title_template, content_template, is_preset) VALUES (1, 'level_up', 'in_app', '恭喜升级！', '恭喜您升级为{level_name}！继续加油！', TRUE);

-- Seed permissions
INSERT INTO permissions (code, module, operation, description, sort_order, deleted) VALUES ('enterprise:point:query', 'enterprise', 'point:query', '查询积分', 1, 0);
INSERT INTO permissions (code, module, operation, description, sort_order, deleted) VALUES ('enterprise:point:add', 'enterprise', 'point:add', '发放积分', 2, 0);
INSERT INTO permissions (code, module, operation, description, sort_order, deleted) VALUES ('enterprise:point:deduct', 'enterprise', 'point:deduct', '扣减积分', 3, 0);
INSERT INTO permissions (code, module, operation, description, sort_order, deleted) VALUES ('enterprise:rule:create', 'enterprise', 'rule:create', '创建规则', 10, 0);
INSERT INTO permissions (code, module, operation, description, sort_order, deleted) VALUES ('enterprise:rule:edit', 'enterprise', 'rule:edit', '编辑规则', 11, 0);
INSERT INTO permissions (code, module, operation, description, sort_order, deleted) VALUES ('enterprise:rule:delete', 'enterprise', 'rule:delete', '删除规则', 12, 0);
INSERT INTO permissions (code, module, operation, description, sort_order, deleted) VALUES ('enterprise:rule:view', 'enterprise', 'rule:view', '查看规则', 13, 0);

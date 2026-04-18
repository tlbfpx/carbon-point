-- H2 test schema (MySQL compatibility mode)
-- Minimal tables needed for integration tests

CREATE TABLE IF NOT EXISTS tenants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    logo VARCHAR(500),
    package_type VARCHAR(20) NOT NULL DEFAULT 'free',
    package_id BIGINT,
    max_users INT NOT NULL DEFAULT 50,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    expires_at DATETIME,
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

CREATE TABLE IF NOT EXISTS time_slot_rules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    deleted INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS check_in_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    time_slot_rule_id BIGINT NOT NULL,
    checkin_date DATE NOT NULL,
    checkin_time DATETIME(3) NOT NULL,
    base_points INT NOT NULL,
    final_points INT NOT NULL,
    multiplier DECIMAL(5,2) DEFAULT 1.0,
    level_coefficient DECIMAL(5,2) DEFAULT 1.0,
    consecutive_days INT DEFAULT 1,
    streak_bonus INT DEFAULT 0,
    version BIGINT DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, checkin_date, time_slot_rule_id)
);

CREATE TABLE IF NOT EXISTS point_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    amount INT NOT NULL,
    type VARCHAR(30) NOT NULL,
    reference_id VARCHAR(64),
    balance_after INT NOT NULL,
    frozen_after INT NOT NULL DEFAULT 0,
    remark VARCHAR(200),
    expire_time DATETIME,
    version BIGINT DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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

CREATE TABLE IF NOT EXISTS products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    image VARCHAR(500),
    type VARCHAR(20) NOT NULL,
    points_price INT NOT NULL,
    stock INT,
    max_per_user INT DEFAULT NULL,
    validity_days INT NOT NULL DEFAULT 30,
    fulfillment_config TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'inactive',
    sort_order INT NOT NULL DEFAULT 0,
    version INT DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exchange_orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    product_name VARCHAR(100),
    product_type VARCHAR(20),
    points_spent INT NOT NULL,
    coupon_code VARCHAR(32),
    order_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    expires_at DATETIME,
    fulfilled_at DATETIME,
    used_at DATETIME,
    used_by VARCHAR(20),
    deleted INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS login_security_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT,
    user_id BIGINT,
    username VARCHAR(50),
    user_type VARCHAR(20),
    login_method VARCHAR(20),
    ip_address VARCHAR(45) NOT NULL,
    location VARCHAR(50),
    geo_city VARCHAR(50),
    user_agent VARCHAR(500),
    device_fingerprint VARCHAR(64),
    result VARCHAR(20) NOT NULL,
    fail_reason VARCHAR(100),
    login_type VARCHAR(20),
    is_new_device BOOLEAN,
    is_abnormal_location BOOLEAN,
    is_abnormal_time BOOLEAN,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(30) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Notification Templates
-- ============================================================
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

-- Seed data for notification templates
INSERT INTO notification_templates (type, channel, title_template, content_template, is_preset) VALUES
    ('level_up', 'in_app', '恭喜升级！', '恭喜您升级为{level_name}！继续加油！', TRUE),
    ('level_up', 'sms', '碳点升级通知', '恭喜您已升级为{level_name}，继续加油！', TRUE);

-- Enterprise product permissions for RBAC tests
INSERT INTO permissions (code, module, operation, description, sort_order, deleted) VALUES
    ('enterprise:product:create', 'product', 'create', '创建商品', 10, 0),
    ('enterprise:product:edit', 'product', 'edit', '编辑商品', 11, 0),
    ('enterprise:product:delete', 'product', 'delete', '删除商品', 12, 0),
    ('enterprise:product:toggle', 'product', 'toggle', '切换商品状态', 13, 0),
    ('enterprise:product:stock', 'product', 'stock', '管理商品库存', 14, 0),
    ('enterprise:product:list', 'product', 'list', '查看商品列表', 15, 0),
    ('enterprise:exchange:create', 'exchange', 'create', '创建兑换订单', 20, 0),
    ('enterprise:exchange:cancel', 'exchange', 'cancel', '取消兑换订单', 21, 0),
    ('enterprise:exchange:list', 'exchange', 'list', '查看兑换订单', 22, 0),
    ('enterprise:exchange:fulfill', 'exchange', 'fulfill', '核销兑换订单', 23, 0),
    ('enterprise:exchange:redeem', 'exchange', 'redeem', '兑换券码', 24, 0);

-- Preset admin role (enterprise admin with all mall permissions)
INSERT INTO roles (tenant_id, name, is_preset, role_type, is_editable, deleted) VALUES
    (9100, '企业管理员', TRUE, 'enterprise_admin', FALSE, 0),
    (9999, '企业管理员', TRUE, 'enterprise_admin', FALSE, 0);

-- Admin role permissions
INSERT INTO role_permissions (role_id, permission_code, deleted) VALUES
    ((SELECT id FROM roles WHERE tenant_id = 9100 AND name = '企业管理员' LIMIT 1), 'enterprise:product:create', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9100 AND name = '企业管理员' LIMIT 1), 'enterprise:product:edit', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9100 AND name = '企业管理员' LIMIT 1), 'enterprise:product:delete', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9100 AND name = '企业管理员' LIMIT 1), 'enterprise:product:toggle', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9100 AND name = '企业管理员' LIMIT 1), 'enterprise:product:stock', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9100 AND name = '企业管理员' LIMIT 1), 'enterprise:product:list', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9100 AND name = '企业管理员' LIMIT 1), 'enterprise:exchange:create', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9100 AND name = '企业管理员' LIMIT 1), 'enterprise:exchange:cancel', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9100 AND name = '企业管理员' LIMIT 1), 'enterprise:exchange:list', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9100 AND name = '企业管理员' LIMIT 1), 'enterprise:exchange:fulfill', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9100 AND name = '企业管理员' LIMIT 1), 'enterprise:exchange:redeem', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9999 AND name = '企业管理员' LIMIT 1), 'enterprise:product:create', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9999 AND name = '企业管理员' LIMIT 1), 'enterprise:product:edit', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9999 AND name = '企业管理员' LIMIT 1), 'enterprise:product:delete', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9999 AND name = '企业管理员' LIMIT 1), 'enterprise:product:toggle', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9999 AND name = '企业管理员' LIMIT 1), 'enterprise:product:stock', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9999 AND name = '企业管理员' LIMIT 1), 'enterprise:product:list', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9999 AND name = '企业管理员' LIMIT 1), 'enterprise:exchange:create', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9999 AND name = '企业管理员' LIMIT 1), 'enterprise:exchange:cancel', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9999 AND name = '企业管理员' LIMIT 1), 'enterprise:exchange:list', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9999 AND name = '企业管理员' LIMIT 1), 'enterprise:exchange:fulfill', 0),
    ((SELECT id FROM roles WHERE tenant_id = 9999 AND name = '企业管理员' LIMIT 1), 'enterprise:exchange:redeem', 0);

-- User-role binding for test users (user IDs 91001, 91002, 99901, etc.)
INSERT INTO user_roles (user_id, role_id, tenant_id, deleted) VALUES
    (91001, (SELECT id FROM roles WHERE tenant_id = 9100 AND name = '企业管理员' LIMIT 1), 9100, 0),
    (91002, (SELECT id FROM roles WHERE tenant_id = 9100 AND name = '企业管理员' LIMIT 1), 9100, 0),
    (99901, (SELECT id FROM roles WHERE tenant_id = 9999 AND name = '企业管理员' LIMIT 1), 9999, 0),
    (99902, (SELECT id FROM roles WHERE tenant_id = 9999 AND name = '企业管理员' LIMIT 1), 9999, 0);

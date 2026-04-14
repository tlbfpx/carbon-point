-- H2 test schema (MySQL compatibility mode)
-- Minimal tables needed for integration tests
-- Schema matches authoritative DDL in docs/review/ddl/carbon-point-schema.sql
-- plus soft-delete columns (@TableLogic) required by entity classes

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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
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
    version BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS time_slot_rules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted INT NOT NULL DEFAULT 0
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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted INT NOT NULL DEFAULT 0,
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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted INT NOT NULL DEFAULT 0
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
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted INT NOT NULL DEFAULT 0
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
    max_per_user INT DEFAULT 1,
    validity_days INT NOT NULL DEFAULT 30,
    fulfillment_config TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'inactive',
    sort_order INT NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted INT NOT NULL DEFAULT 0
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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted INT NOT NULL DEFAULT 0
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
    tenant_id BIGINT NOT NULL,
    deleted INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS departments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    parent_id BIGINT,
    sort_order INT DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted INT NOT NULL DEFAULT 0
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
    user_type VARCHAR(20),
    user_id BIGINT,
    username VARCHAR(50),
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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS password_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(30) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notification_templates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(30) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    title_template VARCHAR(200) NOT NULL,
    content_template TEXT NOT NULL,
    is_preset BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted INT NOT NULL DEFAULT 0
);

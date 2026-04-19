-- H2 test schema for carbon-walking module
-- Minimal tables needed for walking integration tests

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

CREATE TABLE IF NOT EXISTS step_daily_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    record_date DATE NOT NULL,
    step_count INT NOT NULL DEFAULT 0,
    points_awarded INT NOT NULL DEFAULT 0,
    source VARCHAR(30),
    claimed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, record_date)
);

CREATE TABLE IF NOT EXISTS point_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    amount INT NOT NULL,
    type VARCHAR(30) NOT NULL,
    reference_id VARCHAR(64),
    product_code VARCHAR(30),
    source_type VARCHAR(30),
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

CREATE TABLE IF NOT EXISTS permissions (
    code VARCHAR(60) PRIMARY KEY,
    module VARCHAR(30) NOT NULL,
    operation VARCHAR(20) NOT NULL,
    description VARCHAR(100),
    sort_order INT NOT NULL DEFAULT 0,
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

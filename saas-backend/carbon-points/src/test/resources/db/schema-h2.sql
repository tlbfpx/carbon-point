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
    source_template_id VARCHAR(36) DEFAULT NULL,
    product_code VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Check-in records table (needed for PointEngineService tests)
CREATE TABLE IF NOT EXISTS check_in_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    time_slot_rule_id BIGINT NOT NULL,
    checkin_date DATE NOT NULL,
    checkin_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    base_points INT NOT NULL,
    final_points INT NOT NULL,
    multiplier DECIMAL(5, 2) DEFAULT 1.0,
    level_coefficient DECIMAL(5, 2) DEFAULT 1.0,
    consecutive_days INT DEFAULT 1,
    streak_bonus INT DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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

-- Trigger types and rule node types (needed by PlatformRegistryController and RuleChainExecutor)
CREATE TABLE IF NOT EXISTS trigger_types (
    id VARCHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS rule_node_types (
    id VARCHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) DEFAULT NULL,
    bean_name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- Additional platform tables (referenced by tenant line handler)
CREATE TABLE IF NOT EXISTS platform_products (
    id VARCHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT NULL,
    description VARCHAR(500) DEFAULT NULL,
    status INT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS features (
    id VARCHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS permission_packages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) DEFAULT NULL,
    max_users INT DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted INT NOT NULL DEFAULT 0
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

-- Seed trigger types
INSERT INTO trigger_types (id, code, name, description, sort_order) VALUES
('tt-check_in', 'check_in', '打卡触发器', '用户手动打卡触发，验证打卡时间是否在有效时段内', 1),
('tt-sensor_data', 'sensor_data', '传感器数据触发器', '传感器数据触发（走路计步），验证步数是否达到阈值', 2);

-- Seed rule node types
INSERT INTO rule_node_types (id, code, name, description, bean_name, sort_order) VALUES
('rnt-time-slot-match', 'time_slot_match', '时段匹配', '检查触发时间是否在允许的时段内', 'timeSlotMatch', 1),
('rnt-random-base', 'random_base', '随机基数', '在配置的积分区间内随机生成基础积分', 'randomBase', 2),
('rnt-special-date-multiplier', 'special_date_multiplier', '特殊日期倍率', '节假日/特殊日期积分翻倍', 'specialDateMultiplier', 3),
('rnt-level-coefficient', 'level_coefficient', '等级系数', '根据用户等级调整积分系数', 'levelCoefficient', 4),
('rnt-round', 'round', '数值取整', '对积分结果进行四舍五入处理', 'round', 5),
('rnt-daily-cap', 'daily_cap', '每日上限', '检查当日累计积分是否超过每日上限', 'dailyCap', 6),
('rnt-threshold-filter', 'threshold_filter', '步数阈值过滤', '过滤不满足最低步数要求的数据', 'thresholdFilter', 7),
('rnt-formula-calc', 'formula_calc', '步数公式换算', '按公式将步数换算为积分', 'formulaCalc', 8);

-- Seed platform products
INSERT INTO platform_products (id, code, name, category, description, status, sort_order) VALUES
('stair_climbing', 'stair_climbing', '爬楼梯打卡', 'stairs_climbing', '员工爬楼梯打卡获取积分', 1, 1),
('walking', 'walking', '步行打卡', 'walking', '员工步行打卡获取积分，支持微信运动/HealthKit/Health Connect', 1, 2);

-- Seed features
INSERT INTO features (id, code, name, description, sort_order) VALUES
('f-checkin-stairs', 'checkin.stairs', '爬楼梯打卡', '爬楼梯打卡功能', 1),
('f-checkin-walking', 'checkin.walking', '步行打卡', '步行打卡功能', 2),
('f-points-exchange', 'points.exchange', '积分兑换', '积分兑换功能', 3),
('f-mall-virtual', 'mall.virtual', '虚拟商品兑换', '虚拟商品兑换功能', 4);

-- Seed permission packages
INSERT INTO permission_packages (id, code, name, description, max_users, status, sort_order, deleted) VALUES
(1, 'free', '免费版', '免费套餐', 50, 'active', 1, 0),
(2, 'pro', '专业版', '专业套餐', 500, 'active', 2, 0),
(3, 'enterprise', '企业版', '企业套餐', NULL, 'active', 3, 0);

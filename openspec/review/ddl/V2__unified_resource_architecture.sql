-- ============================================================
-- Carbon Point 统一资源架构 DDL
-- 版本: V2
-- 生成日期: 2026-04-29
-- 说明: 统一产品-套餐-RBAC架构，实现平台-企业联动
-- ============================================================

-- ============================================================
-- 1. 平台资源定义表（统一所有资源类型）
-- ============================================================
CREATE TABLE platform_resources (
    id          BINARY(16) PRIMARY KEY COMMENT 'UUID',
    code        VARCHAR(64) NOT NULL UNIQUE COMMENT '资源编码：PRODUCT_STAIR, MALL_COUPON, FEATURE_HOLIDAY',
    type        VARCHAR(32) NOT NULL COMMENT '类型：FUNCTION_PRODUCT, MALL_PRODUCT, FEATURE, PERMISSION_GROUP',
    name        VARCHAR(128) NOT NULL COMMENT '资源名称',
    category    VARCHAR(64) COMMENT '分类',
    description TEXT COMMENT '描述',
    metadata    JSON COMMENT '资源元数据（根据type不同结构不同）',
    icon        VARCHAR(256) COMMENT '图标URL',
    status      VARCHAR(32) NOT NULL DEFAULT 'ENABLED' COMMENT '状态：ENABLED, DISABLED, DEPRECATED',
    sort_order  INT NOT NULL DEFAULT 0,
    deleted     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='平台资源定义表';

-- ============================================================
-- 2. 套餐表（简化版）
-- ============================================================
CREATE TABLE permission_packages (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    code        VARCHAR(64) NOT NULL UNIQUE COMMENT '套餐编码：FREE, PRO, ENTERPRISE',
    name        VARCHAR(128) NOT NULL COMMENT '套餐名称',
    description TEXT COMMENT '套餐描述',
    max_users   INT COMMENT '最大用户数（NULL=不限制）',
    price_cents INT COMMENT '价格（分）',
    duration_days INT COMMENT '有效期天数',
    status      VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' COMMENT '状态：ACTIVE, INACTIVE, DEPRECATED',
    sort_order  INT NOT NULL DEFAULT 0,
    deleted     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX idx_status (status),
    INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐表';

-- ============================================================
-- 3. 套餐-资源关联表（统一关联）
-- ============================================================
CREATE TABLE package_resources (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    package_id   BIGINT NOT NULL COMMENT '套餐ID',
    resource_code VARCHAR(64) NOT NULL COMMENT '资源编码',
    is_required  BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否必选',
    config       JSON COMMENT '套餐级资源配置（默认参数等）',
    sort_order   INT NOT NULL DEFAULT 0,
    created_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE KEY uk_package_resource (package_id, resource_code),
    INDEX idx_package (package_id),
    INDEX idx_resource (resource_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐-资源关联表';

-- ============================================================
-- 4. 租户-套餐关联表
-- ============================================================
CREATE TABLE tenant_packages (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id    BIGINT NOT NULL COMMENT '租户ID',
    package_id   BIGINT NOT NULL COMMENT '套餐ID',
    status       VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' COMMENT '状态：ACTIVE, EXPIRED, CANCELLED',
    starts_at    TIMESTAMP(3) NOT NULL COMMENT '生效时间',
    expires_at   TIMESTAMP(3) COMMENT '过期时间',
    created_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uk_tenant_active (tenant_id, status) COMMENT '一个租户只有一个活跃套餐',
    INDEX idx_package (package_id),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户套餐关联表';

-- ============================================================
-- 5. 租户-资源配置表（企业侧配置）
-- ============================================================
CREATE TABLE tenant_resource_configs (
    id             BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id      BIGINT NOT NULL COMMENT '租户ID',
    resource_code  VARCHAR(64) NOT NULL COMMENT '资源编码',
    enabled        BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用（仅对可选资源）',
    config         JSON COMMENT '企业级配置',
    created_at     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uk_tenant_resource (tenant_id, resource_code),
    INDEX idx_tenant (tenant_id),
    INDEX idx_resource (resource_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户资源配置表';

-- ============================================================
-- 6. 菜单定义表（与资源绑定）
-- ============================================================
CREATE TABLE menu_definitions (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    code          VARCHAR(64) NOT NULL UNIQUE COMMENT '菜单编码',
    resource_code VARCHAR(64) COMMENT '关联的资源编码（可选，通用菜单可空）',
    parent_code   VARCHAR(64) COMMENT '父菜单编码',
    name          VARCHAR(128) NOT NULL COMMENT '菜单名称',
    type          VARCHAR(32) NOT NULL COMMENT '类型：MENU, BUTTON, SECTION',
    path          VARCHAR(256) COMMENT '前端路由路径',
    component     VARCHAR(256) COMMENT '前端组件',
    icon          VARCHAR(128) COMMENT '图标',
    permission    VARCHAR(128) COMMENT '所需权限码',
    sort_order    INT NOT NULL DEFAULT 0,
    visible       BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否可见',
    deleted       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX idx_parent (parent_code),
    INDEX idx_resource (resource_code),
    INDEX idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜单定义表';

-- ============================================================
-- 7. 平台商城商品表（全局商品库）
-- ============================================================
CREATE TABLE platform_mall_products (
    id                 BINARY(16) PRIMARY KEY COMMENT 'UUID',
    code               VARCHAR(64) NOT NULL UNIQUE COMMENT '商品编码',
    name               VARCHAR(128) NOT NULL COMMENT '商品名称',
    description        TEXT COMMENT '商品描述',
    image_url          VARCHAR(500) COMMENT '商品图片URL',
    type               VARCHAR(32) NOT NULL COMMENT '类型：COUPON, RECHARGE, PRIVILEGE',
    base_points_price  INT NOT NULL COMMENT '基础积分价格',
    stock              INT COMMENT '库存（NULL=无限）',
    max_per_user       INT COMMENT '每人限兑数量（NULL=不限）',
    validity_days      INT NOT NULL DEFAULT 30 COMMENT '有效期天数',
    fulfillment_config JSON COMMENT '发放配置',
    category           VARCHAR(64) COMMENT '分类',
    tags               JSON COMMENT '标签数组',
    status             VARCHAR(32) NOT NULL DEFAULT 'INACTIVE' COMMENT '状态：INACTIVE, ACTIVE, SOLD_OUT',
    sort_order         INT NOT NULL DEFAULT 0,
    deleted            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='平台商城商品表';

-- ============================================================
-- 8. 租户商品货架表（企业侧货架）
-- ============================================================
CREATE TABLE tenant_product_shelf (
    id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id          BIGINT NOT NULL COMMENT '租户ID',
    platform_product_id BINARY(16) NOT NULL COMMENT '平台商品ID',
    product_name       VARCHAR(128) COMMENT '商品名称（租户自定义）',
    points_price       INT COMMENT '积分价格（租户自定义，NULL=使用基础价）',
    shelf_status       VARCHAR(32) NOT NULL DEFAULT 'OFF' COMMENT '货架状态：OFF, ON',
    shelf_at           TIMESTAMP(3) COMMENT '上架时间',
    stock              INT COMMENT '租户库存（NULL=使用平台库存）',
    max_per_user       INT COMMENT '租户限兑（NULL=使用平台配置）',
    sort_order         INT NOT NULL DEFAULT 0,
    created_at         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uk_tenant_product (tenant_id, platform_product_id),
    INDEX idx_tenant_status (tenant_id, shelf_status),
    INDEX idx_platform_product (platform_product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户商品货架表';

-- ============================================================
-- 9. 功能产品定义表（功能产品详细配置）
-- ============================================================
CREATE TABLE platform_products (
    id                  BINARY(16) PRIMARY KEY COMMENT 'UUID',
    code                VARCHAR(64) NOT NULL UNIQUE COMMENT '产品编码',
    name                VARCHAR(128) NOT NULL COMMENT '产品名称',
    description         TEXT COMMENT '产品描述',
    trigger_type        VARCHAR(64) NOT NULL COMMENT '触发器类型',
    rule_chain_config   JSON COMMENT '规则链配置',
    default_config      JSON COMMENT '默认配置',
    basic_config        JSON COMMENT '基础配置',
    category            VARCHAR(64) COMMENT '分类',
    icon                VARCHAR(256) COMMENT '图标',
    status              VARCHAR(32) NOT NULL DEFAULT 'ENABLED' COMMENT '状态',
    sort_order          INT NOT NULL DEFAULT 0,
    deleted             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX idx_status (status),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='功能产品定义表';

-- ============================================================
-- 10. 功能点定义表
-- ============================================================
CREATE TABLE features (
    id               BINARY(16) PRIMARY KEY COMMENT 'UUID',
    code             VARCHAR(64) NOT NULL UNIQUE COMMENT '功能点编码',
    product_code     VARCHAR(64) NOT NULL COMMENT '所属产品编码',
    name             VARCHAR(128) NOT NULL COMMENT '功能点名称',
    description      TEXT COMMENT '描述',
    feature_type     VARCHAR(64) NOT NULL COMMENT '功能点类型',
    config_schema    JSON COMMENT '配置Schema（JSON Schema）',
    default_config   JSON COMMENT '默认配置',
    is_required      BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否必选',
    sort_order       INT NOT NULL DEFAULT 0,
    status           VARCHAR(32) NOT NULL DEFAULT 'ENABLED' COMMENT '状态',
    deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX idx_product (product_code),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='功能点定义表';

-- ============================================================
-- 11. 租户产品配置表
-- ============================================================
CREATE TABLE product_configs (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id    BIGINT NOT NULL COMMENT '租户ID',
    product_code VARCHAR(64) NOT NULL COMMENT '产品编码',
    enabled      BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
    config_json  JSON COMMENT '产品配置',
    deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uk_tenant_product (tenant_id, product_code),
    INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户产品配置表';

-- ============================================================
-- 12. 租户功能点配置表
-- ============================================================
CREATE TABLE product_feature_configs (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id    BIGINT NOT NULL COMMENT '租户ID',
    product_code VARCHAR(64) NOT NULL COMMENT '产品编码',
    feature_code VARCHAR(64) NOT NULL COMMENT '功能点编码',
    enabled      BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
    config       JSON COMMENT '功能点配置',
    deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uk_tenant_product_feature (tenant_id, product_code, feature_code),
    INDEX idx_tenant_product (tenant_id, product_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户功能点配置表';

-- ============================================================
-- 13. 套餐变更日志表
-- ============================================================
CREATE TABLE package_change_logs (
    id                BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id         BIGINT NOT NULL COMMENT '租户ID',
    old_package_id    BIGINT COMMENT '旧套餐ID',
    new_package_id    BIGINT NOT NULL COMMENT '新套餐ID',
    operator_id       BIGINT NOT NULL COMMENT '操作人ID',
    operator_type     VARCHAR(32) NOT NULL COMMENT '操作人类型：PLATFORM_ADMIN, TENANT_ADMIN',
    reason            TEXT COMMENT '变更原因',
    change_type       VARCHAR(32) NOT NULL COMMENT '变更类型：UPGRADE, DOWNGRADE, RENEW, ASSIGN',
    created_at        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX idx_tenant (tenant_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐变更日志表';

-- ============================================================
-- 租户表扩展：添加package_id字段关联
-- ============================================================
ALTER TABLE tenants ADD COLUMN package_id BIGINT COMMENT '当前套餐ID' AFTER max_users;
ALTER TABLE tenants ADD INDEX idx_package (package_id);

-- ============================================================
-- 初始化数据：平台资源
-- ============================================================

-- 功能产品资源
INSERT INTO platform_resources (id, code, type, name, category, description, status, sort_order) VALUES
(UUID_TO_BIN(UUID()), 'PRODUCT_STAIR', 'FUNCTION_PRODUCT', '爬楼打卡', 'exercise', '爬楼打卡获得积分', 'ENABLED', 1),
(UUID_TO_BIN(UUID()), 'PRODUCT_WALKING', 'FUNCTION_PRODUCT', '步数积分', 'exercise', '每日步数兑换积分', 'ENABLED', 2),
(UUID_TO_BIN(UUID()), 'PRODUCT_QUIZ', 'FUNCTION_PRODUCT', '知识问答', 'engagement', '每日答题获得积分', 'ENABLED', 3);

-- 功能点资源
INSERT INTO platform_resources (id, code, type, name, category, description, status, sort_order) VALUES
(UUID_TO_BIN(UUID()), 'FEATURE_HOLIDAY', 'FEATURE', '节假日翻倍', 'bonus', '节假日积分翻倍', 'ENABLED', 10),
(UUID_TO_BIN(UUID()), 'FEATURE_STREAK', 'FEATURE', '连续打卡奖励', 'bonus', '连续N天打卡额外奖励', 'ENABLED', 11),
(UUID_TO_BIN(UUID()), 'FEATURE_LEVEL_COEFFICIENT', 'FEATURE', '等级系数', 'progression', '高等级用户积分系数加成', 'ENABLED', 12);

-- 权限组资源
INSERT INTO platform_resources (id, code, type, name, category, description, status, sort_order) VALUES
(UUID_TO_BIN(UUID()), 'PERM_GROUP_BASIC', 'PERMISSION_GROUP', '基础权限组', 'permissions', '查看、基础操作权限', 'ENABLED', 20),
(UUID_TO_BIN(UUID()), 'PERM_GROUP_ADVANCED', 'PERMISSION_GROUP', '高级权限组', 'permissions', '包含配置、管理权限', 'ENABLED', 21),
(UUID_TO_BIN(UUID()), 'PERM_GROUP_FULL', 'PERMISSION_GROUP', '全部权限组', 'permissions', '拥有所有权限', 'ENABLED', 22);

-- ============================================================
-- 初始化数据：套餐
-- ============================================================
INSERT INTO permission_packages (code, name, description, max_users, price_cents, duration_days, status, sort_order) VALUES
('FREE', '免费版', '适合小型团队', 50, 0, 365, 'ACTIVE', 1),
('PRO', '专业版', '适合成长型企业', 200, 9900, 365, 'ACTIVE', 2),
('ENTERPRISE', '企业版', '适合大型企业', NULL, 49900, 365, 'ACTIVE', 3);

-- ============================================================
-- 初始化数据：套餐-资源关联（免费版）
-- ============================================================
INSERT INTO package_resources (package_id, resource_code, is_required, sort_order)
SELECT p.id, 'PRODUCT_STAIR', TRUE, 1 FROM permission_packages p WHERE p.code = 'FREE'
UNION ALL
SELECT p.id, 'FEATURE_STREAK', FALSE, 2 FROM permission_packages p WHERE p.code = 'FREE'
UNION ALL
SELECT p.id, 'PERM_GROUP_BASIC', TRUE, 3 FROM permission_packages p WHERE p.code = 'FREE';

-- ============================================================
-- 初始化数据：套餐-资源关联（专业版）
-- ============================================================
INSERT INTO package_resources (package_id, resource_code, is_required, sort_order)
SELECT p.id, 'PRODUCT_STAIR', TRUE, 1 FROM permission_packages p WHERE p.code = 'PRO'
UNION ALL
SELECT p.id, 'PRODUCT_WALKING', TRUE, 2 FROM permission_packages p WHERE p.code = 'PRO'
UNION ALL
SELECT p.id, 'FEATURE_HOLIDAY', FALSE, 3 FROM permission_packages p WHERE p.code = 'PRO'
UNION ALL
SELECT p.id, 'FEATURE_STREAK', TRUE, 4 FROM permission_packages p WHERE p.code = 'PRO'
UNION ALL
SELECT p.id, 'FEATURE_LEVEL_COEFFICIENT', FALSE, 5 FROM permission_packages p WHERE p.code = 'PRO'
UNION ALL
SELECT p.id, 'PERM_GROUP_ADVANCED', TRUE, 6 FROM permission_packages p WHERE p.code = 'PRO';

-- ============================================================
-- 初始化数据：套餐-资源关联（企业版）
-- ============================================================
INSERT INTO package_resources (package_id, resource_code, is_required, sort_order)
SELECT p.id, 'PRODUCT_STAIR', TRUE, 1 FROM permission_packages p WHERE p.code = 'ENTERPRISE'
UNION ALL
SELECT p.id, 'PRODUCT_WALKING', TRUE, 2 FROM permission_packages p WHERE p.code = 'ENTERPRISE'
UNION ALL
SELECT p.id, 'PRODUCT_QUIZ', TRUE, 3 FROM permission_packages p WHERE p.code = 'ENTERPRISE'
UNION ALL
SELECT p.id, 'FEATURE_HOLIDAY', TRUE, 4 FROM permission_packages p WHERE p.code = 'ENTERPRISE'
UNION ALL
SELECT p.id, 'FEATURE_STREAK', TRUE, 5 FROM permission_packages p WHERE p.code = 'ENTERPRISE'
UNION ALL
SELECT p.id, 'FEATURE_LEVEL_COEFFICIENT', TRUE, 6 FROM permission_packages p WHERE p.code = 'ENTERPRISE'
UNION ALL
SELECT p.id, 'PERM_GROUP_FULL', TRUE, 7 FROM permission_packages p WHERE p.code = 'ENTERPRISE';

-- ============================================================
-- 初始化数据：菜单定义
-- ============================================================
INSERT INTO menu_definitions (code, resource_code, parent_code, name, type, path, component, icon, permission, sort_order) VALUES
('MENU_DASHBOARD', NULL, NULL, '数据看板', 'MENU', '/dashboard', 'Dashboard', 'dashboard', NULL, 1),
('MENU_EXERCISE', NULL, NULL, '运动管理', 'SECTION', NULL, NULL, 'walk', NULL, 10),
('MENU_STAIR', 'PRODUCT_STAIR', 'MENU_EXERCISE', '爬楼打卡', 'MENU', '/exercise/stair', 'StairManagement', 'stair', 'enterprise:rule:view', 11),
('MENU_WALKING', 'PRODUCT_WALKING', 'MENU_EXERCISE', '步数积分', 'MENU', '/exercise/walking', 'WalkingManagement', 'walking', 'enterprise:rule:view', 12),
('MENU_QUIZ', 'PRODUCT_QUIZ', 'MENU_EXERCISE', '知识问答', 'MENU', '/exercise/quiz', 'QuizManagement', 'quiz', 'enterprise:rule:view', 13),
('MENU_MEMBER', NULL, NULL, '员工管理', 'MENU', '/member', 'MemberManagement', 'team', 'enterprise:member:list', 20),
('MENU_MALL', NULL, NULL, '积分商城', 'SECTION', NULL, NULL, 'shopping', NULL, 30),
('MENU_MALL_PRODUCTS', NULL, 'MENU_MALL', '商品管理', 'MENU', '/mall/products', 'ProductManagement', 'product', 'enterprise:product:list', 31),
('MENU_MALL_ORDERS', NULL, 'MENU_MALL', '订单管理', 'MENU', '/mall/orders', 'OrderManagement', 'order', 'enterprise:order:list', 32),
('MENU_ANALYTICS', NULL, NULL, '数据分析', 'MENU', '/analytics', 'Analytics', 'chart', 'enterprise:report:view', 40),
('MENU_SETTINGS', NULL, NULL, '系统设置', 'SECTION', NULL, NULL, 'setting', NULL, 50),
('MENU_SETTINGS_BASIC', NULL, 'MENU_SETTINGS', '基本设置', 'MENU', '/settings/basic', 'BasicSettings', 'setting', NULL, 51),
('MENU_SETTINGS_PERMISSIONS', NULL, 'MENU_SETTINGS', '权限管理', 'MENU', '/settings/permissions', 'PermissionManagement', 'lock', 'enterprise:member:create', 52);

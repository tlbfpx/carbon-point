-- ============================================================
-- V15: Create platform features table
-- Platform-level feature flag/config catalog
-- ============================================================
CREATE TABLE IF NOT EXISTS features (
    id              VARCHAR(36) PRIMARY KEY COMMENT '功能点ID(UUID)',
    code            VARCHAR(100) NOT NULL UNIQUE COMMENT '功能点编码',
    name            VARCHAR(100) NOT NULL COMMENT '功能点名称',
    type            VARCHAR(20) NOT NULL COMMENT '类型: permission/config',
    value_type      VARCHAR(20) DEFAULT 'boolean' COMMENT '值类型: boolean/number/string/json',
    default_value   VARCHAR(500) COMMENT '默认值',
    description     VARCHAR(500) COMMENT '功能点描述',
    `group`         VARCHAR(50) COMMENT '分组',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_code (code),
    INDEX idx_type (type),
    INDEX idx_group (`group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='平台功能点表';

INSERT INTO features (id, code, name, type, value_type, default_value, description, `group`) VALUES
(UUID(), 'checkin.stairs', '爬楼梯打卡', 'permission', 'boolean', 'true', '允许使用爬楼梯打卡功能', 'checkin'),
(UUID(), 'checkin.walking', '步行打卡', 'permission', 'boolean', 'true', '允许使用步行打卡功能', 'checkin'),
(UUID(), 'points.exchange', '积分兑换', 'permission', 'boolean', 'true', '允许使用积分兑换功能', 'points'),
(UUID(), 'mall.virtual', '虚拟商品兑换', 'permission', 'boolean', 'true', '允许兑换虚拟商品', 'mall'),
(UUID(), 'mall.physical', '实物商品兑换', 'permission', 'boolean', 'false', '允许兑换实物商品', 'mall');

-- ============================================================
-- V18: Create platform_products table
-- Platform-level product catalog (separate from mall products)
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_products (
    id              VARCHAR(36) PRIMARY KEY COMMENT '产品ID(UUID)',
    code            VARCHAR(100) NOT NULL UNIQUE COMMENT '产品编码',
    name            VARCHAR(100) NOT NULL COMMENT '产品名称',
    category        VARCHAR(50) NOT NULL COMMENT '产品类别: stairs_climbing/walking',
    description     VARCHAR(500) COMMENT '产品描述',
    status          TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1=启用, 0=禁用',
    sort_order      INT NOT NULL DEFAULT 0 COMMENT '排序',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_code (code),
    INDEX idx_category (category),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='平台产品表';

INSERT INTO platform_products (id, code, name, category, description, status, sort_order) VALUES
(UUID(), 'stairs_basic', '基础爬楼梯套餐', 'stairs_climbing', '包含基础爬楼梯打卡功能', 1, 1),
(UUID(), 'stairs_pro', '专业爬楼梯套餐', 'stairs_climbing', '包含全部爬楼梯功能', 1, 2),
(UUID(), 'walking_basic', '基础步行套餐', 'walking', '包含基础步行打卡功能', 1, 3),
(UUID(), 'walking_pro', '专业步行套餐', 'walking', '包含全部步行功能', 1, 4);

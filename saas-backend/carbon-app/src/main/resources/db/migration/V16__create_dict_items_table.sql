-- ============================================================
-- V16: Create dict_items table
-- Platform-level key-value dictionary
-- ============================================================
CREATE TABLE IF NOT EXISTS dict_items (
    id              VARCHAR(36) PRIMARY KEY COMMENT '字典项ID(UUID)',
    dict_type       VARCHAR(50) NOT NULL COMMENT '字典类型',
    dict_code       VARCHAR(100) NOT NULL COMMENT '字典编码',
    dict_name       VARCHAR(100) NOT NULL COMMENT '字典名称',
    status          TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1=启用, 0=禁用',
    sort_order      INT NOT NULL DEFAULT 0 COMMENT '排序',
    remark          VARCHAR(200) COMMENT '备注',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_type_code (dict_type, dict_code),
    INDEX idx_dict_type (dict_type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='平台字典项表';

INSERT INTO dict_items (id, dict_type, dict_code, dict_name, status, sort_order) VALUES
(UUID(), 'product_category', 'stairs_climbing', '爬楼梯', 1, 1),
(UUID(), 'product_category', 'walking', '步行', 1, 2),
(UUID(), 'feature_type', 'permission', '权限型', 1, 1),
(UUID(), 'feature_type', 'config', '配置型', 1, 2),
(UUID(), 'dict_status', '1', '启用', 1, 1),
(UUID(), 'dict_status', '0', '禁用', 1, 2);

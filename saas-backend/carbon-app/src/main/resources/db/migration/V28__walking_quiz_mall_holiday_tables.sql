-- V28: Platform Admin Optimization — New tables

-- 1. Walking tier rules (step count → points tiers)
CREATE TABLE walking_tier_rules (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL COMMENT '所属租户',
    min_steps INT NOT NULL COMMENT '最小步数（含）',
    max_steps INT DEFAULT NULL COMMENT '最大步数（不含），NULL=无上限',
    points INT NOT NULL COMMENT '该梯度奖励积分',
    sort_order INT NOT NULL DEFAULT 0,
    deleted TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant_range (tenant_id, min_steps),
    INDEX idx_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='走路梯度积分规则';

-- 2. Fun conversion rules (calories → fun items)
CREATE TABLE fun_conversion_rules (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL COMMENT '所属租户',
    item_name VARCHAR(50) NOT NULL COMMENT '物品名，如"大米""冰棒"',
    unit VARCHAR(20) NOT NULL COMMENT '单位，如"克""根"',
    calories_per_unit DECIMAL(10,2) NOT NULL COMMENT '每单位消耗的卡路里',
    icon VARCHAR(255) DEFAULT NULL COMMENT '图标URL',
    sort_order INT NOT NULL DEFAULT 0,
    deleted TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant_item (tenant_id, item_name),
    INDEX idx_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='趣味换算规则';

-- 3. Quiz questions
CREATE TABLE quiz_questions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL COMMENT '所属租户',
    type ENUM('true_false', 'single_choice', 'multi_choice') NOT NULL COMMENT '题目类型',
    content TEXT NOT NULL COMMENT '题目内容',
    options JSON DEFAULT NULL COMMENT '选项 [{"label":"A","text":"..."},...]',
    answer JSON NOT NULL COMMENT '正确答案 ["A"] 或 ["A","C"]',
    analysis TEXT DEFAULT NULL COMMENT '解题分析',
    category VARCHAR(50) DEFAULT NULL COMMENT '分类标签',
    difficulty TINYINT NOT NULL DEFAULT 1 COMMENT '难度 1-3',
    enabled TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tenant_enabled (tenant_id, enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='答题题库';

-- 4. Quiz daily records
CREATE TABLE quiz_daily_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL COMMENT '所属租户',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    question_id BIGINT NOT NULL COMMENT '题目ID',
    is_correct TINYINT NOT NULL COMMENT '是否正确',
    user_answer JSON DEFAULT NULL COMMENT '用户提交的答案',
    points_earned INT NOT NULL DEFAULT 0 COMMENT '获得积分',
    answer_date DATE NOT NULL COMMENT '答题日期',
    answered_at DATETIME NOT NULL COMMENT '答题时间',
    UNIQUE KEY uk_user_daily_question (tenant_id, user_id, question_id, answer_date),
    INDEX idx_user_date (tenant_id, user_id, answer_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日答题记录';

-- 5. Quiz configs
CREATE TABLE quiz_configs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL COMMENT '所属租户',
    daily_limit INT NOT NULL DEFAULT 3 COMMENT '每日答题数量上限',
    points_per_correct INT NOT NULL DEFAULT 10 COMMENT '答对奖励积分',
    show_analysis TINYINT NOT NULL DEFAULT 1 COMMENT '是否展示解题分析',
    enabled TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='答题配置';

-- 6. Platform mall products (separate from platform_products SPI registry)
CREATE TABLE platform_mall_products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '商品名称',
    type ENUM('coupon','recharge','privilege') NOT NULL COMMENT '商品类型',
    price_cents INT NOT NULL COMMENT '人民币价格（分）',
    description TEXT DEFAULT NULL COMMENT '商品描述',
    image_url VARCHAR(255) DEFAULT NULL COMMENT '商品图片',
    fulfillment_config JSON DEFAULT NULL COMMENT '履约配置',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '0=禁用 1=启用',
    deleted TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='平台商城商品池';

-- 7. Tenant product shelf (enterprise selects from platform pool)
CREATE TABLE tenant_product_shelf (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL COMMENT '所属租户',
    platform_mall_product_id BIGINT NOT NULL COMMENT '平台商品ID',
    shelf_status TINYINT NOT NULL DEFAULT 1 COMMENT '0=下架 1=上架',
    shelf_at DATETIME DEFAULT NULL COMMENT '上架时间',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant_product (tenant_id, platform_mall_product_id),
    INDEX idx_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业商品上架';

-- 8. Holiday calendar (for workday filter)
CREATE TABLE holiday_calendar (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    holiday_date DATE NOT NULL COMMENT '日期',
    holiday_name VARCHAR(100) NOT NULL COMMENT '节假日名称',
    holiday_type ENUM('public_holiday','workday_adjustment','company_custom') NOT NULL
        COMMENT '类型：法定假日/调休上班/企业自定义',
    year INT NOT NULL COMMENT '年份',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_date (holiday_date),
    INDEX idx_year_type (year, holiday_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='节假日日历';

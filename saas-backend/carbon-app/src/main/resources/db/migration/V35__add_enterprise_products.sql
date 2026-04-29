-- V35: Add enterprise products (stair_climbing, walking, quiz, mall)
-- These are the products expected by the enterprise frontend

-- First, ensure the products exist
INSERT INTO platform_products (id, code, name, category, description, status, sort_order, created_at, updated_at)
VALUES
    (UUID(), 'stair_climbing', '爬楼积分', 'stairs_climbing', '爬楼积分产品', 1, 1, NOW(), NOW()),
    (UUID(), 'walking', '走路积分', 'walking', '走路积分产品', 1, 2, NOW(), NOW()),
    (UUID(), 'quiz', '知识问答', 'quiz', '知识问答产品', 1, 3, NOW(), NOW()),
    (UUID(), 'mall', '积分商城', 'mall', '积分商城产品', 1, 4, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    updated_at = NOW();

-- Get the product IDs we just inserted
SET @stair_id = (SELECT id FROM platform_products WHERE code = 'stair_climbing');
SET @walking_id = (SELECT id FROM platform_products WHERE code = 'walking');
SET @quiz_id = (SELECT id FROM platform_products WHERE code = 'quiz');
SET @mall_id = (SELECT id FROM platform_products WHERE code = 'mall');

-- Link features to these products
INSERT INTO product_features (product_id, feature_id, config_value, is_required, is_enabled, created_at, updated_at)
-- Stair climbing features
SELECT @stair_id, id, default_value,
    CASE code
        WHEN 'stair.time_slot' THEN 1
        ELSE 0
    END, 1, NOW(), NOW()
FROM features WHERE code LIKE 'stair.%'
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- Walking features
INSERT INTO product_features (product_id, feature_id, config_value, is_required, is_enabled, created_at, updated_at)
SELECT @walking_id, id, default_value,
    CASE code
        WHEN 'walking.daily_points' THEN 1
        ELSE 0
    END, 1, NOW(), NOW()
FROM features WHERE code LIKE 'walking.%'
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- Quiz features
INSERT INTO product_features (product_id, feature_id, config_value, is_required, is_enabled, created_at, updated_at)
SELECT @quiz_id, id, default_value,
    CASE code
        WHEN 'quiz.enabled' THEN 1
        ELSE 0
    END, 1, NOW(), NOW()
FROM features WHERE code LIKE 'quiz.%'
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- Mall features
INSERT INTO product_features (product_id, feature_id, config_value, is_required, is_enabled, created_at, updated_at)
SELECT @mall_id, id, default_value,
    CASE code
        WHEN 'mall.enabled' THEN 1
        ELSE 0
    END, 1, NOW(), NOW()
FROM features WHERE code LIKE 'mall.%'
ON DUPLICATE KEY UPDATE updated_at = NOW();

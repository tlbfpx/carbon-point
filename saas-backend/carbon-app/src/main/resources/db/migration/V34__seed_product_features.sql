-- V34: Seed product_features table to link products with their features

-- First, get the feature IDs from the features table and link them to products
-- We'll use INSERT ... SELECT statements to link features to products

-- Link stair_climbing product features
INSERT INTO product_features (product_id, feature_id, config_value, is_required, is_enabled)
SELECT
    p.id AS product_id,
    f.id AS feature_id,
    f.default_value AS config_value,
    CASE f.code
        WHEN 'stair.time_slot' THEN 1
        ELSE 0
    END AS is_required,
    1 AS is_enabled
FROM platform_products p
CROSS JOIN features f
WHERE p.code = 'stair_climbing'
  AND f.code IN ('stair.time_slot', 'stair.floor_points', 'stair.workday_only', 'stair.special_date', 'stair.leaderboard')
ON DUPLICATE KEY UPDATE config_value=VALUES(config_value);

-- Link walking product features
INSERT INTO product_features (product_id, feature_id, config_value, is_required, is_enabled)
SELECT
    p.id AS product_id,
    f.id AS feature_id,
    f.default_value AS config_value,
    CASE f.code
        WHEN 'walking.daily_points' THEN 1
        ELSE 0
    END AS is_required,
    1 AS is_enabled
FROM platform_products p
CROSS JOIN features f
WHERE p.code = 'walking'
  AND f.code IN ('walking.daily_points', 'walking.step_tier', 'walking.fun_conversion', 'walking.leaderboard')
ON DUPLICATE KEY UPDATE config_value=VALUES(config_value);

-- Link quiz product features
INSERT INTO product_features (product_id, feature_id, config_value, is_required, is_enabled)
SELECT
    p.id AS product_id,
    f.id AS feature_id,
    f.default_value AS config_value,
    CASE f.code
        WHEN 'quiz.enabled' THEN 1
        ELSE 0
    END AS is_required,
    1 AS is_enabled
FROM platform_products p
CROSS JOIN features f
WHERE p.code = 'quiz'
  AND f.code IN ('quiz.enabled', 'quiz.question_types', 'quiz.daily_limit', 'quiz.analysis')
ON DUPLICATE KEY UPDATE config_value=VALUES(config_value);

-- Link mall product features
INSERT INTO product_features (product_id, feature_id, config_value, is_required, is_enabled)
SELECT
    p.id AS product_id,
    f.id AS feature_id,
    f.default_value AS config_value,
    CASE f.code
        WHEN 'mall.enabled' THEN 1
        ELSE 0
    END AS is_required,
    1 AS is_enabled
FROM platform_products p
CROSS JOIN features f
WHERE p.code = 'mall'
  AND f.code IN ('mall.enabled', 'mall.exchange_rate', 'mall.platform_pool', 'mall.reports')
ON DUPLICATE KEY UPDATE config_value=VALUES(config_value);

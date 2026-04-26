-- ============================================================
-- 补充测试数据：徽章、商品、兑换、用户徽章
-- 修复与实际数据库 schema 的兼容性问题
-- ============================================================

-- 1. 徽章定义 (badge_definitions)
INSERT INTO badge_definitions (badge_id, name, description, icon, rarity, condition_expr) VALUES
('first_checkin', '初次打卡', '完成第一次打卡', NULL, 'common', 'checkin_count >= 1'),
('streak_7', '连续7天', '连续打卡7天', NULL, 'common', 'consecutive_days >= 7'),
('streak_30', '连续30天', '连续打卡30天', NULL, 'rare', 'consecutive_days >= 30'),
('points_1000', '积分达人', '累计获得1000积分', NULL, 'common', 'total_points >= 1000'),
('points_5000', '积分富豪', '累计获得5000积分', NULL, 'rare', 'total_points >= 5000'),
('level_5', '满级用户', '达到5级', NULL, 'epic', 'level >= 5')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 2. 商品 (products) - 需要 active 状态
INSERT INTO products (id, tenant_id, name, description, type, points_price, stock, max_per_user, validity_days, fulfillment_config, status, sort_order) VALUES
(1,  1, '咖啡券',     '星巴克中杯拿铁券',        'coupon',   200, 100, 2, 30, '{"code_length":12,"prefix":"Coffee"}',    'active', 1),
(2,  1, '视频会员月卡','爱奇艺/优酷月卡二选一',  'recharge', 300, NULL, 1, 30, '{"provider":"video","duration_days":30}', 'active', 2),
(3,  1, '充电宝',     '10000mAh 移动电源',       'physical', 500, 50, 1, 90, NULL,                                    'active', 3),
(4,  2, '咖啡券',     '星巴克中杯拿铁券',        'coupon',   200, 100, 2, 30, '{"code_length":12,"prefix":"Coffee"}',    'active', 1),
(5,  2, '视频会员月卡','爱奇艺/优酷月卡二选一',  'recharge', 300, NULL, 1, 30, '{"provider":"video","duration_days":30}', 'active', 2),
(11, 4, '旗舰咖啡券', '星巴克大杯拿铁券',        'coupon',   300, 50, 2, 30, '{"code_length":12,"prefix":"Coffee"}',    'active', 1),
(12, 4, '年度视频会员','爱奇艺年度会员',         'recharge', 800, NULL, 1, 365,'{"provider":"video","duration_days":365}', 'active', 2)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 3. 兑换订单 (exchange_orders)
INSERT INTO exchange_orders (id, tenant_id, user_id, product_id, product_name, product_type, points_spent, coupon_code, order_status, expires_at, fulfilled_at) VALUES
(1, 1, 1, 1, '咖啡券', 'coupon', 200, 'Coffee123456AB', 'completed', NOW() + INTERVAL 30 DAY, NOW() - INTERVAL 5 DAY),
(2, 1, 2, 1, '咖啡券', 'coupon', 200, 'Coffee789012CD', 'completed', NOW() + INTERVAL 30 DAY, NOW() - INTERVAL 3 DAY),
(3, 1, 4, 2, '视频会员月卡', 'recharge', 300, NULL, 'completed', NOW() + INTERVAL 30 DAY, NOW() - INTERVAL 2 DAY),
(4, 4, 14, 11, '旗舰咖啡券', 'coupon', 300, 'CoffeeFLAGSHIP1', 'completed', NOW() + INTERVAL 30 DAY, NOW() - INTERVAL 10 DAY),
(5, 4, 15, 11, '旗舰咖啡券', 'coupon', 300, 'CoffeeFLAGSHIP2', 'pending', NOW() + INTERVAL 30 DAY, NULL),
(6, 4, 17, 12, '年度视频会员', 'recharge', 800, NULL, 'pending', NOW() + INTERVAL 365 DAY, NULL)
ON DUPLICATE KEY UPDATE points_spent = VALUES(points_spent);

-- 4. 用户徽章 (user_badges)
INSERT INTO user_badges (user_id, tenant_id, badge_id) VALUES
(1, 1, 'first_checkin'),
(1, 1, 'streak_7'),
(1, 1, 'points_1000'),
(2, 1, 'first_checkin'),
(2, 1, 'streak_7'),
(4, 1, 'first_checkin'),
(4, 1, 'points_1000'),
(7, 2, 'first_checkin'),
(14, 4, 'first_checkin'),
(14, 4, 'streak_30'),
(14, 4, 'points_5000'),
(14, 4, 'level_5'),
(15, 4, 'first_checkin'),
(15, 4, 'streak_30'),
(15, 4, 'points_1000'),
(17, 4, 'first_checkin'),
(17, 4, 'streak_7'),
(17, 4, 'points_1000'),
(19, 5, 'first_checkin'),
(20, 5, 'first_checkin')
ON DUPLICATE KEY UPDATE badge_id = VALUES(badge_id);

-- ============================================================
-- 为企业C (tenant_id=3) 插入基础测试数据
-- 让 dashboard 能正常显示
-- ============================================================

-- 1. 插入几个虚拟商品
INSERT INTO products (id, tenant_id, name, description, type, price, stock, status, image_url, created_at) VALUES
(101, 3, '100积分兑换券', '积分补购兑换券', 'coupon', 100, 50, 1, NULL, NOW()),
(102, 3, '月度运动权益', '连续打卡满28天专属权益', 'privilege', 200, 20, 1, NULL, NOW()),
(103, 3, '企业定制周边', '碳积分专属周边礼品', 'coupon', 500, 10, 1, NULL, NOW());

-- 2. 插入几条打卡记录（用于趋势统计）
INSERT INTO check_in_records (id, tenant_id, user_id, checkin_date, checkin_time, rule_id, points_earned, created_at) VALUES
(1001, 3, 101, CURDATE() - INTERVAL 6 DAY, '07:30:00', 11, 8, NOW()),
(1002, 3, 101, CURDATE() - INTERVAL 5 DAY, '12:15:00', 12, 10, NOW()),
(1003, 3, 101, CURDATE() - INTERVAL 4 DAY, '18:45:00', 13, 12, NOW()),
(1004, 3, 101, CURDATE() - INTERVAL 3 DAY, '07:20:00', 11, 7, NOW()),
(1005, 3, 101, CURDATE() - INTERVAL 2 DAY, '12:30:00', 12, 11, NOW()),
(1006, 3, 101, CURDATE() - INTERVAL 1 DAY, '19:00:00', 13, 13, NOW()),
(1007, 3, 101, CURDATE(), '08:00:00', 11, 8, NOW()),

(1008, 3, 102, CURDATE() - INTERVAL 6 DAY, '07:45:00', 11, 6, NOW()),
(1009, 3, 102, CURDATE() - INTERVAL 5 DAY, '13:00:00', 12, 9, NOW()),
(1010, 3, 102, CURDATE() - INTERVAL 4 DAY, '18:30:00', 13, 11, NOW()),
(1011, 3, 102, CURDATE() - INTERVAL 3 DAY, '07:10:00', 11, 8, NOW()),
(1012, 3, 102, CURDATE() - INTERVAL 2 DAY, '12:45:00', 12, 10, NOW()),
(1013, 3, 102, CURDATE() - INTERVAL 1 DAY, '18:40:00', 13, 14, NOW());

-- 3. 积分流水（让积分统计有数据）
INSERT INTO point_transactions (id, tenant_id, user_id, transaction_type, points, balance_after, event_type, checkin_id, created_at) VALUES
(1001, 3, 101, 'earn', 8, 8, 'checkin', 1001, NOW()),
(1002, 3, 101, 'earn', 10, 18, 'checkin', 1002, NOW()),
(1003, 3, 101, 'earn', 12, 30, 'checkin', 1003, NOW()),
(1004, 3, 101, 'earn', 7, 37, 'checkin', 1004, NOW()),
(1005, 3, 101, 'earn', 11, 48, 'checkin', 1005, NOW()),
(1006, 3, 101, 'earn', 13, 61, 'checkin', 1006, NOW()),
(1007, 3, 101, 'earn', 8, 69, 'checkin', 1007, NOW()),

(1008, 3, 102, 'earn', 6, 6, 'checkin', 1008, NOW()),
(1009, 3, 102, 'earn', 9, 15, 'checkin', 1009, NOW()),
(1010, 3, 102, 'earn', 11, 26, 'checkin', 1010, NOW()),
(1011, 3, 102, 'earn', 8, 34, 'checkin', 1011, NOW()),
(1012, 3, 102, 'earn', 10, 44, 'checkin', 1012, NOW()),
(1013, 3, 102, 'earn', 14, 58, 'checkin', 1013, NOW());

-- 4. 更新用户积分账户
UPDATE users SET available_points = 69, total_points = 69 WHERE id = 101;
UPDATE users SET available_points = 58, total_points = 58 WHERE id = 102;

-- ============================================================
-- 为企业D (tenant_id=4) 也插入少量数据
-- ============================================================

INSERT INTO products (id, tenant_id, name, description, type, price, stock, status, image_url, created_at) VALUES
(201, 4, '50积分抵扣券', '小额积分兑换', 'coupon', 50, 100, 1, NULL, NOW()),
(202, 4, '季度运动会员', '季度专属权益会员', 'privilege', 300, 50, 1, NULL, NOW());

-- 为企业D创建默认积分规则（应该已经初始化了，这里确保存在）
INSERT IGNORE INTO point_rules (id, tenant_id, type, name, config, enabled, sort_order, created_at) VALUES
(21, 4, 'time_slot', '早时段', '{"start_time":"06:00","end_time":"09:00","min_points":5,"max_points":8}', 1, 1, NOW()),
(22, 4, 'time_slot', '午时段', '{"start_time":"11:30","end_time":"13:30","min_points":8,"max_points":12}', 1, 2, NOW()),
(23, 4, 'time_slot', '晚时段', '{"start_time":"18:00","end_time":"23:00","min_points":10,"max_points":15}', 1, 3, NOW()),
(24, 4, 'daily_cap', '每日上限', '{"max_points":50}', 1, 10, NOW());

-- 验证数据
SELECT 'products' as table_name, COUNT(*) as count FROM products WHERE tenant_id IN (3,4)
UNION ALL
SELECT 'check_in_records', COUNT(*) FROM check_in_records WHERE tenant_id IN (3,4)
UNION ALL
SELECT 'point_transactions', COUNT(*) FROM point_transactions WHERE tenant_id IN (3,4);

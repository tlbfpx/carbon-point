-- ============================================================
-- 只插入缺失的数据（products 已经存在）
-- ============================================================

-- 2. 插入几条打卡记录（用于趋势统计）
INSERT IGNORE INTO check_in_records (id, tenant_id, user_id, checkin_date, checkin_time, time_slot_rule_id, base_points, final_points, created_at) VALUES
(1001, 3, 101, CURDATE() - INTERVAL 6 DAY, '07:30:00', 11, 5, 8, NOW()),
(1002, 3, 101, CURDATE() - INTERVAL 5 DAY, '12:15:00', 12, 8, 10, NOW()),
(1003, 3, 101, CURDATE() - INTERVAL 4 DAY, '18:45:00', 13, 10, 12, NOW()),
(1004, 3, 101, CURDATE() - INTERVAL 3 DAY, '07:20:00', 11, 5, 7, NOW()),
(1005, 3, 101, CURDATE() - INTERVAL 2 DAY, '12:30:00', 12, 9, 11, NOW()),
(1006, 3, 101, CURDATE() - INTERVAL 1 DAY, '19:00:00', 13, 12, 13, NOW()),
(1007, 3, 101, CURDATE(), '08:00:00', 11, 6, 8, NOW()),

(1008, 3, 102, CURDATE() - INTERVAL 6 DAY, '07:45:00', 11, 5, 6, NOW()),
(1009, 3, 102, CURDATE() - INTERVAL 5 DAY, '13:00:00', 12, 8, 9, NOW()),
(1010, 3, 102, CURDATE() - INTERVAL 4 DAY, '18:30:00', 13, 10, 11, NOW()),
(1011, 3, 102, CURDATE() - INTERVAL 3 DAY, '07:10:00', 11, 6, 8, NOW()),
(1012, 3, 102, CURDATE() - INTERVAL 2 DAY, '12:45:00', 12, 8, 10, NOW()),
(1013, 3, 102, CURDATE() - INTERVAL 1 DAY, '18:40:00', 13, 12, 14, NOW());

-- 3. 积分流水（让积分统计有数据）
-- correct column names: amount, type (not points, transaction_type)
INSERT IGNORE INTO point_transactions (id, tenant_id, user_id, amount, type, balance_after, created_at) VALUES
(1001, 3, 101, 8, 'earn', 8, NOW()),
(1002, 3, 101, 10, 'earn', 18, NOW()),
(1003, 3, 101, 12, 'earn', 30, NOW()),
(1004, 3, 101, 7, 'earn', 37, NOW()),
(1005, 3, 101, 11, 'earn', 48, NOW()),
(1006, 3, 101, 13, 'earn', 61, NOW()),
(1007, 3, 101, 8, 'earn', 69, NOW()),

(1008, 3, 102, 6, 'earn', 6, NOW()),
(1009, 3, 102, 9, 'earn', 15, NOW()),
(1010, 3, 102, 11, 'earn', 26, NOW()),
(1011, 3, 102, 8, 'earn', 34, NOW()),
(1012, 3, 102, 10, 'earn', 44, NOW()),
(1013, 3, 102, 14, 'earn', 58, NOW());

-- 4. 更新用户积分账户
UPDATE users SET available_points = 69, total_points = 69 WHERE id = 101;
UPDATE users SET available_points = 58, total_points = 58 WHERE id = 102;

-- 验证数据
SELECT 'products' as table_name, COUNT(*) as count FROM products WHERE tenant_id IN (3,4)
UNION ALL
SELECT 'check_in_records', COUNT(*) FROM check_in_records WHERE tenant_id IN (3,4)
UNION ALL
SELECT 'point_transactions', COUNT(*) FROM point_transactions WHERE tenant_id IN (3,4);

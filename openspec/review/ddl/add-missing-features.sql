-- ============================================================
-- 添加缺失的功能点
-- ============================================================

-- 添加 checkin.stairs 功能
INSERT IGNORE INTO features (id, code, name, type, value_type, default_value, description, `group`, created_at, updated_at)
VALUES ('checkin.stairs', 'checkin.stairs', '爬楼梯打卡', 'permission', 'boolean', 'true', '爬楼梯打卡功能', '打卡', NOW(), NOW());

-- 添加 checkin.walking 功能
INSERT IGNORE INTO features (id, code, name, type, value_type, default_value, description, `group`, created_at, updated_at)
VALUES ('checkin.walking', 'checkin.walking', '步行打卡', 'permission', 'boolean', 'true', '步行打卡功能', '打卡', NOW(), NOW());

-- 验证添加结果
SELECT 'Features after adding missing ones:' AS status;
SELECT id, code, name FROM features ORDER BY id;

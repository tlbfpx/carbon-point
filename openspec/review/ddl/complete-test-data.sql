-- ============================================================
-- Carbon Point 完整测试数据脚本
-- 覆盖: 平台管理员、租户、用户、RBAC、打卡、积分、商城、荣誉、部门、通知、审计
-- 适用场景: 本地开发 / CI / Demo 环境初始化
-- 密码: 123456 (Argon2id hash, prefix: {argon2}$argon2id$v=19$m=65536,t=3,p=4$...)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 0. 密码哈希常量（统一使用 {argon2} 前缀格式）
-- 原文: 123456
-- ============================================================
SET @pwd_hash = '{argon2}$argon2id$v=19$m=65536,t=3,p=4$h01Ubn69ZEYPjKMLFWi6ow$T69ab97txy61+NTrZVTiMAofIJDfEGUkkuqlbkugBxk';

-- ============================================================
-- 1. 平台管理员
-- ============================================================
INSERT INTO platform_admins (id, username, password_hash, display_name, role, status, created_at, updated_at) VALUES
(1, 'admin',        @pwd_hash, '平台超级管理员', 'super_admin', 'active', NOW(), NOW()),
(2, 'operator',     @pwd_hash, '平台运营',      'admin',       'active', NOW(), NOW()),
(3, 'viewer',       @pwd_hash, '平台观察员',    'viewer',      'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), role = VALUES(role);

-- ============================================================
-- 2. 平台产品（权限体系用）
-- ============================================================
INSERT INTO platform_products (id, code, name, category, description, status, sort_order, created_at, updated_at) VALUES
('stair_climbing', 'stair_climbing', '爬楼梯打卡', 'stairs_climbing', '员工爬楼梯打卡获取积分', 1, 1, NOW(), NOW()),
('walking',        'walking',        '步行打卡',   'walking',         '员工步行打卡获取积分，支持微信运动/HealthKit/Health Connect', 1, 2, NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status);

-- ============================================================
-- 3. 功能点定义（权限体系用）
-- ============================================================
INSERT INTO features (id, code, name, type, value_type, default_value, description, `group`, created_at, updated_at) VALUES
('checkin.stairs',    'checkin.stairs',    '爬楼梯打卡',     'permission', 'boolean', 'true',  '爬楼梯打卡功能',            '打卡',        NOW(), NOW()),
('checkin.walking',   'checkin.walking',   '步行打卡',       'permission', 'boolean', 'true',  '步行打卡功能',              '打卡',        NOW(), NOW()),
('points.exchange',   'points.exchange',   '积分兑换',       'permission', 'boolean', 'true',  '积分兑换商品功能',          '积分',        NOW(), NOW()),
('mall.virtual',      'mall.virtual',      '虚拟商品兑换',   'permission', 'boolean', 'true',  '虚拟商品兑换功能',          '商城',        NOW(), NOW()),
('honor.badge',       'honor.badge',       '徽章体系',       'permission', 'boolean', 'false', '徽章获取与展示功能',        '荣誉',        NOW(), NOW()),
('honor.leaderboard', 'honor.leaderboard', '排行榜',         'permission', 'boolean', 'false', '排行榜展示功能',            '荣誉',        NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================================
-- 4. 产品功能关联
-- ============================================================
INSERT INTO product_features (product_id, feature_id, config_value, is_required, is_enabled, deleted, created_at, updated_at) VALUES
('stair_climbing', 'checkin.stairs',   'true', 1, 1, 0, NOW(), NOW()),
('stair_climbing', 'points.exchange',   'true', 0, 1, 0, NOW(), NOW()),
('stair_climbing', 'mall.virtual',     'true', 0, 1, 0, NOW(), NOW()),
('walking',        'checkin.walking',   'true', 1, 1, 0, NOW(), NOW()),
('walking',        'points.exchange',   'true', 0, 1, 0, NOW(), NOW()),
('walking',        'mall.virtual',     'true', 0, 1, 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- ============================================================
-- 5. 权限套餐（套餐表）
-- ============================================================
INSERT INTO permission_packages (id, code, name, description, status, created_at, updated_at) VALUES
(1, 'free',       '免费版',   '基础套餐，仅包含数据看板查看权限',                     1, NOW(), NOW()),
(2, 'pro',        '专业版',   '标准版 + 商品管理 + 订单核销',                        1, NOW(), NOW()),
(3, 'enterprise', '旗舰版',   '全功能套餐，包含所有企业端权限',                       1, NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================================
-- 6. 套餐权限绑定
-- ============================================================
-- free: 仅看板
INSERT INTO package_permissions (package_id, permission_code)
SELECT 1, code FROM permissions WHERE code = 'enterprise:dashboard:view'
ON DUPLICATE KEY UPDATE package_id = package_id;

-- pro: dashboard + member + rule + product + order
INSERT INTO package_permissions (package_id, permission_code)
SELECT 2, code FROM permissions WHERE module IN ('enterprise:dashboard','enterprise:member','enterprise:rule','enterprise:product','enterprise:order')
ON DUPLICATE KEY UPDATE package_id = package_id;

-- enterprise: 全部
INSERT INTO package_permissions (package_id, permission_code)
SELECT 3, code FROM permissions
ON DUPLICATE KEY UPDATE package_id = package_id;

-- ============================================================
-- 7. 套餐产品关联（套餐可以开通哪些产品）
-- ============================================================
INSERT INTO package_products (package_id, product_id, sort_order, deleted, created_at) VALUES
(1, 'stair_climbing', 1, 0, NOW()),
(2, 'stair_climbing', 1, 0, NOW()),
(2, 'walking',        2, 0, NOW()),
(3, 'stair_climbing', 1, 0, NOW()),
(3, 'walking',        2, 0, NOW())
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order);

-- ============================================================
-- 8. 租户（企业）
-- ============================================================
INSERT INTO tenants (id, name, logo, package_id, package_type, max_users, expires_at, status, created_at, updated_at, level_mode) VALUES
(1, '科技创新有限公司',  NULL, 3, 'enterprise', 200, NULL,                              'active', NOW(), NOW(), 'strict'),
(2, '互联网创业公司',    NULL, 2, 'pro',        100, DATE_ADD(NOW(), INTERVAL 365 DAY), 'active', NOW(), NOW(), 'flexible'),
(3, '传统企业集团',      NULL, 1, 'free',        50,  DATE_ADD(NOW(), INTERVAL 30 DAY), 'active', NOW(), NOW(), 'strict'),
(4, '阳光科技有限公司',  NULL, 3, 'enterprise', 300, NULL,                              'active', NOW(), NOW(), 'flexible'),
(5, '云端数据服务公司',  NULL, 2, 'pro',        150, DATE_ADD(NOW(), INTERVAL 180 DAY),'active', NOW(), NOW(), 'strict')
ON DUPLICATE KEY UPDATE name = VALUES(name), package_id = VALUES(package_id), status = VALUES(status);

-- ============================================================
-- 9. 部门（先插部门，因为用户要关联）
-- ============================================================
INSERT INTO departments (id, tenant_id, name, leader_id, created_at, updated_at) VALUES
-- 企业1 部门
(1,  1, '技术研发部',   NULL, NOW(), NOW()),
(2,  1, '产品运营部',   NULL, NOW(), NOW()),
(3,  1, '市场营销部',   NULL, NOW(), NOW()),
-- 企业2 部门
(4,  2, '技术部',       NULL, NOW(), NOW()),
(5,  2, '商务拓展部',   NULL, NOW(), NOW()),
-- 企业3 部门
(6,  3, '行政人事部',   NULL, NOW(), NOW()),
(7,  3, '财务部',       NULL, NOW(), NOW()),
-- 企业4 部门
(8,  4, '前端团队',     NULL, NOW(), NOW()),
(9,  4, '后端团队',     NULL, NOW(), NOW()),
(10, 4, '产品设计部',   NULL, NOW(), NOW()),
-- 企业5 部门
(11, 5, '数据工程部',   NULL, NOW(), NOW()),
(12, 5, '运维安全部',   NULL, NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================================
-- 10. 角色（每个企业的超管 + 运营）
-- ============================================================
INSERT INTO roles (id, tenant_id, name, role_type, is_editable, is_preset, created_at) VALUES
-- 企业1 (tenant_id=1)
(1,  1, '超级管理员', 'super_admin', 0, 1, NOW()),
(2,  1, '运营主管',   'operator',    1, 1, NOW()),
(3,  1, 'HR专员',     'custom',      1, 0, NOW()),
-- 企业2 (tenant_id=2)
(4,  2, '超级管理员', 'super_admin', 0, 1, NOW()),
(5,  2, '运营',       'operator',    1, 1, NOW()),
-- 企业3 (tenant_id=3)
(6,  3, '超级管理员', 'super_admin', 0, 1, NOW()),
-- 企业4 (tenant_id=4)
(7,  4, '超级管理员', 'super_admin', 0, 1, NOW()),
(8,  4, '运营',       'operator',    1, 1, NOW()),
-- 企业5 (tenant_id=5)
(9,  5, '超级管理员', 'super_admin', 0, 1, NOW()),
(10, 5, '运维主管',   'operator',    1, 1, NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name), role_type = VALUES(role_type);

-- ============================================================
-- 11. 角色权限绑定（企业1: 全权限; 企业2: pro; 企业3: free）
-- ============================================================

-- 全权限 → 企业1 超级管理员 (role_id=1)
INSERT INTO role_permissions (role_id, permission_code)
SELECT 1, code FROM permissions
ON DUPLICATE KEY UPDATE role_id = role_id;

-- 企业1 运营主管 (role_id=2): member + rule + product + order + point
INSERT INTO role_permissions (role_id, permission_code) VALUES
(2, 'enterprise:dashboard:view'),
(2, 'enterprise:member:list'),
(2, 'enterprise:member:create'),
(2, 'enterprise:member:edit'),
(2, 'enterprise:member:disable'),
(2, 'enterprise:rule:view'),
(2, 'enterprise:rule:create'),
(2, 'enterprise:rule:edit'),
(2, 'enterprise:product:list'),
(2, 'enterprise:product:create'),
(2, 'enterprise:product:edit'),
(2, 'enterprise:order:list'),
(2, 'enterprise:order:fulfill'),
(2, 'enterprise:point:query'),
(2, 'enterprise:point:add'),
(2, 'enterprise:report:view')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- 企业1 HR专员 (role_id=3): 仅成员管理
INSERT INTO role_permissions (role_id, permission_code) VALUES
(3, 'enterprise:dashboard:view'),
(3, 'enterprise:member:list'),
(3, 'enterprise:member:create'),
(3, 'enterprise:member:import')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- 企业2 pro 套餐角色 (role_id=4): pro 权限
INSERT INTO role_permissions (role_id, permission_code)
SELECT 4, code FROM permissions WHERE module IN ('enterprise:dashboard','enterprise:member','enterprise:rule','enterprise:product','enterprise:order')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- 企业3 free 角色 (role_id=6): 仅看板
INSERT INTO role_permissions (role_id, permission_code) VALUES
(6, 'enterprise:dashboard:view')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- 企业4 全权限 (role_id=7)
INSERT INTO role_permissions (role_id, permission_code)
SELECT 7, code FROM permissions
ON DUPLICATE KEY UPDATE role_id = role_id;

-- 企业5 pro 角色 (role_id=9)
INSERT INTO role_permissions (role_id, permission_code)
SELECT 9, code FROM permissions WHERE module IN ('enterprise:dashboard','enterprise:member','enterprise:rule','enterprise:product','enterprise:order')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- ============================================================
-- 12. 用户（每个企业多个用户，分属不同部门，不同等级）
-- ============================================================
INSERT INTO users (id, tenant_id, phone, password_hash, nickname, avatar, status, level, total_points, available_points, frozen_points, version, consecutive_days, last_checkin_date, department_id, created_at, updated_at) VALUES
-- 企业1 (tenant_id=1) — 旗舰版
(1,  1, '13800010001', @pwd_hash, '张三丰',    NULL, 'active', 3, 1280, 1050, 200, 0, 15, CURDATE(), 1,  NOW(), NOW()),
(2,  1, '13800010002', @pwd_hash, '李晓燕',    NULL, 'active', 2,  680,  630,   0, 0,  7, CURDATE(), 1,  NOW(), NOW()),
(3,  1, '13800010003', @pwd_hash, '王强',      NULL, 'active', 1,  120,  120,   0, 0,  3, CURDATE()-1, 2,  NOW(), NOW()),
(4,  1, '13800010004', @pwd_hash, '陈思思',   NULL, 'active', 2,  560,  510,  50, 0, 10, CURDATE(), 2,  NOW(), NOW()),
(5,  1, '13800010005', @pwd_hash, '刘建国',   NULL, 'disabled',1,  80,   80,   0, 0,  0, NULL,      3,  NOW(), NOW()),
(6,  1, '13800010006', @pwd_hash, '赵雅芝',   NULL, 'active', 1,   30,   30,   0, 0,  1, CURDATE(), 3,  NOW(), NOW()),
-- 企业2 (tenant_id=2) — 专业版
(7,  2, '13800020001', @pwd_hash, '周明',     NULL, 'active', 2,  420,  400,   0, 0,  5, CURDATE(), 4,  NOW(), NOW()),
(8,  2, '13800020002', @pwd_hash, '吴芳',     NULL, 'active', 1,  150,  150,   0, 0,  2, CURDATE()-1, 4,  NOW(), NOW()),
(9,  2, '13800020003', @pwd_hash, '郑浩然',   NULL, 'active', 1,   60,   60,   0, 0,  0, NULL,      5,  NOW(), NOW()),
(10, 2, '13800020004', @pwd_hash, '孙丽',     NULL, 'active', 1,  200,  200,   0, 0,  4, CURDATE(), 5,  NOW(), NOW()),
-- 企业3 (tenant_id=3) — 免费版
(11, 3, '13800030001', @pwd_hash, '马超',     NULL, 'active', 1,  300,  300,   0, 0,  6, CURDATE(), 6,  NOW(), NOW()),
(12, 3, '13800030002', @pwd_hash, '韩梅梅',   NULL, 'active', 1,  180,  180,   0, 0,  3, CURDATE()-1, 6,  NOW(), NOW()),
(13, 3, '13800030003', @pwd_hash, '苏格拉',   NULL, 'deleted',1,   50,   50,   0, 0,  0, NULL,      7,  NOW(), NOW()),
-- 企业4 (tenant_id=4) — 旗舰版
(14, 4, '13800040001', @pwd_hash, '刘备',     NULL, 'active', 4, 2560, 2300, 200, 0, 30, CURDATE(), 8,  NOW(), NOW()),
(15, 4, '13800040002', @pwd_hash, '关羽',     NULL, 'active', 3, 1100, 1000, 100, 0, 18, CURDATE(), 8,  NOW(), NOW()),
(16, 4, '13800040003', @pwd_hash, '张飞',     NULL, 'active', 2,  540,  540,   0, 0,  8, CURDATE(), 9,  NOW(), NOW()),
(17, 4, '13800040004', @pwd_hash, '诸葛亮',   NULL, 'active', 3,  980,  880, 100, 0, 12, CURDATE(), 10, NOW(), NOW()),
(18, 4, '13800040005', @pwd_hash, '赵云',     NULL, 'active', 2,  450,  450,   0, 0,  6, CURDATE(), 9,  NOW(), NOW()),
-- 企业5 (tenant_id=5) — 专业版
(19, 5, '13800050001', @pwd_hash, '司马懿',   NULL, 'active', 2,  620,  600,   0, 0,  9, CURDATE(), 11, NOW(), NOW()),
(20, 5, '13800050002', @pwd_hash, '曹操',     NULL, 'active', 1,  210,  210,   0, 0,  4, CURDATE(), 11, NOW(), NOW()),
(21, 5, '13800050003', @pwd_hash, '孙权',     NULL, 'active', 1,  130,  130,   0, 0,  2, CURDATE()-2, 12, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname), status = VALUES(status), level = VALUES(level), total_points = VALUES(total_points), available_points = VALUES(available_points);

-- ============================================================
-- 13. 用户角色绑定
-- ============================================================
INSERT INTO user_roles (user_id, role_id) VALUES
-- 企业1
(1, 1), (1, 2),   -- 张三丰: 超管 + 运营
(2, 2),           -- 李晓燕: 运营
(3, 3),           -- 王强: HR
(4, 2),           -- 陈思思: 运营
(5, 3),           -- 刘建国: HR (已禁用)
(6, 3),           -- 赵雅芝: HR
-- 企业2
(7, 4), (7, 5),   -- 周明: 超管 + 运营
(8, 5),           -- 吴芳: 运营
(9, 5),           -- 郑浩然: 运营
(10,5),           -- 孙丽: 运营
-- 企业3
(11,6),           -- 马超: 超管
(12,6),           -- 韩梅梅: 超管
(13,6),           -- 苏格拉: 超管 (已删除)
-- 企业4
(14,7),           -- 刘备: 超管
(15,8),           -- 关羽: 运营
(16,8),           -- 张飞: 运营
(17,7), (17,8),   -- 诸葛亮: 超管 + 运营
(18,8),           -- 赵云: 运营
-- 企业5
(19,9),           -- 司马懿: 超管
(20,10),          -- 曹操: 运维主管
(21,10)           -- 孙权: 运维主管
ON DUPLICATE KEY UPDATE user_id = user_id;

-- ============================================================
-- 14. 积分规则（每个企业的打卡时段规则）
-- ============================================================
INSERT INTO point_rules (id, tenant_id, type, name, config, enabled, sort_order, created_at, updated_at) VALUES
-- 企业1 (ID=1): 早中晚三时段 + 连续奖励 + 等级系数
(1,  1, 'time_slot',        '早高峰',     '{"start_time":"07:00","end_time":"09:00","min_points":5,"max_points":10}',  1, 1, NOW(), NOW()),
(2,  1, 'time_slot',        '午间',       '{"start_time":"11:30","end_time":"13:30","min_points":8,"max_points":15}',  1, 2, NOW(), NOW()),
(3,  1, 'time_slot',        '晚高峰',     '{"start_time":"18:00","end_time":"21:00","min_points":10,"max_points":20}', 1, 3, NOW(), NOW()),
(4,  1, 'daily_cap',       '每日上限',   '{"max_points":80}',                                                1, 10, NOW(), NOW()),
(5,  1, 'streak',           '连续打卡',   '{"bonus_per_day":2,"max_streak_bonus":20}',                       1, 11, NOW(), NOW()),
(6,  1, 'level_coefficient','等级系数',   '{"Lv1":1.0,"Lv2":1.2,"Lv3":1.5,"Lv4":1.8,"Lv5":2.0}',             1, 12, NOW(), NOW()),
-- 企业2 (ID=2): pro 版
(11, 2, 'time_slot',        '早高峰',     '{"start_time":"07:00","end_time":"09:00","min_points":5,"max_points":8}',   1, 1, NOW(), NOW()),
(12, 2, 'time_slot',        '晚高峰',     '{"start_time":"18:00","end_time":"20:00","min_points":8,"max_points":15}', 1, 2, NOW(), NOW()),
(13, 2, 'daily_cap',        '每日上限',   '{"max_points":50}',                                               1, 10, NOW(), NOW()),
-- 企业3 (ID=3): free 版
(21, 3, 'time_slot',        '全天时段',   '{"start_time":"06:00","end_time":"23:00","min_points":3,"max_points":8}',  1, 1, NOW(), NOW()),
(22, 3, 'daily_cap',        '每日上限',   '{"max_points":30}',                                               1, 10, NOW(), NOW()),
-- 企业4 (ID=4): 旗舰版，规则丰富
(31, 4, 'time_slot',        '早晨',       '{"start_time":"06:00","end_time":"09:00","min_points":5,"max_points":12}', 1, 1, NOW(), NOW()),
(32, 4, 'time_slot',        '午间',       '{"start_time":"11:00","end_time":"14:00","min_points":8,"max_points":15}', 1, 2, NOW(), NOW()),
(33, 4, 'time_slot',        '傍晚',       '{"start_time":"17:00","end_time":"20:00","min_points":10,"max_points":20}',1, 3, NOW(), NOW()),
(34, 4, 'time_slot',        '夜间',       '{"start_time":"21:00","end_time":"23:30","min_points":12,"max_points":25}',1, 4, NOW(), NOW()),
(35, 4, 'daily_cap',        '每日上限',   '{"max_points":100}',                                              1, 10, NOW(), NOW()),
(36, 4, 'streak',           '连续打卡',   '{"bonus_per_day":3,"max_streak_bonus":30}',                      1, 11, NOW(), NOW()),
(37, 4, 'level_coefficient','等级系数',   '{"Lv1":1.0,"Lv2":1.3,"Lv3":1.6,"Lv4":2.0,"Lv5":2.5}',            1, 12, NOW(), NOW()),
-- 企业5 (ID=5): pro 版
(41, 5, 'time_slot',        '早高峰',     '{"start_time":"07:00","end_time":"09:30","min_points":5,"max_points":10}', 1, 1, NOW(), NOW()),
(42, 5, 'time_slot',        '晚高峰',     '{"start_time":"18:00","end_time":"22:00","min_points":8,"max_points":15}', 1, 2, NOW(), NOW()),
(43, 5, 'daily_cap',        '每日上限',   '{"max_points":60}',                                               1, 10, NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name), config = VALUES(config);

-- ============================================================
-- 16. 时段规则表（打卡用，与 point_rules 的 time_slot 对应）
-- ============================================================
INSERT INTO time_slot_rules (id, tenant_id, name, start_time, end_time, base_points_min, base_points_max, enabled, sort_order, created_at, updated_at) VALUES
(1,  1, '早高峰', '07:00:00', '09:00:00', 5, 10, 1, 1, NOW(), NOW()),
(2,  1, '午间',  '11:30:00', '13:30:00', 8, 15, 1, 2, NOW(), NOW()),
(3,  1, '晚高峰', '18:00:00', '21:00:00', 10, 20, 1, 3, NOW(), NOW()),
(11, 2, '早高峰', '07:00:00', '09:00:00', 5, 8, 1, 1, NOW(), NOW()),
(12, 2, '晚高峰', '18:00:00', '20:00:00', 8, 15, 1, 2, NOW(), NOW()),
(21, 3, '全天时段','06:00:00','23:00:00', 3, 8, 1, 1, NOW(), NOW()),
(31, 4, '早晨',   '06:00:00', '09:00:00', 5, 12, 1, 1, NOW(), NOW()),
(32, 4, '午间',  '11:00:00', '14:00:00', 8, 15, 1, 2, NOW(), NOW()),
(33, 4, '傍晚',  '17:00:00', '20:00:00', 10, 20, 1, 3, NOW(), NOW()),
(34, 4, '夜间',  '21:00:00', '23:30:00', 12, 25, 1, 4, NOW(), NOW()),
(41, 5, '早高峰', '07:00:00', '09:30:00', 5, 10, 1, 1, NOW(), NOW()),
(42, 5, '晚高峰', '18:00:00', '22:00:00', 8, 15, 1, 2, NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name), base_points_min = VALUES(base_points_min), base_points_max = VALUES(base_points_max);

-- ============================================================
-- 17. 打卡记录（过去 30 天，跨企业多用户）
-- ============================================================
INSERT INTO check_in_records (id, user_id, tenant_id, time_slot_rule_id, checkin_date, checkin_time, base_points, final_points, multiplier, level_coefficient, consecutive_days, streak_bonus, created_at) VALUES
-- 企业1 用户1 张三丰 (连续15天, Lv3, 等级系数1.5)
-- 最近7天
(10001, 1, 1, 1, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 6 DAY, ' ', '07:30:00'), '%Y-%m-%d %H:%i:%s'), 6,  9, 1.0, 1.5, 10, 20, NOW() - INTERVAL 6 DAY),
(10002, 1, 1, 2, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 5 DAY, ' ', '12:00:00'), '%Y-%m-%d %H:%i:%s'), 10, 15, 1.0, 1.5, 11, 22, NOW() - INTERVAL 5 DAY),
(10003, 1, 1, 3, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 4 DAY, ' ', '19:00:00'), '%Y-%m-%d %H:%i:%s'), 12, 18, 1.0, 1.5, 12, 24, NOW() - INTERVAL 4 DAY),
(10004, 1, 1, 1, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 3 DAY, ' ', '07:45:00'), '%Y-%m-%d %H:%i:%s'), 5,  8, 1.0, 1.5, 13, 26, NOW() - INTERVAL 3 DAY),
(10005, 1, 1, 2, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 2 DAY, ' ', '11:45:00'), '%Y-%m-%d %H:%i:%s'), 9, 14, 1.0, 1.5, 14, 28, NOW() - INTERVAL 2 DAY),
(10006, 1, 1, 3, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 1 DAY, ' ', '20:00:00'), '%Y-%m-%d %H:%i:%s'), 14, 21, 1.0, 1.5, 15, 30, NOW() - INTERVAL 1 DAY),
(10007, 1, 1, 1, CURDATE(),                    '08:00:00', 7, 11, 1.0, 1.5, 16, 30, NOW()),
-- 再往前一些
(10008, 1, 1, 1, CURDATE() - INTERVAL 13 DAY,'07:20:00', 6,  9, 1.0, 1.5,  7, 14, NOW() - INTERVAL 13 DAY),
(10009, 1, 1, 3, CURDATE() - INTERVAL 12 DAY,'18:30:00', 11, 17, 1.0, 1.5,  8, 16, NOW() - INTERVAL 12 DAY),
(10010, 1, 1, 2, CURDATE() - INTERVAL 11 DAY,'12:15:00', 8, 12, 1.0, 1.5,  9, 18, NOW() - INTERVAL 11 DAY),

-- 企业1 用户2 李晓燕 (连续7天, Lv2)
(10011, 2, 1, 1, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 6 DAY, ' ', '07:50:00'), '%Y-%m-%d %H:%i:%s'), 5,  6, 1.0, 1.2,  2,  4, NOW() - INTERVAL 6 DAY),
(10012, 2, 1, 3, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 5 DAY, ' ', '19:30:00'), '%Y-%m-%d %H:%i:%s'), 10, 12, 1.0, 1.2,  3,  6, NOW() - INTERVAL 5 DAY),
(10013, 2, 1, 1, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 4 DAY, ' ', '08:00:00'), '%Y-%m-%d %H:%i:%s'), 6,  7, 1.0, 1.2,  4,  8, NOW() - INTERVAL 4 DAY),
(10014, 2, 1, 2, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 3 DAY, ' ', '12:30:00'), '%Y-%m-%d %H:%i:%s'), 8, 10, 1.0, 1.2,  5, 10, NOW() - INTERVAL 3 DAY),
(10015, 2, 1, 3, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 2 DAY, ' ', '20:15:00'), '%Y-%m-%d %H:%i:%s'), 11, 13, 1.0, 1.2,  6, 12, NOW() - INTERVAL 2 DAY),
(10016, 2, 1, 1, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 1 DAY, ' ', '08:10:00'), '%Y-%m-%d %H:%i:%s'), 5,  6, 1.0, 1.2,  7, 14, NOW() - INTERVAL 1 DAY),
(10017, 2, 1, 2, CURDATE(),                    '12:00:00', 9, 11, 1.0, 1.2,  8, 16, NOW()),

-- 企业1 用户3 王强 (Lv1, 刚加入)
(10018, 3, 1, 1, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 2 DAY, ' ', '07:40:00'), '%Y-%m-%d %H:%i:%s'), 5,  5, 1.0, 1.0,  1,  0, NOW() - INTERVAL 2 DAY),
(10019, 3, 1, 3, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 1 DAY, ' ', '18:50:00'), '%Y-%m-%d %H:%i:%s'), 7,  7, 1.0, 1.0,  2,  0, NOW() - INTERVAL 1 DAY),

-- 企业1 用户4 陈思思 (Lv2, 连续10天)
(10020, 4, 1, 1, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 9 DAY, ' ', '07:30:00'), '%Y-%m-%d %H:%i:%s'), 6,  7, 1.0, 1.2,  4,  8, NOW() - INTERVAL 9 DAY),
(10021, 4, 1, 2, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 8 DAY, ' ', '12:00:00'), '%Y-%m-%d %H:%i:%s'), 8, 10, 1.0, 1.2,  5, 10, NOW() - INTERVAL 8 DAY),
(10022, 4, 1, 3, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 7 DAY, ' ', '19:00:00'), '%Y-%m-%d %H:%i:%s'), 11, 13, 1.0, 1.2,  6, 12, NOW() - INTERVAL 7 DAY),
(10023, 4, 1, 1, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 6 DAY, ' ', '08:00:00'), '%Y-%m-%d %H:%i:%s'), 5,  6, 1.0, 1.2,  7, 14, NOW() - INTERVAL 6 DAY),
(10024, 4, 1, 2, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 5 DAY, ' ', '12:30:00'), '%Y-%m-%d %H:%i:%s'), 9, 11, 1.0, 1.2,  8, 16, NOW() - INTERVAL 5 DAY),
(10025, 4, 1, 3, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 4 DAY, ' ', '20:00:00'), '%Y-%m-%d %H:%i:%s'), 12, 14, 1.0, 1.2,  9, 18, NOW() - INTERVAL 4 DAY),
(10026, 4, 1, 1, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 3 DAY, ' ', '07:50:00'), '%Y-%m-%d %H:%i:%s'), 5,  6, 1.0, 1.2, 10, 20, NOW() - INTERVAL 3 DAY),
(10027, 4, 1, 2, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 2 DAY, ' ', '12:15:00'), '%Y-%m-%d %H:%i:%s'), 8, 10, 1.0, 1.2, 11, 22, NOW() - INTERVAL 2 DAY),
(10028, 4, 1, 3, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 1 DAY, ' ', '19:30:00'), '%Y-%m-%d %H:%i:%s'), 11, 13, 1.0, 1.2, 12, 24, NOW() - INTERVAL 1 DAY),
(10029, 4, 1, 1, CURDATE(),                    '08:00:00', 6,  7, 1.0, 1.2, 13, 26, NOW()),

-- 企业2 用户7 周明 (Lv2, 连续5天)
(10030, 7, 2, 11, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 4 DAY, ' ', '07:30:00'), '%Y-%m-%d %H:%i:%s'), 5,  5, 1.0, 1.2,  2,  4, NOW() - INTERVAL 4 DAY),
(10031, 7, 2, 12, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 3 DAY, ' ', '18:30:00'), '%Y-%m-%d %H:%i:%s'), 9, 11, 1.0, 1.2,  3,  6, NOW() - INTERVAL 3 DAY),
(10032, 7, 2, 11, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 2 DAY, ' ', '08:00:00'), '%Y-%m-%d %H:%i:%s'), 6,  7, 1.0, 1.2,  4,  8, NOW() - INTERVAL 2 DAY),
(10033, 7, 2, 12, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 1 DAY, ' ', '19:00:00'), '%Y-%m-%d %H:%i:%s'), 10, 12, 1.0, 1.2,  5, 10, NOW() - INTERVAL 1 DAY),
(10034, 7, 2, 11, CURDATE(),                   '07:45:00', 5,  6, 1.0, 1.2,  6, 12, NOW()),

-- 企业4 用户14 刘备 (Lv4, 连续30天，大量记录)
(10035, 14, 4, 31, CURDATE() - INTERVAL 29 DAY,'06:30:00', 8, 16, 1.0, 2.0, 26, 52, NOW() - INTERVAL 29 DAY),
(10036, 14, 4, 32, CURDATE() - INTERVAL 28 DAY,'11:30:00', 10, 20, 1.0, 2.0, 27, 54, NOW() - INTERVAL 28 DAY),
(10037, 14, 4, 33, CURDATE() - INTERVAL 27 DAY,'17:30:00', 12, 24, 1.0, 2.0, 28, 56, NOW() - INTERVAL 27 DAY),
(10038, 14, 4, 34, CURDATE() - INTERVAL 26 DAY,'21:30:00', 14, 28, 1.0, 2.0, 29, 58, NOW() - INTERVAL 26 DAY),
(10039, 14, 4, 31, CURDATE() - INTERVAL 25 DAY,'06:45:00', 7, 14, 1.0, 2.0, 30, 60, NOW() - INTERVAL 25 DAY),
-- 继续最近一周
(10040, 14, 4, 31, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 6 DAY, ' ', '06:30:00'), '%Y-%m-%d %H:%i:%s'), 8, 16, 1.0, 2.0, 25, 50, NOW() - INTERVAL 6 DAY),
(10041, 14, 4, 32, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 5 DAY, ' ', '11:00:00'), '%Y-%m-%d %H:%i:%s'), 10, 20, 1.0, 2.0, 26, 52, NOW() - INTERVAL 5 DAY),
(10042, 14, 4, 33, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 4 DAY, ' ', '17:45:00'), '%Y-%m-%d %H:%i:%s'), 12, 24, 1.0, 2.0, 27, 54, NOW() - INTERVAL 4 DAY),
(10043, 14, 4, 34, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 3 DAY, ' ', '21:00:00'), '%Y-%m-%d %H:%i:%s'), 15, 30, 1.0, 2.0, 28, 56, NOW() - INTERVAL 3 DAY),
(10044, 14, 4, 31, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 2 DAY, ' ', '07:00:00'), '%Y-%m-%d %H:%i:%s'), 8, 16, 1.0, 2.0, 29, 58, NOW() - INTERVAL 2 DAY),
(10045, 14, 4, 32, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 1 DAY, ' ', '11:30:00'), '%Y-%m-%d %H:%i:%s'), 10, 20, 1.0, 2.0, 30, 60, NOW() - INTERVAL 1 DAY),
(10046, 14, 4, 33, CURDATE(),                   '17:30:00', 12, 24, 1.0, 2.0, 31, 60, NOW()),

-- 企业4 用户15 关羽 (Lv3, 连续18天)
(10047, 15, 4, 31, CURDATE() - INTERVAL 17 DAY,'06:50:00', 6,  9, 1.0, 1.5, 12, 24, NOW() - INTERVAL 17 DAY),
(10048, 15, 4, 32, CURDATE() - INTERVAL 16 DAY,'11:30:00', 8, 12, 1.0, 1.5, 13, 26, NOW() - INTERVAL 16 DAY),
(10049, 15, 4, 33, CURDATE() - INTERVAL 15 DAY,'17:30:00', 10, 15, 1.0, 1.5, 14, 28, NOW() - INTERVAL 15 DAY),
(10050, 15, 4, 31, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 6 DAY, ' ', '07:00:00'), '%Y-%m-%d %H:%i:%s'), 7, 11, 1.0, 1.5, 13, 26, NOW() - INTERVAL 6 DAY),
(10051, 15, 4, 33, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 5 DAY, ' ', '18:00:00'), '%Y-%m-%d %H:%i:%s'), 11, 17, 1.0, 1.5, 14, 28, NOW() - INTERVAL 5 DAY),
(10052, 15, 4, 34, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 4 DAY, ' ', '21:30:00'), '%Y-%m-%d %H:%i:%s'), 13, 20, 1.0, 1.5, 15, 30, NOW() - INTERVAL 4 DAY),
(10053, 15, 4, 31, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 3 DAY, ' ', '07:10:00'), '%Y-%m-%d %H:%i:%s'), 6,  9, 1.0, 1.5, 16, 32, NOW() - INTERVAL 3 DAY),
(10054, 15, 4, 32, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 2 DAY, ' ', '12:00:00'), '%Y-%m-%d %H:%i:%s'), 9, 14, 1.0, 1.5, 17, 34, NOW() - INTERVAL 2 DAY),
(10055, 15, 4, 33, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 1 DAY, ' ', '17:45:00'), '%Y-%m-%d %H:%i:%s'), 11, 17, 1.0, 1.5, 18, 36, NOW() - INTERVAL 1 DAY),
(10056, 15, 4, 31, CURDATE(),                   '07:00:00', 7, 11, 1.0, 1.5, 19, 38, NOW()),

-- 企业4 用户17 诸葛亮 (Lv3, 连续12天)
(10057, 17, 4, 32, CURDATE() - INTERVAL 11 DAY,'11:30:00', 9, 14, 1.0, 1.5,  6, 12, NOW() - INTERVAL 11 DAY),
(10058, 17, 4, 33, CURDATE() - INTERVAL 10 DAY,'17:30:00', 10, 15, 1.0, 1.5,  7, 14, NOW() - INTERVAL 10 DAY),
(10059, 17, 4, 31, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 6 DAY, ' ', '07:00:00'), '%Y-%m-%d %H:%i:%s'), 7, 11, 1.0, 1.5,  7, 14, NOW() - INTERVAL 6 DAY),
(10060, 17, 4, 32, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 5 DAY, ' ', '12:00:00'), '%Y-%m-%d %H:%i:%s'), 8, 12, 1.0, 1.5,  8, 16, NOW() - INTERVAL 5 DAY),
(10061, 17, 4, 33, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 4 DAY, ' ', '18:00:00'), '%Y-%m-%d %H:%i:%s'), 11, 17, 1.0, 1.5,  9, 18, NOW() - INTERVAL 4 DAY),
(10062, 17, 4, 34, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 3 DAY, ' ', '21:30:00'), '%Y-%m-%d %H:%i:%s'), 14, 21, 1.0, 1.5, 10, 20, NOW() - INTERVAL 3 DAY),
(10063, 17, 4, 31, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 2 DAY, ' ', '07:20:00'), '%Y-%m-%d %H:%i:%s'), 6,  9, 1.0, 1.5, 11, 22, NOW() - INTERVAL 2 DAY),
(10064, 17, 4, 32, STR_TO_DATE(CONCAT(CURDATE() - INTERVAL 1 DAY, ' ', '11:45:00'), '%Y-%m-%d %H:%i:%s'), 9, 14, 1.0, 1.5, 12, 24, NOW() - INTERVAL 1 DAY),
(10065, 17, 4, 33, CURDATE(),                   '17:30:00', 10, 15, 1.0, 1.5, 13, 26, NOW())
INSERT INTO check_in_records (id, user_id, tenant_id, time_slot_rule_id, checkin_date, checkin_time, base_points, final_points, multiplier, level_coefficient, consecutive_days, streak_bonus, created_at) VALUES

-- ============================================================
-- 18. Outbox 事件（打卡积分发放事件的最终一致性记录）
-- ============================================================
INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload, trace_id, created_at, processed, processed_at) VALUES
(1, 'check_in', 10001, 'points_awarded',    '{"userId":1,"points":9,"checkInRecordId":10001}',   NULL, NOW() - INTERVAL 6 DAY, 1, NOW() - INTERVAL 6 DAY),
(2, 'check_in', 10002, 'points_awarded',    '{"userId":1,"points":15,"checkInRecordId":10002}',  NULL, NOW() - INTERVAL 5 DAY, 1, NOW() - INTERVAL 5 DAY),
(3, 'check_in', 10003, 'points_awarded',    '{"userId":1,"points":18,"checkInRecordId":10003}',  NULL, NOW() - INTERVAL 4 DAY, 1, NOW() - INTERVAL 4 DAY),
(4, 'check_in', 10004, 'points_awarded',    '{"userId":1,"points":8,"checkInRecordId":10004}',  NULL, NOW() - INTERVAL 3 DAY, 1, NOW() - INTERVAL 3 DAY),
(5, 'check_in', 10005, 'points_awarded',    '{"userId":1,"points":14,"checkInRecordId":10005}',  NULL, NOW() - INTERVAL 2 DAY, 1, NOW() - INTERVAL 2 DAY),
(6, 'check_in', 10006, 'points_awarded',    '{"userId":1,"points":21,"checkInRecordId":10006}',  NULL, NOW() - INTERVAL 1 DAY, 1, NOW() - INTERVAL 1 DAY),
(7, 'check_in', 10007, 'points_awarded',    '{"userId":1,"points":11,"checkInRecordId":10007}',  NULL, NOW(),                   1, NOW()),
(8, 'check_in', 10035, 'points_awarded',    '{"userId":14,"points":16,"checkInRecordId":10035}', NULL, NOW() - INTERVAL 29 DAY, 1, NOW() - INTERVAL 29 DAY),
(9, 'check_in', 10046, 'points_awarded',    '{"userId":14,"points":24,"checkInRecordId":10046}', NULL, NOW(),                   1, NOW()),
(10,'check_in', 10056, 'points_awarded',    '{"userId":15,"points":11,"checkInRecordId":10056}', NULL, NOW(),                   1, NOW())
ON DUPLICATE KEY UPDATE processed = VALUES(processed);

-- ============================================================
-- 19. 积分流水（按用户累计历史）
-- ============================================================
INSERT INTO point_transactions (id, user_id, tenant_id, amount, type, reference_id, product_code, source_type, balance_after, frozen_after, expire_time, created_at) VALUES
-- 张三丰 (user_id=1, tenant_id=1) — 总积分1280，可用1050，冻结200
(20001, 1, 1,   9, 'check_in',     '10001', 'stair_climbing', 'check_in',   9, 0, NULL, NOW() - INTERVAL 6 DAY),
(20002, 1, 1,  15, 'check_in',     '10002', 'stair_climbing', 'check_in',  24, 0, NULL, NOW() - INTERVAL 5 DAY),
(20003, 1, 1,  18, 'check_in',     '10003', 'stair_climbing', 'check_in',  42, 0, NULL, NOW() - INTERVAL 4 DAY),
(20004, 1, 1,   8, 'check_in',     '10004', 'stair_climbing', 'check_in',  50, 0, NULL, NOW() - INTERVAL 3 DAY),
(20005, 1, 1,  14, 'check_in',     '10005', 'stair_climbing', 'check_in',  64, 0, NULL, NOW() - INTERVAL 2 DAY),
(20006, 1, 1,  21, 'check_in',     '10006', 'stair_climbing', 'check_in',  85, 0, NULL, NOW() - INTERVAL 1 DAY),
(20007, 1, 1,  11, 'check_in',     '10007', 'stair_climbing', 'check_in',  96, 0, NULL, NOW()),
(20008, 1, 1,  20, 'streak_bonus', '10001', 'stair_climbing', 'streak_bonus', 116, 0, NULL, NOW() - INTERVAL 6 DAY),
(20009, 1, 1,  22, 'streak_bonus', '10002', 'stair_climbing', 'streak_bonus', 138, 0, NULL, NOW() - INTERVAL 5 DAY),
(20010, 1, 1,  24, 'streak_bonus', '10003', 'stair_climbing', 'streak_bonus', 162, 0, NULL, NOW() - INTERVAL 4 DAY),
(20011, 1, 1,  26, 'streak_bonus', '10004', 'stair_climbing', 'streak_bonus', 188, 0, NULL, NOW() - INTERVAL 3 DAY),
(20012, 1, 1,  28, 'streak_bonus', '10005', 'stair_climbing', 'streak_bonus', 216, 0, NULL, NOW() - INTERVAL 2 DAY),
(20013, 1, 1,  30, 'streak_bonus', '10006', 'stair_climbing', 'streak_bonus', 246, 0, NULL, NOW() - INTERVAL 1 DAY),
(20014, 1, 1,  30, 'streak_bonus', '10007', 'stair_climbing', 'streak_bonus', 276, 0, NULL, NOW()),
-- 兑换商品，冻结200积分
(20015, 1, 1, -200, 'exchange', 'ORD001', 'stair_climbing', 'exchange', 276, 200, NULL, NOW()),
-- 手动发放
(20016, 1, 1, 100, 'manual_add', NULL, NULL, NULL, 376, 200, NULL, NOW() - INTERVAL 10 DAY),
-- 手动扣减
(20017, 1, 1, -50, 'manual_deduct', NULL, NULL, NULL, 326, 200, NULL, NOW() - INTERVAL 5 DAY),

-- 李晓燕 (user_id=2, tenant_id=1) — 总680，可用630
(20021, 2, 1,   6, 'check_in',     '10011', 'stair_climbing', 'check_in',    6, 0, NULL, NOW() - INTERVAL 6 DAY),
(20022, 2, 1,  12, 'check_in',     '10012', 'stair_climbing', 'check_in',   18, 0, NULL, NOW() - INTERVAL 5 DAY),
(20023, 2, 1,   7, 'check_in',     '10013', 'stair_climbing', 'check_in',   25, 0, NULL, NOW() - INTERVAL 4 DAY),
(20024, 2, 1,  10, 'check_in',     '10014', 'stair_climbing', 'check_in',   35, 0, NULL, NOW() - INTERVAL 3 DAY),
(20025, 2, 1,  13, 'check_in',     '10015', 'stair_climbing', 'check_in',   48, 0, NULL, NOW() - INTERVAL 2 DAY),
(20026, 2, 1,   6, 'check_in',     '10016', 'stair_climbing', 'check_in',   54, 0, NULL, NOW() - INTERVAL 1 DAY),
(20027, 2, 1,  11, 'check_in',     '10017', 'stair_climbing', 'check_in',   65, 0, NULL, NOW()),
(20028, 2, 1,   4, 'streak_bonus', '10011', 'stair_climbing', 'streak_bonus', 69, 0, NULL, NOW() - INTERVAL 6 DAY),
(20029, 2, 1,   6, 'streak_bonus', '10012', 'stair_climbing', 'streak_bonus', 75, 0, NULL, NOW() - INTERVAL 5 DAY),
(20030, 2, 1,   8, 'streak_bonus', '10013', 'stair_climbing', 'streak_bonus', 83, 0, NULL, NOW() - INTERVAL 4 DAY),
(20031, 2, 1,  10, 'streak_bonus', '10014', 'stair_climbing', 'streak_bonus', 93, 0, NULL, NOW() - INTERVAL 3 DAY),
(20032, 2, 1,  12, 'streak_bonus', '10015', 'stair_climbing', 'streak_bonus', 105, 0, NULL, NOW() - INTERVAL 2 DAY),
(20033, 2, 1,  14, 'streak_bonus', '10016', 'stair_climbing', 'streak_bonus', 119, 0, NULL, NOW() - INTERVAL 1 DAY),
(20034, 2, 1,  16, 'streak_bonus', '10017', 'stair_climbing', 'streak_bonus', 135, 0, NULL, NOW()),

-- 刘备 (user_id=14, tenant_id=4) — 总2560，可用2300，冻结200
(20041, 14, 4,  16, 'check_in',     '10035', 'stair_climbing', 'check_in',   16, 0, NULL, NOW() - INTERVAL 29 DAY),
(20042, 14, 4,  20, 'check_in',     '10036', 'stair_climbing', 'check_in',   36, 0, NULL, NOW() - INTERVAL 28 DAY),
(20043, 14, 4,  24, 'check_in',     '10037', 'stair_climbing', 'check_in',   60, 0, NULL, NOW() - INTERVAL 27 DAY),
(20044, 14, 4,  28, 'check_in',     '10038', 'stair_climbing', 'check_in',   88, 0, NULL, NOW() - INTERVAL 26 DAY),
(20045, 14, 4,  14, 'check_in',     '10039', 'stair_climbing', 'check_in',  102, 0, NULL, NOW() - INTERVAL 25 DAY),
(20046, 14, 4,  16, 'check_in',     '10040', 'stair_climbing', 'check_in',  118, 0, NULL, NOW() - INTERVAL 6 DAY),
(20047, 14, 4,  20, 'check_in',     '10041', 'stair_climbing', 'check_in',  138, 0, NULL, NOW() - INTERVAL 5 DAY),
(20048, 14, 4,  24, 'check_in',     '10042', 'stair_climbing', 'check_in',  162, 0, NULL, NOW() - INTERVAL 4 DAY),
(20049, 14, 4,  30, 'check_in',     '10043', 'stair_climbing', 'check_in',  192, 0, NULL, NOW() - INTERVAL 3 DAY),
(20050, 14, 4,  16, 'check_in',     '10044', 'stair_climbing', 'check_in',  208, 0, NULL, NOW() - INTERVAL 2 DAY),
(20051, 14, 4,  20, 'check_in',     '10045', 'stair_climbing', 'check_in',  228, 0, NULL, NOW() - INTERVAL 1 DAY),
(20052, 14, 4,  24, 'check_in',     '10046', 'stair_climbing', 'check_in',  252, 0, NULL, NOW()),
(20053, 14, 4,  52, 'streak_bonus', '10035', 'stair_climbing', 'streak_bonus', 304, 0, NULL, NOW() - INTERVAL 29 DAY),
(20054, 14, 4,  60, 'streak_bonus', '10046', 'stair_climbing', 'streak_bonus', 364, 0, NULL, NOW()),
-- 兑换冻结200
(20055, 14, 4, -200, 'exchange', 'ORD002', 'stair_climbing', 'exchange', 364, 200, NULL, NOW()),

-- 关羽 (user_id=15, tenant_id=4) — 总1100，可用1000，冻结100
(20061, 15, 4,   9, 'check_in',     '10047', 'stair_climbing', 'check_in',    9, 0, NULL, NOW() - INTERVAL 17 DAY),
(20062, 15, 4,  12, 'check_in',     '10048', 'stair_climbing', 'check_in',   21, 0, NULL, NOW() - INTERVAL 16 DAY),
(20063, 15, 4,  15, 'check_in',     '10049', 'stair_climbing', 'check_in',   36, 0, NULL, NOW() - INTERVAL 15 DAY),
(20064, 15, 4,  11, 'check_in',     '10050', 'stair_climbing', 'check_in',   47, 0, NULL, NOW() - INTERVAL 6 DAY),
(20065, 15, 4,  17, 'check_in',     '10051', 'stair_climbing', 'check_in',   64, 0, NULL, NOW() - INTERVAL 5 DAY),
(20066, 15, 4,  20, 'check_in',     '10052', 'stair_climbing', 'check_in',   84, 0, NULL, NOW() - INTERVAL 4 DAY),
(20067, 15, 4,   9, 'check_in',     '10053', 'stair_climbing', 'check_in',   93, 0, NULL, NOW() - INTERVAL 3 DAY),
(20068, 15, 4,  14, 'check_in',     '10054', 'stair_climbing', 'check_in',  107, 0, NULL, NOW() - INTERVAL 2 DAY),
(20069, 15, 4,  17, 'check_in',     '10055', 'stair_climbing', 'check_in',  124, 0, NULL, NOW() - INTERVAL 1 DAY),
(20070, 15, 4,  11, 'check_in',     '10056', 'stair_climbing', 'check_in',  135, 0, NULL, NOW()),
(20071, 15, 4,  38, 'streak_bonus', '10056', 'stair_climbing', 'streak_bonus', 173, 0, NULL, NOW()),
-- 兑换冻结100
(20072, 15, 4, -100, 'exchange', 'ORD003', 'stair_climbing', 'exchange', 173, 100, NULL, NOW()),

-- 周明 (user_id=7, tenant_id=2) — 总420，可用400
(20081, 7, 2,   5, 'check_in',     '10030', 'stair_climbing', 'check_in',    5, 0, NULL, NOW() - INTERVAL 4 DAY),
(20082, 7, 2,  11, 'check_in',     '10031', 'stair_climbing', 'check_in',   16, 0, NULL, NOW() - INTERVAL 3 DAY),
(20083, 7, 2,   7, 'check_in',     '10032', 'stair_climbing', 'check_in',   23, 0, NULL, NOW() - INTERVAL 2 DAY),
(20084, 7, 2,  12, 'check_in',     '10033', 'stair_climbing', 'check_in',   35, 0, NULL, NOW() - INTERVAL 1 DAY),
(20085, 7, 2,   6, 'check_in',     '10034', 'stair_climbing', 'check_in',   41, 0, NULL, NOW()),
(20086, 7, 2,   4, 'streak_bonus', '10030', 'stair_climbing', 'streak_bonus', 45, 0, NULL, NOW() - INTERVAL 4 DAY),
(20087, 7, 2,   6, 'streak_bonus', '10031', 'stair_climbing', 'streak_bonus', 51, 0, NULL, NOW() - INTERVAL 3 DAY),
(20088, 7, 2,   8, 'streak_bonus', '10032', 'stair_climbing', 'streak_bonus', 59, 0, NULL, NOW() - INTERVAL 2 DAY),
(20089, 7, 2,  10, 'streak_bonus', '10033', 'stair_climbing', 'streak_bonus', 69, 0, NULL, NOW() - INTERVAL 1 DAY),
(20090, 7, 2,  12, 'streak_bonus', '10034', 'stair_climbing', 'streak_bonus', 81, 0, NULL, NOW())
ON DUPLICATE KEY UPDATE balance_after = VALUES(balance_after);

-- ============================================================
-- 20. 虚拟商品
-- ============================================================
INSERT INTO products (id, tenant_id, name, description, image, type, points_price, stock, max_per_user, validity_days, fulfillment_config, status, sort_order, created_at, updated_at) VALUES
-- 企业1 商品
(1,  1, '咖啡券',      '星巴克中杯拿铁券',          NULL, 'coupon',   200, 100, 2, 30, '{"code_length":12,"prefix":"Coffee"}',    'active', 1, NOW(), NOW()),
(2,  1, '视频会员月卡', '爱奇艺/优酷月卡二选一',     NULL, 'recharge', 300, NULL, 1, 30, '{"provider":"video","duration_days":30}', 'active', 2, NOW(), NOW()),
(3,  1, '加班打车券',  '滴滴出行30元代金券',        NULL, 'coupon',   150, 200, 3, 15, '{"code_length":10,"prefix":"Taxi"}',       'active', 3, NOW(), NOW()),
(4,  1, '午餐补贴',    '食堂50元代金券',             NULL, 'privilege',100, NULL, 5, 7,  '{"threshold":0}',                         'active', 4, NOW(), NOW()),
(5,  1, '运动耳机',    '品牌运动蓝牙耳机',            NULL, 'privilege',800, 20,  1, NULL, '{"shipping":"physical"}',                  'active', 5, NOW(), NOW()),
(6,  1, '商城积分加倍卡','兑换后下次打卡积分x1.5',   NULL, 'privilege',50,  NULL, 1, 3,  '{"multiplier":1.5}',                       'active', 6, NOW(), NOW()),
-- 企业2 商品
(11, 2, '下午茶券',    '喜茶/奈雪任选一杯',          NULL, 'coupon',   180, 50,  1, 14, '{"code_length":12,"prefix":"Tea"}',        'active', 1, NOW(), NOW()),
(12, 2, '电影票',      '猫眼电影票一张',             NULL, 'recharge', 250, 100, 2, 30, '{"provider":"movie","quantity":1}',        'active', 2, NOW(), NOW()),
-- 企业4 商品
(21, 4, '豪华自助餐',  '五星级酒店双人自助晚餐',     NULL, 'privilege',2000, 10, 1, 90, '{"shipping":"physical"}',                  'active', 1, NOW(), NOW()),
(22, 4, '按摩券',      '专业肩颈按摩30分钟',         NULL, 'coupon',   500, 30,  1, 60, '{"code_length":16,"prefix":"Massage"}',     'active', 2, NOW(), NOW()),
(23, 4, '咖啡券',      '瑞幸咖啡一杯',               NULL, 'coupon',   100, NULL, 3, 30, '{"code_length":10,"prefix":"Luckin"}',      'active', 3, NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status);

-- ============================================================
-- 21. 兑换订单
-- ============================================================
INSERT INTO exchange_orders (id, tenant_id, user_id, product_id, product_name, product_type, points_spent, coupon_code, order_status, expires_at, fulfilled_at, used_at, used_by, created_at, updated_at) VALUES
-- 张三丰 的订单
(1, 1, 1, 1, '咖啡券', 'coupon',   200, 'CoffeeA8X2K1M3N5', 'fulfilled', DATE_ADD(NOW(), INTERVAL 30 DAY), NOW() - INTERVAL 20 DAY, NOW() - INTERVAL 15 DAY, 'self',     NOW() - INTERVAL 20 DAY, NOW()),
(2, 1, 1, 3, '加班打车券', 'coupon', 150, 'TaxiB7Y9Z1W3Q',  'pending',   DATE_ADD(NOW(), INTERVAL 15 DAY), NULL, NULL, NULL, NOW()),
-- 刘备 的订单
(3, 4, 14, 21, '豪华自助餐', 'privilege', 2000, NULL, 'fulfilled', DATE_ADD(NOW(), INTERVAL 90 DAY), NOW() - INTERVAL 10 DAY, NULL, NULL, NULL, NOW() - INTERVAL 10 DAY, NOW()),
-- 关羽 的订单
(4, 4, 15, 22, '按摩券', 'coupon', 500, 'MassageK4M6N8P2', 'used', DATE_ADD(NOW(), INTERVAL 60 DAY), NOW() - INTERVAL 30 DAY, NOW() - INTERVAL 5 DAY, 'admin', NOW() - INTERVAL 30 DAY, NOW()),
-- 李晓燕 的订单
(5, 1, 2, 2, '视频会员月卡', 'recharge', 300, NULL, 'fulfilled', DATE_ADD(NOW(), INTERVAL 30 DAY), NOW() - INTERVAL 5 DAY, NULL, NULL, NOW() - INTERVAL 5 DAY, NOW()),
-- 周明 的订单
(6, 2, 7, 11, '下午茶券', 'coupon', 180, 'TeaC3D5E7F9G', 'pending', DATE_ADD(NOW(), INTERVAL 14 DAY), NULL, NULL, NULL, NOW())
ON DUPLICATE KEY UPDATE order_status = VALUES(order_status);

-- ============================================================
-- 22. 积分过期配置
-- ============================================================
INSERT INTO point_expiration_config (id, tenant_id, expiration_months, notify_days_before, extension_enabled, extension_months, expired_handling, created_at, updated_at) VALUES
(1, 1, 12, 30, 1, 3, 'forfeit', NOW(), NOW()),
(2, 2, 12, 15, 1, 3, 'forfeit', NOW(), NOW()),
(3, 3,  6,  7, 0, 0, 'forfeit', NOW(), NOW()),
(4, 4, 24, 30, 1, 6, 'donate',  NOW(), NOW()),
(5, 5, 12, 30, 1, 3, 'forfeit', NOW(), NOW())
ON DUPLICATE KEY UPDATE expiration_months = VALUES(expiration_months);

-- ============================================================
-- 23. 积分延期记录
-- ============================================================
INSERT INTO point_extension_records (id, user_id, tenant_id, extended_at, months_extended) VALUES
(1, 1, 1, NOW() - INTERVAL 30 DAY, 3),
(14, 4, 14, NOW() - INTERVAL 60 DAY, 6)
ON DUPLICATE KEY UPDATE months_extended = VALUES(months_extended);

-- ============================================================
-- 24. 徽章定义
-- ============================================================
INSERT INTO badge_definitions (badge_id, name, description, icon, rarity, condition_expr, created_at) VALUES
('first_checkin',    '初次打卡',   '完成第一次打卡',                   NULL, 'common',  'checkin_count >= 1',    NOW()),
('streak_7',        '连续7天',   '连续打卡7天',                      NULL, 'common',  'consecutive_days >= 7',  NOW()),
('streak_30',       '连续30天',  '连续打卡30天',                     NULL, 'rare',    'consecutive_days >= 30', NOW()),
('streak_100',      '百日达人',  '连续打卡100天',                   NULL, 'epic',    'consecutive_days >= 100',NOW()),
('points_1000',     '千积分',    '累计获得1000积分',                NULL, 'common',  'total_points >= 1000',  NOW()),
('points_5000',     '五千积分',  '累计获得5000积分',                NULL, 'rare',    'total_points >= 5000',  NOW()),
('level_3',         'Lv3达人',  '等级达到Lv3',                     NULL, 'common',  'level >= 3',             NOW()),
('level_5',         'Lv5王者',  '等级达到Lv5（最高级）',            NULL, 'epic',    'level >= 5',             NOW()),
('early_bird',      '早起鸟',   '在07:00前完成打卡',                NULL, 'rare',    'checkin_before_7am',     NOW()),
('night_owl',       '夜猫子',   '在21:00后完成打卡',                NULL, 'rare',    'checkin_after_9pm',      NOW()),
('social_star',     '社交之星',  '成功邀请5位同事加入',              NULL, 'rare',    'invited_count >= 5',     NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================================
-- 25. 用户徽章（部分用户已获得徽章）
-- ============================================================
INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES
-- 张三丰 Lv3
(1,  'first_checkin',  NOW() - INTERVAL 30 DAY),
(1,  'streak_7',        NOW() - INTERVAL 20 DAY),
(1,  'streak_30',       NOW() - INTERVAL 5 DAY),
(1,  'points_1000',     NOW() - INTERVAL 10 DAY),
(1,  'level_3',         NOW() - INTERVAL 15 DAY),
(1,  'early_bird',      NOW() - INTERVAL 15 DAY),
-- 李晓燕 Lv2
(2,  'first_checkin',   NOW() - INTERVAL 20 DAY),
(2,  'streak_7',        NOW() - INTERVAL 5 DAY),
(2,  'level_3',         NOW() - INTERVAL 10 DAY),
-- 刘备 Lv4，连续30天
(14, 'first_checkin',   NOW() - INTERVAL 60 DAY),
(14, 'streak_7',        NOW() - INTERVAL 50 DAY),
(14, 'streak_30',       NOW() - INTERVAL 2 DAY),
(14, 'points_1000',     NOW() - INTERVAL 40 DAY),
(14, 'points_5000',    NOW() - INTERVAL 5 DAY),
(14, 'level_3',         NOW() - INTERVAL 30 DAY),
(14, 'level_5',         NOW() - INTERVAL 3 DAY),
(14, 'early_bird',      NOW() - INTERVAL 20 DAY),
(14, 'night_owl',       NOW() - INTERVAL 10 DAY),
-- 关羽 Lv3
(15, 'first_checkin',   NOW() - INTERVAL 30 DAY),
(15, 'streak_7',        NOW() - INTERVAL 10 DAY),
(15, 'level_3',         NOW() - INTERVAL 15 DAY),
-- 诸葛亮 Lv3
(17, 'first_checkin',   NOW() - INTERVAL 20 DAY),
(17, 'streak_7',        NOW() - INTERVAL 5 DAY),
(17, 'level_3',         NOW() - INTERVAL 10 DAY)
ON DUPLICATE KEY UPDATE earned_at = VALUES(earned_at);

-- ============================================================
-- 26. 步行记录（企业4已开通步行产品）
-- ============================================================
INSERT INTO step_daily_records (id, tenant_id, user_id, record_date, step_count, points_awarded, claimed, source, deleted, created_at) VALUES
(1, 4, 14, CURDATE() - INTERVAL 3 DAY, 15000, 50, 1, 'wechat', 0, NOW() - INTERVAL 3 DAY),
(2, 4, 14, CURDATE() - INTERVAL 2 DAY, 18000, 60, 1, 'wechat', 0, NOW() - INTERVAL 2 DAY),
(3, 4, 14, CURDATE() - INTERVAL 1 DAY, 12000, 40, 1, 'healthkit', 0, NOW() - INTERVAL 1 DAY),
(4, 4, 14, CURDATE(),                 20000, 65, 1, 'healthkit', 0, NOW()),
(5, 4, 15, CURDATE() - INTERVAL 2 DAY, 10000, 35, 1, 'wechat', 0, NOW() - INTERVAL 2 DAY),
(6, 4, 15, CURDATE() - INTERVAL 1 DAY, 11000, 38, 1, 'wechat', 0, NOW() - INTERVAL 1 DAY),
(7, 4, 15, CURDATE(),                 13000, 45, 1, 'healthkit', 0, NOW()),
(8, 4, 17, CURDATE() - INTERVAL 1 DAY,  8000, 28, 1, 'healthkit', 0, NOW() - INTERVAL 1 DAY),
(9, 4, 17, CURDATE(),                  9500, 33, 1, 'healthkit', 0, NOW())
ON DUPLICATE KEY UPDATE step_count = VALUES(step_count);

-- ============================================================
-- 27. 排行榜快照
-- ============================================================
INSERT INTO leaderboard_snapshots (tenant_id, snapshot_type, snapshot_date, rank_data, created_at) VALUES
-- 企业1 今日排行榜
(1, 'today', CURDATE(), '[{"rank":1,"userId":1,"nickname":"张三丰","points":96},{"rank":2,"userId":4,"nickname":"陈思思","points":65},{"rank":3,"userId":2,"nickname":"李晓燕","points":41}]', NOW()),
-- 企业1 历史排行榜（周）
(1, 'week', CURDATE(), '[{"rank":1,"userId":1,"nickname":"张三丰","points":680},{"rank":2,"userId":4,"nickname":"陈思思","points":420},{"rank":3,"userId":2,"nickname":"李晓燕","points":310}]', NOW()),
-- 企业1 历史总榜
(1, 'history', CURDATE(), '[{"rank":1,"userId":1,"nickname":"张三丰","points":1280},{"rank":2,"userId":4,"nickname":"陈思思","points":560},{"rank":3,"userId":2,"nickname":"李晓燕","points":680}]', NOW()),
-- 企业4 今日排行榜
(4, 'today', CURDATE(), '[{"rank":1,"userId":14,"nickname":"刘备","points":115},{"rank":2,"userId":15,"nickname":"关羽","points":71},{"rank":3,"userId":17,"nickname":"诸葛亮","points":63}]', NOW()),
-- 企业4 历史总榜
(4, 'history', CURDATE(), '[{"rank":1,"userId":14,"nickname":"刘备","points":2560},{"rank":2,"userId":15,"nickname":"关羽","points":1100},{"rank":3,"userId":17,"nickname":"诸葛亮","points":980}]', NOW()),
-- 企业4 部门榜
(4, 'department', CURDATE(), '[{"rank":1,"deptId":8,"deptName":"前端团队","totalPoints":2560},{"rank":2,"deptId":9,"deptName":"后端团队","totalPoints":1430},{"rank":3,"deptId":10,"deptName":"产品设计部","totalPoints":980}]', NOW())
ON DUPLICATE KEY UPDATE rank_data = VALUES(rank_data);

-- ============================================================
-- 28. 通知模板
-- ============================================================
INSERT INTO notification_templates (type, channel, title_template, content_template, is_preset, created_at, updated_at) VALUES
('level_up',        'in_app', '等级提升通知',     '恭喜！您的等级已从 Lv.{old_level} 提升到 Lv.{new_level}（{level_name}），积分系数调整为 {coefficient}x！',  1, NOW(), NOW()),
('level_down',      'in_app', '等级降级通知',     '您的等级已从 Lv.{old_level} 降为 Lv.{new_level}（{level_name}），积分系数调整为 {coefficient}x。继续加油打卡，重回巅峰！', 1, NOW(), NOW()),
('badge_earned',    'in_app', '徽章获得通知',     '恭喜您获得了新徽章「{badge_name}」！{description}',                                              1, NOW(), NOW()),
('point_expiring',  'in_app', '积分即将过期提醒', '您的 {points} 积分将于 {expire_date} 到期，请尽快使用！',                                         1, NOW(), NOW()),
('point_expired',   'in_app', '积分过期通知',     '您的 {points} 积分已于 {expire_date} 到期，已从账户中扣除。',                                    1, NOW(), NOW()),
('checkin_reminder','in_app', '打卡提醒',        '今日还没打卡哦～快去爬楼梯赚积分吧！',                                                             1, NOW(), NOW()),
('streak_still',    'in_app', '连续打卡提醒',    '您已连续打卡 {days} 天，再坚持 {remaining} 天可获得徽章！',                                        1, NOW(), NOW()),
('exchange_fulfilled','in_app','兑换到账通知',   '您兑换的「{product_name}」已发放，请在有效期内核销使用。',                                      1, NOW(), NOW()),
('exchange_expired','in_app', '兑换券过期通知',  '您兑换的「{product_name}」已过期未使用，积分已返还。',                                           1, NOW(), NOW()),
('level_up_sms',    'sms',    '等级提升短信',     '恭喜！您的碳积分等级已提升至Lv.{new_level}，享{coefficient}x积分系数，继续加油！',              1, NOW(), NOW())
ON DUPLICATE KEY UPDATE title_template = VALUES(title_template);

-- ============================================================
-- 29. 站内消息（部分已读/未读通知）
-- ============================================================
INSERT INTO notifications (id, tenant_id, user_id, type, title, content, reference_type, reference_id, is_read, created_at) VALUES
(1, 1, 1, 'badge_earned',     '徽章获得通知',  '恭喜您获得了新徽章「连续30天」！连续打卡30天，毅力惊人！',         'badge',    'streak_30',    1, NOW() - INTERVAL 5 DAY),
(2, 1, 1, 'level_up',          '等级提升通知',  '恭喜！您的等级已从 Lv.2 提升到 Lv.3（白银），积分系数调整为 1.5x！', 'user',     NULL,          1, NOW() - INTERVAL 10 DAY),
(3, 1, 1, 'point_expiring',    '积分即将过期提醒','您的 200 积分将于 30 天后到期，请尽快兑换商品！',              'points',   NULL,          0, NOW() - INTERVAL 2 DAY),
(4, 4, 14, 'level_up',         '等级提升通知',  '恭喜！您的等级已从 Lv.3 提升到 Lv.4（黄金），积分系数调整为 2.0x！', 'user',     NULL,          1, NOW() - INTERVAL 5 DAY),
(5, 4, 14, 'badge_earned',     '徽章获得通知',  '恭喜您获得了新徽章「Lv5王者」！达到最高等级，荣誉之巅！',       'badge',    'level_5',      0, NOW() - INTERVAL 3 DAY),
(6, 4, 14, 'exchange_fulfilled','兑换到账通知', '您兑换的「豪华自助餐」已发放，请在90天有效期内使用。',         'order',    '3',           0, NOW() - INTERVAL 10 DAY),
(7, 1, 2, 'badge_earned',      '徽章获得通知',  '恭喜您获得了新徽章「连续7天」！继续保持！',                   'badge',    'streak_7',     1, NOW() - INTERVAL 5 DAY),
(8, 2, 7, 'point_expiring',     '积分即将过期提醒','您的 100 积分将于 15 天后到期，请尽快兑换商品！',             'points',   NULL,          0, NOW() - INTERVAL 1 DAY)
ON DUPLICATE KEY UPDATE is_read = VALUES(is_read);

-- ============================================================
-- 30. 租户品牌配置
-- ============================================================
INSERT INTO tenant_branding (tenant_id, logo_url, theme_type, preset_theme, primary_color, secondary_color, created_at, updated_at) VALUES
(1, NULL, 'custom', 'default', '#1890FF', '#52C41A', NOW(), NOW()),
(2, NULL, 'preset', 'blue',    NULL,       NULL,       NOW(), NOW()),
(3, NULL, 'preset', 'purple',  NULL,       NULL,       NOW(), NOW()),
(4, NULL, 'custom', 'default', '#FF6B00', '#722ED1', NOW(), NOW())
ON DUPLICATE KEY UPDATE theme_type = VALUES(theme_type);

-- ============================================================
-- 31. 字典数据
-- ============================================================
INSERT INTO sys_dict (category, label, value, sort_order, status, parent_id, css_class, is_preset, created_at, updated_at) VALUES
('package_type', '免费版',   'free',       1, 'active', NULL, NULL, 1, NOW(), NOW()),
('package_type', '专业版',   'pro',        2, 'active', NULL, NULL, 1, NOW(), NOW()),
('package_type', '旗舰版',   'enterprise', 3, 'active', NULL, NULL, 1, NOW(), NOW()),
('level_mode',   '严格模式', 'strict',     1, 'active', NULL, NULL, 1, NOW(), NOW()),
('level_mode',   '灵活模式', 'flexible',   2, 'active', NULL, NULL, 1, NOW(), NOW()),
('user_status',  '正常',     'active',     1, 'active', NULL, NULL, 1, NOW(), NOW()),
('user_status',  '已禁用',   'disabled',   2, 'active', NULL, NULL, 1, NOW(), NOW()),
('user_status',  '已删除',   'deleted',    3, 'active', NULL, NULL, 1, NOW(), NOW()),
('tenant_status','正常',     'active',     1, 'active', NULL, NULL, 1, NOW(), NOW()),
('tenant_status','已暂停',   'suspended',  2, 'active', NULL, NULL, 1, NOW(), NOW()),
('tenant_status','已到期',   'expired',    3, 'active', NULL, NULL, 1, NOW(), NOW()),
('product_type', '优惠券',   'coupon',     1, 'active', NULL, NULL, 1, NOW(), NOW()),
('product_type', '充值',     'recharge',   2, 'active', NULL, NULL, 1, NOW(), NOW()),
('product_type', '权益',     'privilege',  3, 'active', NULL, NULL, 1, NOW(), NOW()),
('order_status', '待发放',   'pending',    1, 'active', NULL, NULL, 1, NOW(), NOW()),
('order_status', '已发放',   'fulfilled',  2, 'active', NULL, NULL, 1, NOW(), NOW()),
('order_status', '已使用',   'used',       3, 'active', NULL, NULL, 1, NOW(), NOW()),
('order_status', '已过期',   'expired',    4, 'active', NULL, NULL, 1, NOW(), NOW()),
('order_status', '已取消',   'cancelled',  5, 'active', NULL, NULL, 1, NOW(), NOW()),
('badge_rarity', '普通',     'common',     1, 'active', NULL, NULL, 1, NOW(), NOW()),
('badge_rarity', '稀有',     'rare',       2, 'active', NULL, NULL, 1, NOW(), NOW()),
('badge_rarity', '史诗',     'epic',       3, 'active', NULL, NULL, 1, NOW(), NOW()),
('point_type',   '打卡积分', 'check_in',   1, 'active', NULL, NULL, 1, NOW(), NOW()),
('point_type',   '连续奖励', 'streak_bonus', 2, 'active', NULL, NULL, 1, NOW(), NOW()),
('point_type',   '兑换消耗', 'exchange',   3, 'active', NULL, NULL, 1, NOW(), NOW()),
('point_type',   '手动发放', 'manual_add', 4, 'active', NULL, NULL, 1, NOW(), NOW()),
('point_type',   '手动扣减', 'manual_deduct',5,'active', NULL, NULL, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE label = VALUES(label);

-- ============================================================
-- 32. 登录安全日志
-- ============================================================
INSERT INTO login_security_logs (user_type, user_id, username, login_method, result, ip_address, user_agent, device_fingerprint, geo_city, created_at) VALUES
('platform_admin', 1, 'admin',   'password', 'success',     '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'fp_mac_001', '北京', NOW() - INTERVAL 7 DAY),
('user',           1, '13800010001', 'password', 'success', '127.0.0.1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'fp_iphone_002', '上海', NOW() - INTERVAL 5 DAY),
('user',           1, '13800010001', 'password', 'success', '127.0.0.1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'fp_iphone_002', '上海', NOW() - INTERVAL 3 DAY),
('user',           1, '13800010003', 'password', 'wrong_password', '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'fp_mac_003', '广州', NOW() - INTERVAL 2 DAY),
('user',           1, '13800010003', 'password', 'success', '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'fp_mac_003', '广州', NOW() - INTERVAL 2 DAY),
('platform_admin', 2, 'operator','password', 'success',     '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'fp_win_004', '深圳', NOW() - INTERVAL 1 DAY),
('user',          14, '13800040001', 'password', 'success', '127.0.0.1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'fp_iphone_005', '成都', NOW() - INTERVAL 4 DAY),
('user',          14, '13800040001', 'password', 'success', '127.0.0.1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'fp_iphone_005', '成都', NOW() - INTERVAL 1 DAY)
ON DUPLICATE KEY UPDATE result = VALUES(result);

-- ============================================================
-- 33. 审计日志
-- ============================================================
INSERT INTO audit_logs (tenant_id, operator_id, operator_type, action, target_type, target_id, detail, ip_address, created_at) VALUES
(1, 1, 'user', 'CREATE',      'user',     '6',    '{"nickname":"赵雅芝","phone":"13800010006"}',    '127.0.0.1', NOW() - INTERVAL 10 DAY),
(1, 1, 'user', 'UPDATE',      'user',     '5',    '{"status":"disabled"}',                         '127.0.0.1', NOW() - INTERVAL 5 DAY),
(1, 1, 'user', 'CHECK_IN',    'checkin',  '10001','{"points":9}',                                   '127.0.0.1', NOW() - INTERVAL 6 DAY),
(4, 14,'user', 'EXCHANGE',   'order',    '3',    '{"productName":"豪华自助餐","points":2000}',    '127.0.0.1', NOW() - INTERVAL 10 DAY),
(4, 15,'user', 'EXCHANGE',   'order',    '4',    '{"productName":"按摩券","points":500}',         '127.0.0.1', NOW() - INTERVAL 30 DAY),
(NULL, 1, 'platform_admin', 'CREATE_TENANT', 'tenant', '5', '{"tenantName":"云端数据服务公司"}', '127.0.0.1', NOW() - INTERVAL 20 DAY),
(NULL, 1, 'platform_admin', 'UPDATE_PACKAGE', 'tenant', '3', '{"oldPackage":"free","newPackage":"pro"}', '127.0.0.1', NOW() - INTERVAL 15 DAY)
ON DUPLICATE KEY UPDATE action = VALUES(action);

-- ============================================================
-- 34. 平台运营日志
-- ============================================================
INSERT INTO platform_operation_logs (admin_id, admin_name, operation_type, operation_object, ip_address, created_at) VALUES
(1, '平台超级管理员', 'CREATE_TENANT',  '创建租户: 阳光科技有限公司(ID=4)',     '127.0.0.1', NOW() - INTERVAL 30 DAY),
(1, '平台超级管理员', 'UPDATE_ADMIN',   '更新平台管理员: operator',              '127.0.0.1', NOW() - INTERVAL 20 DAY),
(2, '平台运营',      'UPDATE_PACKAGE', '变更租户(3)套餐: free→pro',            '127.0.0.1', NOW() - INTERVAL 15 DAY),
(1, '平台超级管理员', 'CREATE_TENANT', '创建租户: 云端数据服务公司(ID=5)',      '127.0.0.1', NOW() - INTERVAL 10 DAY)
ON DUPLICATE KEY UPDATE operation_type = VALUES(operation_type);

-- ============================================================
-- 35. 租户邀请
-- ============================================================
INSERT INTO tenant_invitations (id, tenant_id, invite_code, max_uses, used_count, expires_at, created_by, created_at) VALUES
(1, 1, 'INV1A2B3C4D5E', NULL, 2, DATE_ADD(NOW(), INTERVAL 30 DAY), 1, NOW() - INTERVAL 10 DAY),
(2, 1, 'INV6F7G8H9I0J', 5,   1, DATE_ADD(NOW(), INTERVAL 7 DAY),  2, NOW() - INTERVAL 3 DAY),
(3, 4, 'INV1K2L3M4N5O', NULL, 0, DATE_ADD(NOW(), INTERVAL 90 DAY), 14, NOW() - INTERVAL 5 DAY)
ON DUPLICATE KEY UPDATE used_count = VALUES(used_count);

-- ============================================================
-- 36. 批量导入记录
-- ============================================================
INSERT INTO batch_imports (id, tenant_id, operator_id, total_count, success_count, fail_count, fail_detail, created_at) VALUES
(1, 1, 1, 50, 48, 2, '[{"row":15,"phone":"1380001XXXX","reason":"手机号格式错误"},{"row":33,"phone":"1380001YYYY","reason":"手机号已存在"}]', NOW() - INTERVAL 15 DAY),
(2, 4, 14, 100, 99, 1, '[{"row":5,"phone":"1380004ZZZ","reason":"手机号已被其他企业使用"}]', NOW() - INTERVAL 7 DAY)
ON DUPLICATE KEY UPDATE success_count = VALUES(success_count);

-- ============================================================
-- 37. 套餐变更日志
-- ============================================================
INSERT INTO package_change_logs (id, tenant_id, old_package_id, new_package_id, operator_id, operator_type, reason, created_at) VALUES
(1, 3, 1, 2, 1, 'platform_admin', '用户反馈，免费版功能不足，升级至专业版', NOW() - INTERVAL 15 DAY)
ON DUPLICATE KEY UPDATE old_package_id = VALUES(old_package_id);

-- ============================================================
-- 38. 平台配置
-- ============================================================
INSERT INTO platform_configs (config_key, config_value, description, created_at, updated_at) VALUES
('default_point_rules_template', '{"time_slots":[{"name":"早高峰","start":"07:00","end":"09:00","min":5,"max":8}],"daily_cap":50}', '新建租户默认积分规则模板', NOW(), NOW()),
('feature_flags', '{"new_honor_system":true,"walking_product":true,"sms_notification":false}', '功能开关', NOW(), NOW()),
('platform_name', '碳点科技', '平台名称', NOW(), NOW()),
('platform_logo', NULL, '平台Logo', NOW(), NOW())
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- ============================================================
-- 完成验证
-- ============================================================
SELECT '=== 数据统计 ===' AS msg;
SELECT 'tenants'          AS tbl, COUNT(*) AS cnt FROM tenants          UNION ALL
SELECT 'users',           COUNT(*) FROM users           UNION ALL
SELECT 'roles',           COUNT(*) FROM roles           UNION ALL
SELECT 'user_roles',      COUNT(*) FROM user_roles      UNION ALL
SELECT 'point_rules',     COUNT(*) FROM point_rules     UNION ALL
SELECT 'time_slot_rules', COUNT(*) FROM time_slot_rules  UNION ALL
SELECT 'check_in_records',COUNT(*) FROM check_in_records UNION ALL
SELECT 'point_transactions', COUNT(*) FROM point_transactions UNION ALL
SELECT 'products',        COUNT(*) FROM products        UNION ALL
SELECT 'exchange_orders', COUNT(*) FROM exchange_orders UNION ALL
SELECT 'departments',     COUNT(*) FROM departments     UNION ALL
SELECT 'user_badges',     COUNT(*) FROM user_badges     UNION ALL
SELECT 'notifications',   COUNT(*) FROM notifications   UNION ALL
SELECT 'leaderboard_snapshots', COUNT(*) FROM leaderboard_snapshots;

-- ============================================================
-- 测试账号速查
-- ============================================================
SELECT '=== 登录账号 ===' AS msg;
SELECT tenant_id, phone, nickname, role_name
FROM (
  SELECT u.tenant_id, u.phone, u.nickname, r.name AS role_name,
         ROW_NUMBER() OVER (PARTITION BY u.tenant_id ORDER BY u.id) AS rn
  FROM users u JOIN user_roles ur ON u.id = ur.user_id
               JOIN roles r ON ur.role_id = r.id
  WHERE u.status = 'active'
) t WHERE rn = 1;

SET FOREIGN_KEY_CHECKS = 1;

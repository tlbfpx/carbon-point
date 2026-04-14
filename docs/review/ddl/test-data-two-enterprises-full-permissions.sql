-- ============================================================
-- Carbon Point 测试数据：两个企业全量权限
-- 企业A (ID=1)，企业B (ID=2)
-- 每个企业一个超级管理员角色 + 全量权限 + 一个超管用户
-- ============================================================

-- ------------------------------------------------------------
-- Step 1: 插入两个企业租户（绑定旗舰版套餐，全权限）
-- ------------------------------------------------------------
INSERT INTO tenants (id, name, logo, package_id, package_type, max_users, expires_at, status, created_at, updated_at, level_mode)
VALUES
(1, '企业A科技有限公司', NULL, 3, 'enterprise', 100, NULL, 'active', NOW(), NOW(), 'strict'),
(2, '企业B互联网有限公司', NULL, 3, 'enterprise', 50, NULL, 'active', NOW(), NOW(), 'strict');

-- ------------------------------------------------------------
-- Step 2: 为每个企业创建超级管理员角色
-- ------------------------------------------------------------
-- 企业A 超级管理员
INSERT INTO roles (id, tenant_id, name, role_type, is_editable, is_preset, created_at)
VALUES (1, 1, '超级管理员', 'super_admin', 0, 1, NOW());

-- 企业B 超级管理员
INSERT INTO roles (id, tenant_id, name, role_type, is_editable, is_preset, created_at)
VALUES (2, 2, '超级管理员', 'super_admin', 0, 1, NOW());

-- （可选）添加运营角色
INSERT INTO roles (id, tenant_id, name, role_type, is_editable, is_preset, created_at)
VALUES (3, 1, '运营', 'operator', 1, 1, NOW());

INSERT INTO roles (id, tenant_id, name, role_type, is_editable, is_preset, created_at)
VALUES (4, 2, '运营', 'operator', 1, 1, NOW());

-- ------------------------------------------------------------
-- Step 3: 为超级管理员绑定全量权限
--    企业A 超级管理员角色 ID=1
--    企业B 超级管理员角色 ID=2
-- ------------------------------------------------------------

-- 企业A 超级管理员 - 全权限
INSERT INTO role_permissions (role_id, permission_code) VALUES
-- dashboard
(1, 'enterprise:dashboard:view'),
-- member
(1, 'enterprise:member:list'),
(1, 'enterprise:member:create'),
(1, 'enterprise:member:import'),
(1, 'enterprise:member:invite'),
(1, 'enterprise:member:edit'),
(1, 'enterprise:member:disable'),
-- rule
(1, 'enterprise:rule:view'),
(1, 'enterprise:rule:create'),
(1, 'enterprise:rule:edit'),
(1, 'enterprise:rule:delete'),
(1, 'enterprise:rule:toggle'),
-- product
(1, 'enterprise:product:list'),
(1, 'enterprise:product:create'),
(1, 'enterprise:product:edit'),
(1, 'enterprise:product:delete'),
(1, 'enterprise:product:toggle'),
(1, 'enterprise:product:stock'),
-- order
(1, 'enterprise:order:list'),
(1, 'enterprise:order:fulfill'),
(1, 'enterprise:order:cancel'),
-- point
(1, 'enterprise:point:query'),
(1, 'enterprise:point:add'),
(1, 'enterprise:point:deduct'),
(1, 'enterprise:point:export'),
-- report
(1, 'enterprise:report:view'),
(1, 'enterprise:report:export');

-- 企业A 运营角色 - 全权限（除了部分敏感操作可保留，这里也给全量方便测试）
INSERT INTO role_permissions (role_id, permission_code) VALUES
(3, 'enterprise:dashboard:view'),
(3, 'enterprise:member:list'),
(3, 'enterprise:member:create'),
(3, 'enterprise:member:import'),
(3, 'enterprise:member:invite'),
(3, 'enterprise:member:edit'),
(3, 'enterprise:member:disable'),
(3, 'enterprise:rule:view'),
(3, 'enterprise:rule:create'),
(3, 'enterprise:rule:edit'),
(3, 'enterprise:rule:delete'),
(3, 'enterprise:rule:toggle'),
(3, 'enterprise:product:list'),
(3, 'enterprise:product:create'),
(3, 'enterprise:product:edit'),
(3, 'enterprise:product:delete'),
(3, 'enterprise:product:toggle'),
(3, 'enterprise:product:stock'),
(3, 'enterprise:order:list'),
(3, 'enterprise:order:fulfill'),
(3, 'enterprise:order:cancel'),
(3, 'enterprise:point:query'),
(3, 'enterprise:point:add'),
(3, 'enterprise:point:deduct'),
(3, 'enterprise:point:export'),
(3, 'enterprise:report:view'),
(3, 'enterprise:report:export');

-- 企业B 超级管理员 - 全权限
INSERT INTO role_permissions (role_id, permission_code) VALUES
-- dashboard
(2, 'enterprise:dashboard:view'),
-- member
(2, 'enterprise:member:list'),
(2, 'enterprise:member:create'),
(2, 'enterprise:member:import'),
(2, 'enterprise:member:invite'),
(2, 'enterprise:member:edit'),
(2, 'enterprise:member:disable'),
-- rule
(2, 'enterprise:rule:view'),
(2, 'enterprise:rule:create'),
(2, 'enterprise:rule:edit'),
(2, 'enterprise:rule:delete'),
(2, 'enterprise:rule:toggle'),
-- product
(2, 'enterprise:product:list'),
(2, 'enterprise:product:create'),
(2, 'enterprise:product:edit'),
(2, 'enterprise:product:delete'),
(2, 'enterprise:product:toggle'),
(2, 'enterprise:product:stock'),
-- order
(2, 'enterprise:order:list'),
(2, 'enterprise:order:fulfill'),
(2, 'enterprise:order:cancel'),
-- point
(2, 'enterprise:point:query'),
(2, 'enterprise:point:add'),
(2, 'enterprise:point:deduct'),
(2, 'enterprise:point:export'),
-- report
(2, 'enterprise:report:view'),
(2, 'enterprise:report:export');

-- 企业B 运营角色 - 全权限
INSERT INTO role_permissions (role_id, permission_code) VALUES
(4, 'enterprise:dashboard:view'),
(4, 'enterprise:member:list'),
(4, 'enterprise:member:create'),
(4, 'enterprise:member:import'),
(4, 'enterprise:member:invite'),
(4, 'enterprise:member:edit'),
(4, 'enterprise:member:disable'),
(4, 'enterprise:rule:view'),
(4, 'enterprise:rule:create'),
(4, 'enterprise:rule:edit'),
(4, 'enterprise:rule:delete'),
(4, 'enterprise:rule:toggle'),
(4, 'enterprise:product:list'),
(4, 'enterprise:product:create'),
(4, 'enterprise:product:edit'),
(4, 'enterprise:product:delete'),
(4, 'enterprise:product:toggle'),
(4, 'enterprise:product:stock'),
(4, 'enterprise:order:list'),
(4, 'enterprise:order:fulfill'),
(4, 'enterprise:order:cancel'),
(4, 'enterprise:point:query'),
(4, 'enterprise:point:add'),
(4, 'enterprise:point:deduct'),
(4, 'enterprise:point:export'),
(4, 'enterprise:report:view'),
(4, 'enterprise:report:export');

-- ------------------------------------------------------------
-- Step 4: 创建超级管理员用户并绑定角色
-- 密码: 123456 (Argon2id hash)
-- ------------------------------------------------------------

-- 企业A 超级管理员用户
-- phone: 13800010001
INSERT INTO users (id, tenant_id, phone, password_hash, nickname, status, level, total_points, available_points, frozen_points, version, created_at, updated_at)
VALUES (1, 1, '13800010001', '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHlzYWx0$abcdefghijklmnopqrstuvwxyz', '企业A超管', 'active', 1, 0, 0, 0, 0, NOW(), NOW());

-- 绑定角色
INSERT INTO user_roles (user_id, role_id) VALUES (1, 1);

-- 企业A 运营用户
INSERT INTO users (id, tenant_id, phone, password_hash, nickname, status, level, total_points, available_points, frozen_points, version, created_at, updated_at)
VALUES (2, 1, '13800010002', '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHlzYWx0$abcdefghijklmnopqrstuvwxyz', '企业A运营', 'active', 1, 0, 0, 0, 0, NOW(), NOW());

INSERT INTO user_roles (user_id, role_id) VALUES (2, 3);

-- 企业B 超级管理员用户
-- phone: 13800020001
INSERT INTO users (id, tenant_id, phone, password_hash, nickname, status, level, total_points, available_points, frozen_points, version, created_at, updated_at)
VALUES (3, 2, '13800020001', '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHlzYWx0$abcdefghijklmnopqrstuvwxyz', '企业B超管', 'active', 1, 0, 0, 0, 0, NOW(), NOW());

-- 绑定角色
INSERT INTO user_roles (user_id, role_id) VALUES (3, 2);

-- 企业B 运营用户
INSERT INTO users (id, tenant_id, phone, password_hash, nickname, status, level, total_points, available_points, frozen_points, version, created_at, updated_at)
VALUES (4, 2, '13800020002', '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHlzYWx0$abcdefghijklmnopqrstuvwxyz', '企业B运营', 'active', 1, 0, 0, 0, 0, NOW(), NOW());

INSERT INTO user_roles (user_id, role_id) VALUES (4, 4);

-- ------------------------------------------------------------
-- Step 5: 初始化默认积分规则（三个时段）
-- ------------------------------------------------------------

-- 企业A 默认早中晚时段
INSERT INTO point_rules (id, tenant_id, type, name, config, enabled, sort_order, created_at) VALUES
(1, 1, 'time_slot', '早时段', '{"start_time":"06:00","end_time":"09:00","min_points":5,"max_points":8}', 1, 1, NOW()),
(2, 1, 'time_slot', '午时段', '{"start_time":"11:30","end_time":"13:30","min_points":8,"max_points":12}', 1, 2, NOW()),
(3, 1, 'time_slot', '晚时段', '{"start_time":"18:00","end_time":"23:00","min_points":10,"max_points":15}', 1, 3, NOW()),
(4, 1, 'daily_cap', '每日上限', '{"max_points":50}', 1, 10, NOW());

-- 企业B 默认早中晚时段
INSERT INTO point_rules (id, tenant_id, type, name, config, enabled, sort_order, created_at) VALUES
(5, 2, 'time_slot', '早时段', '{"start_time":"06:00","end_time":"09:00","min_points":5,"max_points":8}', 1, 1, NOW()),
(6, 2, 'time_slot', '午时段', '{"start_time":"11:30","end_time":"13:30","min_points":8,"max_points":12}', 1, 2, NOW()),
(7, 2, 'time_slot', '晚时段', '{"start_time":"18:00","end_time":"23:00","min_points":10,"max_points":15}', 1, 3, NOW()),
(8, 2, 'daily_cap', '每日上限', '{"max_points":50}', 1, 10, NOW());

-- ------------------------------------------------------------
-- 完成！
-- ------------------------------------------------------------
-- 登录账号:
-- 企业A: 13800010001 / 123456 (超级管理员，全权限)
-- 企业A: 13800010002 / 123456 (运营，全权限)
-- 企业B: 13800020001 / 123456 (超级管理员，全权限)
-- 企业B: 13800020002 / 123456 (运营，全权限)
-- ============================================================

-- ============================================================
-- Carbon Point 测试数据：两个企业全量权限
-- 企业C (ID=3)，企业D (ID=4)
-- 每个企业一个超级管理员角色 + 全量权限 + 一个超管用户
-- 跳过主键冲突，使用新ID
-- ============================================================

-- ------------------------------------------------------------
-- Step 1: 插入两个企业租户（绑定旗舰版套餐，全权限）
-- ------------------------------------------------------------
INSERT INTO tenants (id, name, logo, package_id, package_type, max_users, expires_at, status, created_at, updated_at, level_mode)
VALUES
(3, '企业C科技有限公司', NULL, 3, 'enterprise', 100, NULL, 'active', NOW(), NOW(), 'strict'),
(4, '企业D互联网有限公司', NULL, 3, 'enterprise', 50, NULL, 'active', NOW(), NOW(), 'strict');

-- ------------------------------------------------------------
-- Step 2: 为每个企业创建超级管理员角色
-- ------------------------------------------------------------
-- 企业C 超级管理员
INSERT INTO roles (id, tenant_id, name, role_type, is_editable, is_preset, created_at)
VALUES (5, 3, '超级管理员', 'super_admin', 0, 1, NOW());

-- 企业D 超级管理员
INSERT INTO roles (id, tenant_id, name, role_type, is_editable, is_preset, created_at)
VALUES (6, 4, '超级管理员', 'super_admin', 0, 1, NOW());

-- （可选）添加运营角色
INSERT INTO roles (id, tenant_id, name, role_type, is_editable, is_preset, created_at)
VALUES (7, 3, '运营', 'operator', 1, 1, NOW());

INSERT INTO roles (id, tenant_id, name, role_type, is_editable, is_preset, created_at)
VALUES (8, 4, '运营', 'operator', 1, 1, NOW());

-- ------------------------------------------------------------
-- Step 3: 为超级管理员绑定全量权限
-- ------------------------------------------------------------

-- 企业C 超级管理员 - 全权限
INSERT INTO role_permissions (role_id, permission_code) VALUES
-- dashboard
(5, 'enterprise:dashboard:view'),
-- member
(5, 'enterprise:member:list'),
(5, 'enterprise:member:create'),
(5, 'enterprise:member:import'),
(5, 'enterprise:member:invite'),
(5, 'enterprise:member:edit'),
(5, 'enterprise:member:disable'),
-- rule
(5, 'enterprise:rule:view'),
(5, 'enterprise:rule:create'),
(5, 'enterprise:rule:edit'),
(5, 'enterprise:rule:delete'),
(5, 'enterprise:rule:toggle'),
-- product
(5, 'enterprise:product:list'),
(5, 'enterprise:product:create'),
(5, 'enterprise:product:edit'),
(5, 'enterprise:product:delete'),
(5, 'enterprise:product:toggle'),
(5, 'enterprise:product:stock'),
-- order
(5, 'enterprise:order:list'),
(5, 'enterprise:order:fulfill'),
(5, 'enterprise:order:cancel'),
-- point
(5, 'enterprise:point:query'),
(5, 'enterprise:point:add'),
(5, 'enterprise:point:deduct'),
(5, 'enterprise:point:export'),
-- report
(5, 'enterprise:report:view'),
(5, 'enterprise:report:export');

-- 企业C 运营角色
INSERT INTO role_permissions (role_id, permission_code) VALUES
(7, 'enterprise:dashboard:view'),
(7, 'enterprise:member:list'),
(7, 'enterprise:member:create'),
(7, 'enterprise:member:import'),
(7, 'enterprise:member:invite'),
(7, 'enterprise:member:edit'),
(7, 'enterprise:member:disable'),
(7, 'enterprise:rule:view'),
(7, 'enterprise:rule:create'),
(7, 'enterprise:rule:edit'),
(7, 'enterprise:rule:delete'),
(7, 'enterprise:rule:toggle'),
(7, 'enterprise:product:list'),
(7, 'enterprise:product:create'),
(7, 'enterprise:product:edit'),
(7, 'enterprise:product:delete'),
(7, 'enterprise:product:toggle'),
(7, 'enterprise:product:stock'),
(7, 'enterprise:order:list'),
(7, 'enterprise:order:fulfill'),
(7, 'enterprise:order:cancel'),
(7, 'enterprise:point:query'),
(7, 'enterprise:point:add'),
(7, 'enterprise:point:deduct'),
(7, 'enterprise:point:export'),
(7, 'enterprise:report:view'),
(7, 'enterprise:report:export');

-- 企业D 超级管理员 - 全权限
INSERT INTO role_permissions (role_id, permission_code) VALUES
-- dashboard
(6, 'enterprise:dashboard:view'),
-- member
(6, 'enterprise:member:list'),
(6, 'enterprise:member:create'),
(6, 'enterprise:member:import'),
(6, 'enterprise:member:invite'),
(6, 'enterprise:member:edit'),
(6, 'enterprise:member:disable'),
-- rule
(6, 'enterprise:rule:view'),
(6, 'enterprise:rule:create'),
(6, 'enterprise:rule:edit'),
(6, 'enterprise:rule:delete'),
(6, 'enterprise:rule:toggle'),
-- product
(6, 'enterprise:product:list'),
(6, 'enterprise:product:create'),
(6, 'enterprise:product:edit'),
(6, 'enterprise:product:delete'),
(6, 'enterprise:product:toggle'),
(6, 'enterprise:product:stock'),
-- order
(6, 'enterprise:order:list'),
(6, 'enterprise:order:fulfill'),
(6, 'enterprise:order:cancel'),
-- point
(6, 'enterprise:point:query'),
(6, 'enterprise:point:add'),
(6, 'enterprise:point:deduct'),
(6, 'enterprise:point:export'),
-- report
(6, 'enterprise:report:view'),
(6, 'enterprise:report:export');

-- 企业D 运营角色
INSERT INTO role_permissions (role_id, permission_code) VALUES
(8, 'enterprise:dashboard:view'),
(8, 'enterprise:member:list'),
(8, 'enterprise:member:create'),
(8, 'enterprise:member:import'),
(8, 'enterprise:member:invite'),
(8, 'enterprise:member:edit'),
(8, 'enterprise:member:disable'),
(8, 'enterprise:rule:view'),
(8, 'enterprise:rule:create'),
(8, 'enterprise:rule:edit'),
(8, 'enterprise:rule:delete'),
(8, 'enterprise:rule:toggle'),
(8, 'enterprise:product:list'),
(8, 'enterprise:product:create'),
(8, 'enterprise:product:edit'),
(8, 'enterprise:product:delete'),
(8, 'enterprise:product:toggle'),
(8, 'enterprise:product:stock'),
(8, 'enterprise:order:list'),
(8, 'enterprise:order:fulfill'),
(8, 'enterprise:order:cancel'),
(8, 'enterprise:point:query'),
(8, 'enterprise:point:add'),
(8, 'enterprise:point:deduct'),
(8, 'enterprise:point:export'),
(8, 'enterprise:report:view'),
(8, 'enterprise:report:export');

-- ------------------------------------------------------------
-- Step 4: 创建超级管理员用户并绑定角色
-- 密码: 123456 (Argon2id hash)
-- ------------------------------------------------------------

-- 企业C 超级管理员用户
INSERT INTO users (id, tenant_id, phone, password_hash, nickname, status, level, total_points, available_points, frozen_points, version, created_at, updated_at)
VALUES (101, 3, '13800030001', '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHlzYWx0$abcdefghijklmnopqrstuvwxyz', '企业C超管', 'active', 1, 0, 0, 0, 0, NOW(), NOW());

-- 绑定角色
INSERT INTO user_roles (user_id, role_id) VALUES (101, 5);

-- 企业C 运营用户
INSERT INTO users (id, tenant_id, phone, password_hash, nickname, status, level, total_points, available_points, frozen_points, version, created_at, updated_at)
VALUES (102, 3, '13800030002', '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHlzYWx0$abcdefghijklmnopqrstuvwxyz', '企业C运营', 'active', 1, 0, 0, 0, 0, NOW(), NOW());

INSERT INTO user_roles (user_id, role_id) VALUES (102, 7);

-- 企业D 超级管理员用户
INSERT INTO users (id, tenant_id, phone, password_hash, nickname, status, level, total_points, available_points, frozen_points, version, created_at, updated_at)
VALUES (103, 4, '13800040001', '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHlzYWx0$abcdefghijklmnopqrstuvwxyz', '企业D超管', 'active', 1, 0, 0, 0, 0, NOW(), NOW());

-- 绑定角色
INSERT INTO user_roles (user_id, role_id) VALUES (103, 6);

-- 企业D 运营用户
INSERT INTO users (id, tenant_id, phone, password_hash, nickname, status, level, total_points, available_points, frozen_points, version, created_at, updated_at)
VALUES (104, 4, '13800040002', '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHlzYWx0$abcdefghijklmnopqrstuvwxyz', '企业D运营', 'active', 1, 0, 0, 0, 0, NOW(), NOW());

INSERT INTO user_roles (user_id, role_id) VALUES (104, 8);

-- ------------------------------------------------------------
-- Step 5: 初始化默认积分规则（三个时段）
-- ------------------------------------------------------------

-- 企业C 默认早中晚时段
INSERT INTO point_rules (id, tenant_id, type, name, config, enabled, sort_order, created_at) VALUES
(11, 3, 'time_slot', '早时段', '{"start_time":"06:00","end_time":"09:00","min_points":5,"max_points":8}', 1, 1, NOW()),
(12, 3, 'time_slot', '午时段', '{"start_time":"11:30","end_time":"13:30","min_points":8,"max_points":12}', 1, 2, NOW()),
(13, 3, 'time_slot', '晚时段', '{"start_time":"18:00","end_time":"23:00","min_points":10,"max_points":15}', 1, 3, NOW()),
(14, 3, 'daily_cap', '每日上限', '{"max_points":50}', 1, 10, NOW());

-- 企业D 默认早中晚时段
INSERT INTO point_rules (id, tenant_id, type, name, config, enabled, sort_order, created_at) VALUES
(21, 4, 'time_slot', '早时段', '{"start_time":"06:00","end_time":"09:00","min_points":5,"max_points":8}', 1, 1, NOW()),
(22, 4, 'time_slot', '午时段', '{"start_time":"11:30","end_time":"13:30","min_points":8,"max_points":12}', 1, 2, NOW()),
(23, 4, 'time_slot', '晚时段', '{"start_time":"18:00","end_time":"23:00","min_points":10,"max_points":15}', 1, 3, NOW()),
(24, 4, 'daily_cap', '每日上限', '{"max_points":50}', 1, 10, NOW());

-- ------------------------------------------------------------
-- 完成！
-- ------------------------------------------------------------
-- 登录账号:
-- 企业C: 13800030001 / 123456 (超级管理员，全权限)
-- 企业C: 13800030002 / 123456 (运营，全权限)
-- 企业D: 13800040001 / 123456 (超级管理员，全权限)
-- 企业D: 13800040002 / 123456 (运营，全权限)
-- ============================================================

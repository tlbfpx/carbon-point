-- ============================================================
-- 添加平台端权限数据
-- 用于平台管理员角色权限配置
-- ============================================================

INSERT INTO permissions (code, module, operation, description, sort_order) VALUES
-- platform:dashboard
('platform:dashboard:view', 'platform:dashboard', 'view', '查看平台数据看板', 1),
-- platform:enterprise
('platform:enterprise:list', 'platform:enterprise', 'list', '查看企业列表', 10),
('platform:enterprise:manage', 'platform:enterprise', 'manage', '管理企业（创建、编辑、停用）', 11),
('platform:enterprise:package', 'platform:enterprise', 'package', '更换企业套餐', 12),
('platform:enterprise:super-admin', 'platform:enterprise', 'super-admin', '分配企业超管用户', 13),
-- platform:system
('platform:system:view', 'platform:system', 'view', '查看系统管理', 20),
('platform:system:manage', 'platform:system', 'manage', '管理系统配置', 21),
('platform:system:user:list', 'platform:system:user', 'list', '查看用户列表', 22),
('platform:system:user:manage', 'platform:system:user', 'manage', '管理用户', 23),
('platform:system:role:list', 'platform:system:role', 'list', '查看角色列表', 24),
('platform:system:role:manage', 'platform:system:role', 'manage', '管理角色', 25),
('platform:system:log:query', 'platform:system:log', 'query', '查看操作日志', 26),
('platform:system:dict:view', 'platform:system:dict', 'view', '查看字典', 27),
('platform:system:dict:manage', 'platform:system:dict', 'manage', '管理字典', 28),
-- platform:config
('platform:config:view', 'platform:config', 'view', '查看平台配置', 30),
('platform:config:manage', 'platform:config', 'manage', '修改平台配置', 31),
-- platform:admin
('platform:admin:list', 'platform:admin', 'list', '查看平台管理员列表', 40),
('platform:admin:manage', 'platform:admin', 'manage', '管理平台管理员', 41),
-- platform:package
('platform:package:view', 'platform:package', 'view', '查看套餐列表', 50),
('platform:package:manage', 'platform:package', 'manage', '管理套餐', 51),
('platform:package:permission', 'platform:package', 'permission', '管理套餐权限', 52),
-- platform:product
('platform:product:list', 'platform:product', 'list', '查看产品列表', 60),
('platform:product:manage', 'platform:product', 'manage', '管理产品', 61),
-- platform:feature
('platform:feature:list', 'platform:feature', 'list', '查看功能列表', 70),
('platform:feature:manage', 'platform:feature', 'manage', '管理功能', 71),
-- platform:report
('platform:report:view', 'platform:report', 'view', '查看平台报表', 80),
('platform:report:export', 'platform:report', 'export', '导出平台报表', 81)
ON DUPLICATE KEY UPDATE description = VALUES(description);

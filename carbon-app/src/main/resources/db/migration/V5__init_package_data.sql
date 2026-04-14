-- ============================================================
-- Flyway V5: Initialize Package Data
-- ============================================================

-- Insert free package (if not exists)
INSERT INTO permission_packages (code, name, description, max_users, status)
SELECT 'free', '免费版', '基础套餐，包含核心打卡功能', 20, 1
WHERE NOT EXISTS (SELECT 1 FROM permission_packages WHERE code = 'free');

INSERT INTO package_permissions (package_id, permission_code)
SELECT id, 'enterprise:dashboard:view' FROM permission_packages WHERE code = 'free'
ON DUPLICATE KEY UPDATE package_id = package_id;

-- Insert pro package (if not exists)
INSERT INTO permission_packages (code, name, description, max_users, status)
SELECT 'pro', '专业版', '专业版套餐，包含完整企业管理和数据报表', 100, 1
WHERE NOT EXISTS (SELECT 1 FROM permission_packages WHERE code = 'pro');

INSERT INTO package_permissions (package_id, permission_code)
SELECT id, code FROM permission_packages pp CROSS JOIN permissions p
WHERE pp.code = 'pro' AND p.code IN (
    'enterprise:dashboard:view',
    'enterprise:member:list', 'enterprise:member:create', 'enterprise:member:import',
    'enterprise:member:invite', 'enterprise:member:edit', 'enterprise:member:disable',
    'enterprise:rule:view', 'enterprise:rule:create', 'enterprise:rule:edit',
    'enterprise:rule:delete', 'enterprise:rule:toggle',
    'enterprise:product:list', 'enterprise:product:create', 'enterprise:product:edit',
    'enterprise:product:delete', 'enterprise:product:toggle', 'enterprise:product:stock',
    'enterprise:order:list', 'enterprise:order:fulfill', 'enterprise:order:cancel'
)
ON DUPLICATE KEY UPDATE package_id = package_id;

-- Insert enterprise package (if not exists)
INSERT INTO permission_packages (code, name, description, max_users, status)
SELECT 'enterprise', '旗舰版', '全功能旗舰版，无限制使用所有功能', 500, 1
WHERE NOT EXISTS (SELECT 1 FROM permission_packages WHERE code = 'enterprise');

INSERT INTO package_permissions (package_id, permission_code)
SELECT id, code FROM permission_packages pp CROSS JOIN permissions p
WHERE pp.code = 'enterprise'
ON DUPLICATE KEY UPDATE package_id = package_id;

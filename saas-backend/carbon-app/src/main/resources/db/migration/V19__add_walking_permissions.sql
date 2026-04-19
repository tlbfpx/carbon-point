-- ============================================================
-- V19: Add walking/stair-climbing permissions to seed data
-- ============================================================

-- Insert new product-specific permissions
INSERT IGNORE INTO permissions (code, module, operation, description, sort_order) VALUES
('enterprise:walking:view', 'enterprise:walking', 'view', '查看走路积分', 70),
('enterprise:walking:config', 'enterprise:walking', 'config', '配置走路积分', 71),
('enterprise:stair-climbing:view', 'enterprise:stair-climbing', 'view', '查看爬楼积分', 72),
('enterprise:stair-climbing:config', 'enterprise:stair-climbing', 'config', '配置爬楼积分', 73);

-- Add these new permissions to the pro package
INSERT INTO package_permissions (package_id, permission_code)
SELECT pp.id, p.code FROM permission_packages pp
CROSS JOIN permissions p
WHERE pp.code = 'pro' AND p.code IN (
    'enterprise:walking:view',
    'enterprise:walking:config',
    'enterprise:stair-climbing:view',
    'enterprise:stair-climbing:config'
)
ON DUPLICATE KEY UPDATE package_id = package_id;

-- Add these new permissions to the enterprise package (gets all permissions)
INSERT INTO package_permissions (package_id, permission_code)
SELECT pp.id, p.code FROM permission_packages pp
CROSS JOIN permissions p
WHERE pp.code = 'enterprise' AND p.code IN (
    'enterprise:walking:view',
    'enterprise:walking:config',
    'enterprise:stair-climbing:view',
    'enterprise:stair-climbing:config'
)
ON DUPLICATE KEY UPDATE package_id = package_id;

-- Add view-only permissions to the free package
INSERT INTO package_permissions (package_id, permission_code)
SELECT pp.id, p.code FROM permission_packages pp
CROSS JOIN permissions p
WHERE pp.code = 'free' AND p.code IN (
    'enterprise:walking:view',
    'enterprise:stair-climbing:view'
)
ON DUPLICATE KEY UPDATE package_id = package_id;

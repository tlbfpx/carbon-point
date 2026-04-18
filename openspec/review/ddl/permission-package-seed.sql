-- ============================================================
-- Carbon Point 权限套餐种子数据
-- 对应: docs/superpowers/specs/2026-04-12-enterprise-role-permission-design.md §3.2
-- 日期: 2026-04-12
-- 说明: 基于现有 permissions 表数据，创建三个默认套餐及其权限绑定
-- ============================================================

-- --------------------------------------------------
-- 套餐1: 免费版（free）
-- 包含: 仅数据看板查看权限
-- --------------------------------------------------
INSERT INTO permission_packages (code, name, description, status)
VALUES ('free', '免费版', '基础套餐，仅包含数据看板查看权限', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), status = 1;

INSERT INTO package_permissions (package_id, permission_code)
SELECT LAST_INSERT_ID(), code FROM permissions WHERE code = 'enterprise:dashboard:view'
ON DUPLICATE KEY UPDATE package_id = package_id;

-- --------------------------------------------------
-- 套餐2: 专业版（pro）
-- 包含: 标准版（dashboard + member + rule）+ product + order
-- --------------------------------------------------
INSERT INTO permission_packages (code, name, description, status)
VALUES ('pro', '专业版', '在标准版基础上增加商品管理和订单核销权限', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), status = 1;

INSERT INTO package_permissions (package_id, permission_code)
SELECT LAST_INSERT_ID(), code FROM permissions
WHERE module IN (
    'enterprise:dashboard',
    'enterprise:member',
    'enterprise:rule',
    'enterprise:product',
    'enterprise:order'
)
ON DUPLICATE KEY UPDATE package_id = package_id;

-- --------------------------------------------------
-- 套餐3: 旗舰版（enterprise）
-- 包含: 全部权限
-- --------------------------------------------------
INSERT INTO permission_packages (code, name, description, status)
VALUES ('enterprise', '旗舰版', '全功能套餐，包含所有企业端权限', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), status = 1;

INSERT INTO package_permissions (package_id, permission_code)
SELECT LAST_INSERT_ID(), code FROM permissions
ON DUPLICATE KEY UPDATE package_id = package_id;

-- --------------------------------------------------
-- 验证: 各套餐权限数量
-- --------------------------------------------------
SELECT
    pp.code      AS package_code,
    pp.name      AS package_name,
    COUNT(ppkg.permission_code) AS permission_count
FROM permission_packages pp
LEFT JOIN package_permissions ppkg ON ppkg.package_id = pp.id
GROUP BY pp.id, pp.code, pp.name
ORDER BY pp.id;

-- 预期结果:
-- | package_code | package_name | permission_count |
-- |-------------|-------------|-----------------|
-- | free        | 免费版       | 1               |
-- | pro         | 专业版       | 17              |
-- | enterprise  | 旗舰版       | 26              |

-- ============================================================
-- Carbon Point 企业角色权限套餐扩展 Schema
-- 对应: docs/superpowers/specs/2026-04-12-enterprise-role-permission-design.md
-- 日期: 2026-04-12
-- ============================================================

-- ============================================================
-- 新增表: permission_packages
-- ============================================================
CREATE TABLE permission_packages (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    code            VARCHAR(50) NOT NULL UNIQUE COMMENT '套餐编码',
    name            VARCHAR(100) NOT NULL COMMENT '套餐名称',
    description     VARCHAR(255) COMMENT '套餐描述',
    status          TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=启用 0=禁用',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限套餐表';

-- ============================================================
-- 新增表: package_permissions
-- ============================================================
CREATE TABLE package_permissions (
    package_id      BIGINT NOT NULL,
    permission_code VARCHAR(60) NOT NULL,

    PRIMARY KEY (package_id, permission_code),
    FOREIGN KEY (package_id) REFERENCES permission_packages(id) ON DELETE CASCADE,
    INDEX idx_permission_code (permission_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐-权限关联表';

-- ============================================================
-- 新增表: package_change_logs
-- 记录套餐变更审计日志
-- ============================================================
CREATE TABLE package_change_logs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL COMMENT '所属企业',
    old_package_id  BIGINT COMMENT '变更前套餐ID',
    new_package_id   BIGINT NOT NULL COMMENT '变更后套餐ID',
    operator_id     BIGINT COMMENT '操作人ID（平台管理员）',
    operator_type   VARCHAR(20) NOT NULL COMMENT 'platform_admin',
    reason          VARCHAR(255) COMMENT '变更原因',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_tenant (tenant_id),
    INDEX idx_tenant_created (tenant_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐变更日志表';

-- ============================================================
-- 修改 tenants 表: 增加 package_id 列
-- ============================================================
ALTER TABLE tenants ADD COLUMN package_id BIGINT AFTER logo;

ALTER TABLE tenants ADD CONSTRAINT fk_tenant_package
    FOREIGN KEY (package_id) REFERENCES permission_packages(id);

-- ============================================================
-- 修改 roles 表: 增加 role_type 和 is_editable 列
-- ============================================================
ALTER TABLE roles
    ADD COLUMN role_type ENUM('super_admin', 'operator', 'custom') NOT NULL DEFAULT 'custom'
    COMMENT 'super_admin=平台套餐超管角色  operator=运营预设角色  custom=自定义角色';

ALTER TABLE roles
    ADD COLUMN is_editable TINYINT(1) NOT NULL DEFAULT 1
    COMMENT '超管角色不可编辑删除: 0=不可编辑/删除  1=可编辑/删除';

-- ============================================================
-- 数据迁移: package_type → permission_packages
-- 为每种 package_type 创建一个对应的权限套餐，并绑定到已有企业
-- ============================================================

-- Step 1: 创建免费版套餐（仅 dashboard:view）
INSERT INTO permission_packages (code, name, description, status)
VALUES ('free', '免费版', '基础套餐，仅包含数据看板查看权限', 1);

INSERT INTO package_permissions (package_id, permission_code)
SELECT LAST_INSERT_ID(), code FROM permissions WHERE code = 'enterprise:dashboard:view';

-- Step 2: 创建专业版套餐（标准版 + product + order 权限）
INSERT INTO permission_packages (code, name, description, status)
VALUES ('pro', '专业版', '在标准版基础上增加商品管理和订单核销权限', 1);

INSERT INTO package_permissions (package_id, permission_code)
SELECT LAST_INSERT_ID(), code FROM permissions
WHERE module IN (
    'enterprise:dashboard',
    'enterprise:member',
    'enterprise:rule',
    'enterprise:product',
    'enterprise:order'
);

-- Step 3: 创建旗舰版套餐（全部权限）
INSERT INTO permission_packages (code, name, description, status)
VALUES ('enterprise', '旗舰版', '全功能套餐，包含所有企业端权限', 1);

INSERT INTO package_permissions (package_id, permission_code)
SELECT LAST_INSERT_ID(), code FROM permissions;

-- Step 4: 将已有企业按 package_type 绑定到对应套餐
-- free → free套餐
UPDATE tenants t
JOIN permission_packages pp ON pp.code = 'free'
SET t.package_id = pp.id
WHERE t.package_type = 'free' AND t.package_id IS NULL;

-- pro → pro套餐
UPDATE tenants t
JOIN permission_packages pp ON pp.code = 'pro'
SET t.package_id = pp.id
WHERE t.package_type = 'pro' AND t.package_id IS NULL;

-- enterprise → enterprise套餐
UPDATE tenants t
JOIN permission_packages pp ON pp.code = 'enterprise'
SET t.package_id = pp.id
WHERE t.package_type = 'enterprise' AND t.package_id IS NULL;

-- ============================================================
-- 数据迁移: is_preset → role_type + is_editable
-- is_preset=true → super_admin(不可编辑)  is_preset=false → custom(可编辑)
-- ============================================================
UPDATE roles SET role_type = 'super_admin', is_editable = 0 WHERE is_preset = 1;
UPDATE roles SET role_type = 'custom',     is_editable = 1 WHERE is_preset = 0;

-- ============================================================
-- 废弃字段说明（仅做标记，不删除列以保持向后兼容）
-- ============================================================
-- package_type 列: 保留但废弃，前端不再展示，数据已迁移至 package_id
-- is_preset 列:     保留但废弃，数据已迁移至 role_type + is_editable

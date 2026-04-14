-- ============================================================
-- Flyway V2: Add role_type and is_editable columns to roles table
-- These columns are required by the Role entity but missing from the base schema.
-- role_type: super_admin / operator / custom
-- is_editable: 1=can be edited/deleted, 0=immutable (super_admin)
-- Also backfills existing rows: is_preset=1 -> role_type=super_admin, is_editable=0
--                              is_preset=0 -> role_type=custom, is_editable=1
-- ============================================================

-- Add role_type column (VARCHAR 20, defaults to 'custom')
ALTER TABLE roles ADD COLUMN IF NOT EXISTS role_type VARCHAR(20) NOT NULL DEFAULT 'custom'
    COMMENT '角色类型: super_admin/operator/custom' AFTER name;

-- Add is_editable column (TINYINT 1, defaults to 1 for custom roles)
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_editable TINYINT(1) NOT NULL DEFAULT 1
    COMMENT '是否可编辑/删除: 1=可, 0=不可(超管)' AFTER role_type;

-- Backfill existing rows based on is_preset flag
-- is_preset=1 -> super_admin (immutable)
UPDATE roles SET role_type = 'super_admin', is_editable = 0 WHERE is_preset = 1;
-- is_preset=0 -> custom (editable) — already default, but ensure is_editable=1
UPDATE roles SET role_type = 'custom', is_editable = 1 WHERE is_preset = 0;

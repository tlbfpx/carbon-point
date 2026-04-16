-- ============================================================
-- Flyway V7: Add tenant_id to user_roles table
-- ============================================================

-- Add tenant_id column to user_roles table for proper tenant isolation
-- The UserRole entity has tenant_id field but the table was missing it
ALTER TABLE user_roles
    ADD COLUMN tenant_id BIGINT NOT NULL DEFAULT 1 COMMENT '租户ID' AFTER role_id;

-- Index for efficient tenant-scoped queries
CREATE INDEX idx_user_roles_tenant_id ON user_roles(tenant_id);

-- Index for user lookup by tenant
CREATE INDEX idx_user_roles_user_tenant ON user_roles(user_id, tenant_id);

-- ============================================================
-- Flyway V11: Add version column to tenants table for optimistic locking
-- Required by @Version field on Tenant entity (carbon-system/entity/Tenant.java:45-46)
-- ============================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号';

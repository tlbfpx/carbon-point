-- ============================================================
-- user_badges Multi-Tenant Migration
-- Adds tenant_id column and backfills from users table
-- ============================================================

-- Step 1: Add tenant_id column to user_badges table
ALTER TABLE user_badges
ADD COLUMN tenant_id BIGINT NOT NULL DEFAULT 0 COMMENT '所属租户' AFTER user_id;

-- Step 2: Backfill tenant_id from users table
UPDATE user_badges ub
INNER JOIN users u ON ub.user_id = u.id
SET ub.tenant_id = u.tenant_id
WHERE u.tenant_id > 0;

-- Step 3: Verify no orphan records remain (tenant_id = 0 indicates unmatched)
-- This should return 0 rows if all records are properly linked
-- SELECT COUNT(*) FROM user_badges WHERE tenant_id = 0;

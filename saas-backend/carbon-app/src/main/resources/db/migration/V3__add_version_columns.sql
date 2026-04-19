-- ============================================================
-- Flyway V3: Add version columns for optimistic locking
-- Required by @Version fields on User, Product, CheckInRecordEntity, PointTransactionEntity
-- ============================================================

-- users table (already has version in design spec DDL, ensure it exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号';

-- products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号';

-- check_in_records table
ALTER TABLE check_in_records ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号';

-- point_transactions table
ALTER TABLE point_transactions ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号';

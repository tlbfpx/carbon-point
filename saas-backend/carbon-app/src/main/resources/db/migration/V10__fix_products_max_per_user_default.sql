-- ============================================================
-- Flyway V10: Fix products.max_per_user default value
-- ============================================================
-- NULL means unlimited per-user exchange (no per-user limit).
-- DEFAULT 1 incorrectly restricted all users to 1 exchange.

ALTER TABLE products MODIFY COLUMN max_per_user INT DEFAULT NULL COMMENT '每人限兑数量（NULL=不限）';

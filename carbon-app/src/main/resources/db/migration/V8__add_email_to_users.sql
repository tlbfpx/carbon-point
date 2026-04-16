-- ============================================================
-- Flyway V8: Add email column to users table
-- ============================================================

-- Add email column to users table for notification purposes
ALTER TABLE users
    ADD COLUMN email VARCHAR(255) COMMENT '邮箱' AFTER phone;

-- Index for email lookups (useful for notification system)
CREATE INDEX idx_users_email ON users(email);

-- Add email column to platform_admins table
ALTER TABLE platform_admins ADD COLUMN email VARCHAR(100) COMMENT '邮箱' AFTER role;

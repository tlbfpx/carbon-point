-- ============================================================
-- 修复：Java Argon2PasswordEncoder 需要 {argon2} 前缀
-- 正确格式: {argon2}$argon2id$v=19$m=65536,t=3,p=4$...
-- ============================================================

SET @hash = '{argon2}$argon2id$v=19$m=65536,t=3,p=4$h01Ubn69ZEYPjKMLFWi6ow$T69ab97txy61+NTrZVTiMAofIJDfEGUkkuqlbkugBxk';

-- 企业C 超级管理员 (ID=101)
UPDATE users SET password_hash = @hash WHERE id = 101;

-- 企业C 运营 (ID=102)
UPDATE users SET password_hash = @hash WHERE id = 102;

-- 企业D 超级管理员 (ID=103)
UPDATE users SET password_hash = @hash WHERE id = 103;

-- 企业D 运营 (ID=104)
UPDATE users SET password_hash = @hash WHERE id = 104;

SELECT id, phone, LEFT(password_hash, 60) as password_hash_prefix FROM users WHERE id IN (101, 102, 103, 104);

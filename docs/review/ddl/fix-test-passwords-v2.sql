-- ============================================================
-- 更新测试账号密码为 123456 (正确 Argon2id 哈希)
-- 使用 Python argon2 重新生成，参数匹配 Java 端：
--   memory=65536, iterations=3, parallelism=4
-- ============================================================

SET @hash = '$argon2id$v=19$m=65536,t=3,p=4$h01Ubn69ZEYPjKMLFWi6ow$T69ab97txy61+NTrZVTiMAofIJDfEGUkkuqlbkugBxk';

-- 企业C 超级管理员 (ID=101)
UPDATE users SET password_hash = @hash WHERE id = 101;

-- 企业C 运营 (ID=102)
UPDATE users SET password_hash = @hash WHERE id = 102;

-- 企业D 超级管理员 (ID=103)
UPDATE users SET password_hash = @hash WHERE id = 103;

-- 企业D 运营 (ID=104)
UPDATE users SET password_hash = @hash WHERE id = 104;

SELECT id, phone, nickname FROM users WHERE id IN (101, 102, 103, 104);

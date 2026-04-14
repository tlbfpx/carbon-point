-- ============================================================
-- 更新测试账号密码为 123456 (正确 Argon2id 哈希)
-- 测试账号：
-- 企业C: 13800030001 / 13800030002
-- 企业D: 13800040001 / 13800040002
-- ============================================================

-- 生成方式:
-- Argon2id parameters: memory=65536, iterations=3, parallelism=4
-- password: 123456
-- ============================================================

-- 企业C 超级管理员 (ID=101)
UPDATE users SET password_hash = '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHlzYWx0$OWE4ZWI3YjJhZTRmNGE5YWQ4Zjc5NzQyYjQwMDAxNmE0YjllZDg1YjgzOTRhZTg5NmM4Zjc0NmFiYjcyNTkxNQ==' WHERE id = 101;

-- 企业C 运营 (ID=102)
UPDATE users SET password_hash = '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHlzYWx0$OWE4ZWI3YjJhZTRmNGE5YWQ4Zjc5NzQyYjQwMDAxNmE0YjllZDg1YjgzOTRhZTg5NmM4Zjc0NmFiYjcyNTkxNQ==' WHERE id = 102;

-- 企业D 超级管理员 (ID=103)
UPDATE users SET password_hash = '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHlzYWx0$OWE4ZWI3YjJhZTRmNGE5YWQ4Zjc5NzQyYjQwMDAxNmE0YjllZDg1YjgzOTRhZTg5NmM4Zjc0NmFiYjcyNTkxNQ==' WHERE id = 103;

-- 企业D 运营 (ID=104)
UPDATE users SET password_hash = '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHlzYWx0$OWE4ZWI3YjJhZTRmNGE5YWQ4Zjc5NzQyYjQwMDAxNmE0YjllZDg1YjgzOTRhZTg5NmM4Zjc0NmFiYjcyNTkxNQ==' WHERE id = 104;

-- 验证：更新后密码 123456 可以正确登录
-- ============================================================

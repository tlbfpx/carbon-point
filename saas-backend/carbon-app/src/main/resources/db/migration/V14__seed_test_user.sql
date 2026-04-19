-- Seed test user for enterprise frontend development
-- Phone: 13800010001, Password: Test@123
-- BCrypt hash (will be auto-upgraded to Argon2id on first login)

INSERT IGNORE INTO users (id, tenant_id, phone, password_hash, nickname, status, level, total_points, available_points, frozen_points, version, created_at, updated_at)
VALUES (1, 1, '13800010001', '$2a$12$i3Mz1TUxjQ.eqFMj/wYIHOV7r7EqULMspYr9Ncr0TC05q6d2TAT8q', '企业超管', 'active', 1, 0, 0, 0, 0, NOW(), NOW());

-- Bind to admin role (role id 1 for tenant 1)
INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (1, 1);

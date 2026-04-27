-- V30: Reset test user password to Test@123
-- BCrypt hash of "Test@123" with cost 12
-- Will be auto-upgraded to Argon2id on first successful login
UPDATE users
SET password_hash = '$2a$12$i3Mz1TUxjQ.eqFMj/wYIHOV7r7EqULMspYr9Ncr0TC05q6d2TAT8q'
WHERE phone = '13800010001' AND tenant_id = 1;

-- Test data for integration tests
-- Tenant A
INSERT INTO tenants (id, name, package_type, max_users, status) VALUES (1, '测试租户A', 'pro', 100, 'active');
-- Tenant B
INSERT INTO tenants (id, name, package_type, max_users, status) VALUES (2, '测试租户B', 'free', 50, 'active');

-- Default role for each tenant
INSERT INTO roles (id, tenant_id, name, is_preset) VALUES (1, 1, '管理员', TRUE);
INSERT INTO roles (id, tenant_id, name, is_preset) VALUES (2, 2, '管理员', TRUE);

-- Default time slot rule for tenant A
INSERT INTO time_slot_rules (id, tenant_id, name, start_time, end_time, enabled)
VALUES (1, 1, '上午时段', '08:00:00', '10:00:00', TRUE);
INSERT INTO time_slot_rules (id, tenant_id, name, start_time, end_time, enabled)
VALUES (2, 1, '下午时段', '14:00:00', '16:00:00', TRUE);

-- Default point rule for tenant A (time_slot type)
INSERT INTO point_rules (id, tenant_id, type, name, config, enabled, sort_order)
VALUES (1, 1, 'time_slot', '基础积分规则',
    '{"startTime": "00:00", "endTime": "23:59:59", "minPoints": 10, "maxPoints": 20}',
    TRUE, 1);

-- Default point rule for tenant A (daily_cap type)
INSERT INTO point_rules (id, tenant_id, type, name, config, enabled, sort_order)
VALUES (2, 1, 'daily_cap', '每日积分上限',
    '{"dailyLimit": 100}',
    TRUE, 5);

-- Test product (coupon type)
INSERT INTO products (id, tenant_id, name, description, type, points_price, stock, max_per_user, validity_days, fulfillment_config, status)
VALUES (1, 1, '测试咖啡券', '一杯咖啡', 'coupon', 100, 10, 2, 30,
    '{"codeLength": 12, "codeCharset": "ALPHANUMERIC"}', 'active');

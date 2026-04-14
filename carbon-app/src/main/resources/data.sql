-- ============================================================
-- Default tenant initialization data
-- ============================================================

-- Default tenant (insert only if not exists to be safe in repeated runs)
INSERT IGNORE INTO tenants (id, name, package_type, max_users, status, created_at, updated_at, deleted)
VALUES (1, '默认企业', 'pro', 100, 'active', NOW(), NOW(), 0);

-- Default admin role for the default tenant
INSERT IGNORE INTO roles (id, tenant_id, name, is_preset, deleted)
VALUES (1, 1, '管理员', TRUE, 0);

-- Default time slot rules for the default tenant
INSERT IGNORE INTO time_slot_rules (id, tenant_id, name, start_time, end_time, enabled, deleted)
VALUES (1, 1, '上午时段', '08:00:00', '10:00:00', TRUE, 0);
INSERT IGNORE INTO time_slot_rules (id, tenant_id, name, start_time, end_time, enabled, deleted)
VALUES (2, 1, '下午时段', '14:00:00', '16:00:00', TRUE, 0);

-- Default point rules for the default tenant
INSERT IGNORE INTO point_rules (id, tenant_id, type, name, config, enabled, sort_order, deleted)
VALUES (1, 1, 'time_slot', '基础积分规则',
    '{"startTime": "00:00", "endTime": "23:59:59", "minPoints": 10, "maxPoints": 20}',
    TRUE, 1, 0);

INSERT IGNORE INTO point_rules (id, tenant_id, type, name, config, enabled, sort_order, deleted)
VALUES (2, 1, 'daily_cap', '每日积分上限',
    '{"maxDailyPoints": 100}',
    TRUE, 5, 0);

-- V25: product_rule_templates table + point_rules tracking columns + basic_config

-- 1. Add columns to existing tables
ALTER TABLE point_rules
    ADD COLUMN source_template_id VARCHAR(36) DEFAULT NULL;

ALTER TABLE point_rules
    ADD COLUMN product_code VARCHAR(50) DEFAULT NULL;

ALTER TABLE platform_products
    ADD COLUMN basic_config JSON DEFAULT NULL;

-- 2. Create product_rule_templates table
CREATE TABLE product_rule_templates (
    id          VARCHAR(36)  NOT NULL,
    product_id  VARCHAR(36)  NOT NULL,
    rule_type   VARCHAR(50)  NOT NULL,
    name        VARCHAR(100) NOT NULL,
    config      JSON         NOT NULL,
    enabled     TINYINT      NOT NULL DEFAULT 1,
    sort_order  INT          NOT NULL DEFAULT 0,
    description VARCHAR(500) DEFAULT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_prt_product_id (product_id),
    INDEX idx_prt_rule_type (rule_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Seed stair_climbing templates
INSERT INTO product_rule_templates (id, product_id, rule_type, name, config, enabled, sort_order, description) VALUES
('tpl-stair-ts-morning', (SELECT id FROM platform_products WHERE code = 'stair_climbing'),
 'time_slot', '{"name":"早间通勤","startTime":"07:00","endTime":"09:00","minPoints":5,"maxPoints":15}',
 1, 1, '早间爬楼梯 07:00-09:00');

INSERT INTO product_rule_templates (id, product_id, rule_type, name, config, enabled, sort_order, description) VALUES
('tpl-stair-ts-afternoon', (SELECT id FROM platform_products WHERE code = 'stair_climbing'),
 'time_slot', '{"name":"午间午后","startTime":"11:30","endTime":"13:30","minPoints":4,"maxPoints":12}',
 1, 2, '午间爬楼梯 11:30-13:30');

INSERT INTO product_rule_templates (id, product_id, rule_type, name, config, enabled, sort_order, description) VALUES
('tpl-stair-streak', (SELECT id FROM platform_products WHERE code = 'stair_climbing'),
 'streak', '{"days":3,"bonusPoints":5}',
 1, 3, '连续打卡3天起奖');

INSERT INTO product_rule_templates (id, product_id, rule_type, name, config, enabled, sort_order, description) VALUES
('tpl-stair-daily-cap', (SELECT id FROM platform_products WHERE code = 'stair_climbing'),
 'daily_cap', '{"dailyLimit":100}',
 1, 4, '每日积分上限100');

INSERT INTO product_rule_templates (id, product_id, rule_type, name, config, enabled, sort_order, description) VALUES
('tpl-stair-level-coeff', (SELECT id FROM platform_products WHERE code = 'stair_climbing'),
 'level_coefficient', '{"levels":{"Lv.1":1.0,"Lv.2":1.1,"Lv.3":1.2,"Lv.4":1.3,"Lv.5":1.5}}',
 1, 5, '等级系数加成');

-- 4. Seed walking templates
INSERT INTO product_rule_templates (id, product_id, rule_type, name, config, enabled, sort_order, description) VALUES
('tpl-walking-daily-cap', (SELECT id FROM platform_products WHERE code = 'walking'),
 'daily_cap', '{"dailyLimit":60}',
 1, 1, '步行每日积分上限60');

INSERT INTO product_rule_templates (id, product_id, rule_type, name, config, enabled, sort_order, description) VALUES
('tpl-walking-level-coeff', (SELECT id FROM platform_products WHERE code = 'walking'),
 'level_coefficient', '{"levels":{"Lv.1":1.0,"Lv.2":1.05,"Lv.3":1.1,"Lv.4":1.2,"Lv.5":1.3}}',
 1, 2, '步行等级系数');

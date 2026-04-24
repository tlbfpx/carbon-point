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
('tpl-stair-ts-morning', 'stair_climbing', 'time_slot', '早间通勤', '{"name":"早间通勤","startTime":"07:00","endTime":"09:00","minPoints":5,"maxPoints":15}', 1, 1, '早间爬楼梯 07:00-09:00'),
('tpl-stair-ts-afternoon', 'stair_climbing', 'time_slot', '午间午后', '{"name":"午间午后","startTime":"11:30","endTime":"13:30","minPoints":4,"maxPoints":12}', 1, 2, '午间爬楼梯 11:30-13:30'),
('tpl-stair-streak', 'stair_climbing', 'streak', '连续打卡奖', '{"days":3,"bonusPoints":5}', 1, 3, '连续打卡3天起奖'),
('tpl-stair-daily-cap', 'stair_climbing', 'daily_cap', '每日积分上限', '{"dailyLimit":100}', 1, 4, '每日积分上限100'),
('tpl-stair-level-coeff', 'stair_climbing', 'level_coefficient', '等级系数加成', '{"levels":{"Lv.1":1.0,"Lv.2":1.1,"Lv.3":1.2,"Lv.4":1.3,"Lv.5":1.5}}', 1, 5, '等级系数加成');

-- 4. Seed walking templates
INSERT INTO product_rule_templates (id, product_id, rule_type, name, config, enabled, sort_order, description) VALUES
('tpl-walking-daily-cap', 'walking', 'daily_cap', '步行每日积分上限', '{"dailyLimit":60}', 1, 1, '步行每日积分上限60'),
('tpl-walking-level-coeff', 'walking', 'level_coefficient', '步行等级系数', '{"levels":{"Lv.1":1.0,"Lv.2":1.05,"Lv.3":1.1,"Lv.4":1.2,"Lv.5":1.3}}', 1, 2, '步行等级系数');

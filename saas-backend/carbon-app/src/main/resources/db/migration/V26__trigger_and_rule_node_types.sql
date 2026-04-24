-- V26: trigger_types and rule_node_types catalog tables

CREATE TABLE trigger_types (
    id          VARCHAR(36)  NOT NULL,
    code        VARCHAR(50)  NOT NULL,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(500) DEFAULT NULL,
    sort_order  INT          NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE INDEX uk_tt_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rule_node_types (
    id          VARCHAR(36)  NOT NULL,
    code        VARCHAR(50)  NOT NULL,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(500) DEFAULT NULL,
    bean_name   VARCHAR(100) NOT NULL,
    sort_order  INT          NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE INDEX uk_rnt_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed trigger types (from existing SPI values)
INSERT INTO trigger_types (id, code, name, description, sort_order) VALUES
('tt-check_in', 'check_in', '打卡触发器', '用户手动打卡触发，验证打卡时间是否在有效时段内', 1),
('tt-sensor_data', 'sensor_data', '传感器数据触发器', '传感器数据触发（走路计步），验证步数是否达到阈值', 2);

-- Seed rule node types (from existing SPI values + RuleChainExecutor NAME_MAP)
INSERT INTO rule_node_types (id, code, name, description, bean_name, sort_order) VALUES
('rnt-time-slot-match', 'time_slot_match', '时段匹配', '检查触发时间是否在允许的时段内', 'timeSlotMatch', 1),
('rnt-random-base', 'random_base', '随机基数', '在配置的积分区间内随机生成基础积分', 'randomBase', 2),
('rnt-special-date-multiplier', 'special_date_multiplier', '特殊日期倍率', '节假日/特殊日期积分翻倍', 'specialDateMultiplier', 3),
('rnt-level-coefficient', 'level_coefficient', '等级系数', '根据用户等级调整积分系数', 'levelCoefficient', 4),
('rnt-round', 'round', '数值取整', '对积分结果进行四舍五入处理', 'round', 5),
('rnt-daily-cap', 'daily_cap', '每日上限', '检查当日累计积分是否超过每日上限', 'dailyCap', 6),
('rnt-threshold-filter', 'threshold_filter', '步数阈值过滤', '过滤不满足最低步数要求的数据', 'thresholdFilter', 7),
('rnt-formula-calc', 'formula_calc', '步数公式换算', '按公式将步数换算为积分', 'formulaCalc', 8);

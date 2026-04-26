-- V29: Seed feature definitions for all product modules

INSERT INTO features (code, name, type, value_type, default_value, `group`) VALUES
-- Stair climbing features
('stair.time_slot', '多时间段配置', 'config', 'json', '{"max_time_slots":1}', 'stair_climbing'),
('stair.floor_points', '每层楼积分', 'config', 'json', '{"enabled":false,"points_per_floor":null}', 'stair_climbing'),
('stair.workday_only', '有效日期范围', 'config', 'json', '{"mode":"all_days","include_weekend":true,"include_holiday":true}', 'stair_climbing'),
('stair.special_date', '特殊日期倍数', 'config', 'json', '{"max_special_dates":0}', 'stair_climbing'),
('stair.leaderboard', '排行榜维度', 'config', 'json', '{"dimensions":["daily"]}', 'stair_climbing'),
-- Walking features
('walking.daily_points', '每日走路积分', 'config', 'json', '{}', 'walking'),
('walking.step_tier', '梯度步数奖励', 'config', 'json', '{"max_tiers":3}', 'walking'),
('walking.fun_conversion', '趣味换算', 'config', 'json', '{"max_items":5}', 'walking'),
('walking.leaderboard', '排行榜维度', 'config', 'json', '{"dimensions":["daily"]}', 'walking'),
-- Quiz features
('quiz.enabled', '答题功能开关', 'permission', 'boolean', 'false', 'quiz'),
('quiz.question_types', '题目类型', 'config', 'json', '{"types":["true_false","single_choice","multi_choice"]}', 'quiz'),
('quiz.daily_limit', '每日答题数量', 'config', 'json', '{"max_daily":3}', 'quiz'),
('quiz.analysis', '解题分析展示', 'config', 'json', '{"enabled":true}', 'quiz'),
-- Mall features
('mall.enabled', '积分商城开关', 'permission', 'boolean', 'false', 'mall'),
('mall.exchange_rate', '汇率系数', 'config', 'json', '{"allow_custom_rate":true}', 'mall'),
('mall.platform_pool', '平台商品池', 'config', 'json', '{"max_products":50}', 'mall'),
('mall.reports', '兑换统计报表', 'config', 'json', '{"dimensions":["daily","monthly","yearly"]}', 'mall')
ON DUPLICATE KEY UPDATE name=VALUES(name);

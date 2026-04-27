-- V31: 徽章定义种子数据
-- trigger_type:trigger_condition 存储在 condition_expr 字段
-- tenant_id = NULL 表示全局徽章（所有租户可见）

-- ===== 签到里程碑徽章 =====
INSERT INTO badge_definitions (badge_id, name, description, icon, rarity, condition_expr, created_at)
VALUES ('first_checkin', '初来乍到', '完成首次楼梯打卡', '/badges/first_checkin.png', 'common', 'checkin_milestone:1', NOW())
ON DUPLICATE KEY UPDATE name=name;

INSERT INTO badge_definitions (badge_id, name, description, icon, rarity, condition_expr, created_at)
VALUES ('streak_7', '坚持一周', '连续打卡7天', '/badges/streak_7.png', 'common', 'checkin_milestone:7', NOW())
ON DUPLICATE KEY UPDATE name=name;

INSERT INTO badge_definitions (badge_id, name, description, icon, rarity, condition_expr, created_at)
VALUES ('streak_30', '月度达人', '连续打卡30天', '/badges/streak_30.png', 'rare', 'checkin_milestone:30', NOW())
ON DUPLICATE KEY UPDATE name=name;

INSERT INTO badge_definitions (badge_id, name, description, icon, rarity, condition_expr, created_at)
VALUES ('streak_100', '百日传奇', '连续打卡100天', '/badges/streak_100.png', 'epic', 'checkin_milestone:100', NOW())
ON DUPLICATE KEY UPDATE name=name;

-- ===== 等级达成徽章 =====
INSERT INTO badge_definitions (badge_id, name, description, icon, rarity, condition_expr, created_at)
VALUES ('level_silver', '白银之星', '晋升为白银等级', '/badges/level_silver.png', 'common', 'level_up:2', NOW())
ON DUPLICATE KEY UPDATE name=name;

INSERT INTO badge_definitions (badge_id, name, description, icon, rarity, condition_expr, created_at)
VALUES ('level_gold', '黄金荣耀', '晋升为黄金等级', '/badges/level_gold.png', 'rare', 'level_up:3', NOW())
ON DUPLICATE KEY UPDATE name=name;

INSERT INTO badge_definitions (badge_id, name, description, icon, rarity, condition_expr, created_at)
VALUES ('level_platinum', '铂金尊享', '晋升为铂金等级', '/badges/level_platinum.png', 'epic', 'level_up:4', NOW())
ON DUPLICATE KEY UPDATE name=name;

INSERT INTO badge_definitions (badge_id, name, description, icon, rarity, condition_expr, created_at)
VALUES ('level_diamond', '钻石璀璨', '晋升为钻石等级', '/badges/level_diamond.png', 'legendary', 'level_up:5', NOW())
ON DUPLICATE KEY UPDATE name=name;

-- ===== 积分里程碑徽章 =====
INSERT INTO badge_definitions (badge_id, name, description, icon, rarity, condition_expr, created_at)
VALUES ('points_1000', '千分起步', '累计获得1000积分', '/badges/points_1000.png', 'common', 'points_milestone:1000', NOW())
ON DUPLICATE KEY UPDATE name=name;

INSERT INTO badge_definitions (badge_id, name, description, icon, rarity, condition_expr, created_at)
VALUES ('points_5000', '五千里程碑', '累计获得5000积分', '/badges/points_5000.png', 'rare', 'points_milestone:5000', NOW())
ON DUPLICATE KEY UPDATE name=name;

INSERT INTO badge_definitions (badge_id, name, description, icon, rarity, condition_expr, created_at)
VALUES ('points_10000', '万分俱乐部', '累计获得10000积分', '/badges/points_10000.png', 'epic', 'points_milestone:10000', NOW())
ON DUPLICATE KEY UPDATE name=name;

INSERT INTO badge_definitions (badge_id, name, description, icon, rarity, condition_expr, created_at)
VALUES ('points_50000', '积分大亨', '累计获得50000积分', '/badges/points_50000.png', 'legendary', 'points_milestone:50000', NOW())
ON DUPLICATE KEY UPDATE name=name;

-- ===== 特殊徽章 =====
INSERT INTO badge_definitions (badge_id, name, description, icon, rarity, condition_expr, created_at)
VALUES ('early_bird', '早起鸟儿', '在早上7点前完成打卡', '/badges/early_bird.png', 'rare', 'special:early_bird', NOW())
ON DUPLICATE KEY UPDATE name=name;

INSERT INTO badge_definitions (badge_id, name, description, icon, rarity, condition_expr, created_at)
VALUES ('weekend_warrior', '周末战士', '连续4个周末都有打卡记录', '/badges/weekend_warrior.png', 'rare', 'special:weekend_warrior', NOW())
ON DUPLICATE KEY UPDATE name=name;

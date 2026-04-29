-- V33: Add stair_climbing, walking, quiz and mall products to platform_products table

INSERT INTO platform_products (id, code, name, category, description, status, sort_order) VALUES
(UUID(), 'stair_climbing', '爬楼积分', 'stairs_climbing', '包含爬楼梯打卡功能', 1, 1),
(UUID(), 'walking', '走路积分', 'walking', '包含步行打卡功能', 1, 2),
(UUID(), 'quiz', '知识问答', 'quiz', '包含知识问答功能', 1, 3),
(UUID(), 'mall', '积分商城', 'mall', '包含积分商城功能', 1, 4)
ON DUPLICATE KEY UPDATE name=VALUES(name);

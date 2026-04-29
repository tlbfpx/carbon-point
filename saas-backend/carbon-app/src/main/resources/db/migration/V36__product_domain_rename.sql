-- =====================================================
-- Carbon Point V36 - 产品领域模型重命名迁移
-- 描述：使数据库与新的领域模型一致
-- =====================================================

-- 套餐产品关联表重命名
ALTER TABLE package_products RENAME TO package_platform_products;

-- 套餐产品功能配置表重命名
ALTER TABLE package_product_features RENAME TO package_platform_product_features;

-- 企业虚拟商品表重命名（由于存在外键，先检查再重命名）
-- 注意：如果有其他表引用 products，需要先删除或更新外键
ALTER TABLE products RENAME TO virtual_goods;

-- 更新表注释，使数据库自文档化
ALTER TABLE platform_products COMMENT = '平台产品定义 - 定义可订阅的产品（爬楼、走路等）';
ALTER TABLE product_features COMMENT = '产品功能配置 - 产品与功能的关联关系';
ALTER TABLE package_platform_products COMMENT = '套餐平台产品关联 - 套餐包含哪些平台产品';
ALTER TABLE package_platform_product_features COMMENT = '套餐产品功能配置 - 套餐级别的产品功能定制';
ALTER TABLE virtual_goods COMMENT = '虚拟商品 - 企业创建的积分兑换商品';


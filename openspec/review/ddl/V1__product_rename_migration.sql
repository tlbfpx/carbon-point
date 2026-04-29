-- =====================================================
-- Carbon Point 产品功能重构 - 数据库迁移脚本
-- 版本：V1
-- 描述：重命名表，使数据库与新的领域模型一致
-- =====================================================

-- =====================================================
-- 1. 重命名表
-- =====================================================

-- 套餐产品关联表重命名
ALTER TABLE package_products RENAME TO package_platform_products;

-- 套餐产品功能配置表重命名
ALTER TABLE package_product_features RENAME TO package_platform_product_features;

-- 企业虚拟商品表重命名
ALTER TABLE products RENAME TO virtual_goods;

-- =====================================================
-- 2. 更新表注释（使数据库自文档化）
-- =====================================================

COMMENT ON TABLE platform_products IS '平台产品定义 - 定义可订阅的产品（爬楼、走路等）';
COMMENT ON TABLE product_features IS '产品功能配置 - 产品与功能的关联关系';
COMMENT ON TABLE package_platform_products IS '套餐平台产品关联 - 套餐包含哪些平台产品';
COMMENT ON TABLE package_platform_product_features IS '套餐产品功能配置 - 套餐级别的产品功能定制';
COMMENT ON TABLE virtual_goods IS '虚拟商品 - 企业创建的积分兑换商品';

-- =====================================================
-- 3. 验证迁移（返回所有表名确认）
-- =====================================================

SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'platform_products',
    'product_features',
    'package_platform_products',
    'package_platform_product_features',
    'virtual_goods'
  )
ORDER BY table_name;


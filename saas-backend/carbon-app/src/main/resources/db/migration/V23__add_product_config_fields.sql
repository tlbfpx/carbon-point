-- Add product configuration fields for rule chain integration
ALTER TABLE platform_products ADD COLUMN trigger_type VARCHAR(50) DEFAULT NULL COMMENT '触发器类型: check_in / sensor_data';
ALTER TABLE platform_products ADD COLUMN rule_chain_config JSON DEFAULT NULL COMMENT '规则链配置: 含节点顺序和参数';
ALTER TABLE platform_products ADD COLUMN default_config JSON DEFAULT NULL COMMENT '默认积分配置';

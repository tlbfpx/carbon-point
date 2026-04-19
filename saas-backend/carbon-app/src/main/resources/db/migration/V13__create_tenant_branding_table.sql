CREATE TABLE tenant_branding (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  tenant_id BIGINT UNIQUE NOT NULL COMMENT '租户ID',
  logo_url VARCHAR(500) COMMENT '企业logo URL',
  theme_type VARCHAR(32) NOT NULL DEFAULT 'preset' COMMENT '主题类型: preset|custom',
  preset_theme VARCHAR(32) DEFAULT 'default-blue' COMMENT '预设主题: default-blue|tech-green|vibrant-orange|deep-purple',
  primary_color VARCHAR(16) COMMENT '自定义主色 #HEX',
  secondary_color VARCHAR(16) COMMENT '自定义辅助色 #HEX',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租户品牌配置表';

-- 为现有租户初始化默认品牌配置
INSERT INTO tenant_branding (tenant_id, theme_type, preset_theme)
SELECT id, 'preset', 'default-blue' FROM tenants;

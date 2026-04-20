-- Point expiration configuration per tenant
CREATE TABLE point_expiration_configs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    expiration_months INT NOT NULL DEFAULT 12,
    pre_notice_days INT NOT NULL DEFAULT 30,
    manual_extension_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    extension_months INT NOT NULL DEFAULT 3,
    handling VARCHAR(20) NOT NULL DEFAULT 'forfeit',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Records of user manual extensions (at most one per user)
CREATE TABLE point_extension_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    extended_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    months_extended INT NOT NULL DEFAULT 3,
    UNIQUE KEY uk_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

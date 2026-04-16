-- ============================================================
-- Flyway V6: Add email notification tables
-- ============================================================

-- Email send log table
CREATE TABLE IF NOT EXISTS email_send_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    email VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL COMMENT '通知类型',
    subject VARCHAR(500) NOT NULL COMMENT '邮件主题',
    content TEXT COMMENT '邮件正文',
    result VARCHAR(20) NOT NULL COMMENT 'success/failed/error',
    error_msg VARCHAR(500),
    retry_count INT DEFAULT 0,
    next_retry_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_type_date (user_id, type, created_at),
    INDEX idx_email_type_date (email, type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert email templates for notification system
INSERT INTO notification_templates (type, channel, title_template, content_template, is_preset, created_at, updated_at)
SELECT 'level_up', 'email', '🎉 恭喜您升级！', '<p>亲爱的用户：</p><p>恭喜您已升级为 <strong>{level_name}</strong>！</p><p>您的当前等级：{level_name}</p><p>继续保持签到，收获更多健康！</p>', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'level_up' AND channel = 'email');

INSERT INTO notification_templates (type, channel, title_template, content_template, is_preset, created_at, updated_at)
SELECT 'badge_earned', 'email', '🏅 获得新徽章！', '<p>亲爱的用户：</p><p>恭喜您获得了新徽章 <strong>{badge_name}</strong>！</p><p>徽章描述：{badge_desc}</p><p>继续加油！</p>', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'badge_earned' AND channel = 'email');

INSERT INTO notification_templates (type, channel, title_template, content_template, is_preset, created_at, updated_at)
SELECT 'coupon_expiring', 'email', '⏰ 优惠券即将过期', '<p>亲爱的用户：</p><p>您有一张优惠券即将在 <strong>{expire_date}</strong> 到期：</p><p>优惠券名称：{coupon_name}</p><p>请尽快使用！</p>', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'coupon_expiring' AND channel = 'email');

INSERT INTO notification_templates (type, channel, title_template, content_template, is_preset, created_at, updated_at)
SELECT 'order_fulfilled', 'email', '📦 订单已发货！', '<p>亲爱的用户：</p><p>您的订单 <strong>{order_id}</strong> 已发货！</p><p>商品：{product_name}</p><p>感谢您的购买！</p>', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'order_fulfilled' AND channel = 'email');

INSERT INTO notification_templates (type, channel, title_template, content_template, is_preset, created_at, updated_at)
SELECT 'order_expired', 'email', '⏰ 订单已过期', '<p>亲爱的用户：</p><p>您的订单 <strong>{order_id}</strong> 已过期未处理。</p><p>商品：{product_name}</p><p>积分已返还至您的账户。</p>', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'order_expired' AND channel = 'email');

INSERT INTO notification_templates (type, channel, title_template, content_template, is_preset, created_at, updated_at)
SELECT 'tenant_suspended', 'email', '⚠️ 企业账号停用通知', '<p>尊敬的企业管理员：</p><p>您的企业账号 <strong>{tenant_name}</strong> 已停用。</p><p>停用原因：{reason}</p><p>如有疑问，请联系客服。</p>', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'tenant_suspended' AND channel = 'email');

INSERT INTO notification_templates (type, channel, title_template, content_template, is_preset, created_at, updated_at)
SELECT 'user_disabled', 'email', '⚠️ 账户停用通知', '<p>尊敬的用户：</p><p>您的账户已被停用。</p><p>停用原因：{reason}</p><p>如有疑问，请联系企业管理员。</p>', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'user_disabled' AND channel = 'email');

INSERT INTO notification_templates (type, channel, title_template, content_template, is_preset, created_at, updated_at)
SELECT 'invite_expiring', 'email', '📧 邀请链接即将过期', '<p>亲爱的用户：</p><p>您发出的邀请链接将在 <strong>{expire_date}</strong> 过期。</p><p>请提醒您的好友尽快注册！</p>', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'invite_expiring' AND channel = 'email');

-- ============================================================
-- Honor System Migration
-- 添加徽章排行榜相关表和索引
-- ============================================================

-- 确保 user_badges 表有 uk_user_badge 唯一索引（防止并发重复发放）
ALTER TABLE user_badges ADD UNIQUE INDEX uk_user_badge (user_id, badge_id);

-- ============================================================
-- 性能优化迁移脚本
-- 日期: 2026-04-14
-- 说明: HikariCP连接池调优 + 打卡记录查询优化索引
-- ============================================================

-- 1. HikariCP连接池已在 application.yml / application-prod.yml 中配置：
--    maximum-pool-size: 30 (默认，支持环境变量覆盖)
--    minimum-idle: 5
--    connection-timeout: 30000
--    idle-timeout: 600000
--    max-lifetime: 1800000
--    leak-detection-threshold: 60000
-- 本迁移文件仅记录，不执行（配置通过应用配置管理）

-- ============================================================
-- 2. 打卡记录表添加复合索引 (tenant_id, user_id, created_at)
--    用于按租户 + 用户 + 时间范围的联合查询优化
--    场景: 员工打卡明细导出、积分流水关联查询
-- ============================================================

ALTER TABLE check_in_records
    ADD INDEX idx_tenant_user_created (tenant_id, user_id, created_at);

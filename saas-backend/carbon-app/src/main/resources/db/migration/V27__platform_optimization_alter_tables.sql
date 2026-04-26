-- V27: Platform Admin Optimization — ALTER existing tables

-- 1. Tenants: add exchange rate for points-to-RMB conversion
ALTER TABLE tenants
    ADD COLUMN points_exchange_rate DECIMAL(10,4) DEFAULT 100.0000
    COMMENT '积分兑换人民币汇率（如 100.0000 = 100积分=1元）';

-- 2. Time slot rules: add per-floor points configuration
ALTER TABLE time_slot_rules
    ADD COLUMN points_per_floor INT DEFAULT NULL
    COMMENT '每层积分（stair.floor_points 功能启用时使用，NULL 表示不启用）';

-- 3. Leaderboard snapshots: add dimension column for extended rankings
ALTER TABLE leaderboard_snapshots
    ADD COLUMN dimension VARCHAR(20) DEFAULT 'daily'
    COMMENT '排行维度: daily/weekly/monthly/quarterly/yearly'
    AFTER snapshot_type;

ALTER TABLE leaderboard_snapshots
    ADD INDEX idx_tenant_dimension_date (tenant_id, dimension, snapshot_date);

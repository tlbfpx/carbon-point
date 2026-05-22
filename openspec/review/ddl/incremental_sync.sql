-- ============================================================
-- Carbon Point 增量数据同步脚本
-- 版本: V2.3
-- 说明: 实现旧架构与新架构之间的持续增量同步
-- 机制: 使用变更日志表 + 触发器 + 定时任务
-- ============================================================

-- ============================================================
-- 1. 创建变更日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS change_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    table_name VARCHAR(100) NOT NULL COMMENT '发生变更的表名',
    record_id VARCHAR(255) NOT NULL COMMENT '变更记录的ID',
    operation_type VARCHAR(20) NOT NULL COMMENT '操作类型: INSERT, UPDATE, DELETE',
    old_value JSON COMMENT '变更前的值',
    new_value JSON COMMENT '变更后的值',
    sync_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '同步状态: PENDING, IN_PROGRESS, COMPLETED, FAILED',
    sync_error TEXT COMMENT '同步错误信息',
    retry_count INT NOT NULL DEFAULT 0 COMMENT '重试次数',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    processed_at TIMESTAMP(3) NULL COMMENT '处理时间',
    INDEX idx_table_record (table_name, record_id),
    INDEX idx_sync_status (sync_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='变更日志表';

-- ============================================================
-- 2. 创建同步状态表
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_status (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sync_name VARCHAR(100) NOT NULL UNIQUE COMMENT '同步任务名称',
    last_sync_id BIGINT NOT NULL DEFAULT 0 COMMENT '上次同步的变更日志ID',
    last_sync_time TIMESTAMP(3) NULL COMMENT '上次同步时间',
    records_synced BIGINT NOT NULL DEFAULT 0 COMMENT '已同步记录数',
    records_failed BIGINT NOT NULL DEFAULT 0 COMMENT '失败记录数',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步状态表';

-- 初始化同步状态
INSERT IGNORE INTO sync_status (sync_name, last_sync_id) VALUES
('platform_products_to_resources', 0),
('tenant_product_configs', 0),
('mall_products', 0);

-- ============================================================
-- 3. 创建平台产品变更触发器
-- ============================================================
DELIMITER //

CREATE TRIGGER IF NOT EXISTS trg_platform_products_old_after_insert
AFTER INSERT ON platform_products_old
FOR EACH ROW
BEGIN
    INSERT INTO change_log (table_name, record_id, operation_type, new_value, sync_status)
    VALUES (
        'platform_products_old',
        NEW.id,
        'INSERT',
        JSON_OBJECT(
            'id', NEW.id,
            'code', NEW.code,
            'name', NEW.name,
            'description', NEW.description,
            'status', NEW.status,
            'sort_order', NEW.sort_order,
            'category', NEW.category
        ),
        'PENDING'
    );
END //

CREATE TRIGGER IF NOT EXISTS trg_platform_products_old_after_update
AFTER UPDATE ON platform_products_old
FOR EACH ROW
BEGIN
    INSERT INTO change_log (table_name, record_id, operation_type, old_value, new_value, sync_status)
    VALUES (
        'platform_products_old',
        NEW.id,
        'UPDATE',
        JSON_OBJECT(
            'id', OLD.id,
            'code', OLD.code,
            'name', OLD.name,
            'description', OLD.description,
            'status', OLD.status,
            'sort_order', OLD.sort_order,
            'category', OLD.category
        ),
        JSON_OBJECT(
            'id', NEW.id,
            'code', NEW.code,
            'name', NEW.name,
            'description', NEW.description,
            'status', NEW.status,
            'sort_order', NEW.sort_order,
            'category', NEW.category
        ),
        'PENDING'
    );
END //

CREATE TRIGGER IF NOT EXISTS trg_platform_products_old_after_delete
AFTER DELETE ON platform_products_old
FOR EACH ROW
BEGIN
    INSERT INTO change_log (table_name, record_id, operation_type, old_value, sync_status)
    VALUES (
        'platform_products_old',
        OLD.id,
        'DELETE',
        JSON_OBJECT(
            'id', OLD.id,
            'code', OLD.code,
            'name', OLD.name
        ),
        'PENDING'
    );
END //

-- ============================================================
-- 4. 创建租户产品配置变更触发器
-- ============================================================
CREATE TRIGGER IF NOT EXISTS trg_product_configs_old_after_insert
AFTER INSERT ON product_configs_old
FOR EACH ROW
BEGIN
    INSERT INTO change_log (table_name, record_id, operation_type, new_value, sync_status)
    VALUES (
        'product_configs_old',
        CONCAT(NEW.tenant_id, '_', NEW.product_code),
        'INSERT',
        JSON_OBJECT(
            'tenant_id', NEW.tenant_id,
            'product_code', NEW.product_code,
            'enabled', NEW.enabled,
            'config_json', NEW.config_json
        ),
        'PENDING'
    );
END //

CREATE TRIGGER IF NOT EXISTS trg_product_configs_old_after_update
AFTER UPDATE ON product_configs_old
FOR EACH ROW
BEGIN
    INSERT INTO change_log (table_name, record_id, operation_type, old_value, new_value, sync_status)
    VALUES (
        'product_configs_old',
        CONCAT(NEW.tenant_id, '_', NEW.product_code),
        'UPDATE',
        JSON_OBJECT(
            'tenant_id', OLD.tenant_id,
            'product_code', OLD.product_code,
            'enabled', OLD.enabled,
            'config_json', OLD.config_json
        ),
        JSON_OBJECT(
            'tenant_id', NEW.tenant_id,
            'product_code', NEW.product_code,
            'enabled', NEW.enabled,
            'config_json', NEW.config_json
        ),
        'PENDING'
    );
END //

CREATE TRIGGER IF NOT EXISTS trg_product_configs_old_after_delete
AFTER DELETE ON product_configs_old
FOR EACH ROW
BEGIN
    INSERT INTO change_log (table_name, record_id, operation_type, old_value, sync_status)
    VALUES (
        'product_configs_old',
        CONCAT(OLD.tenant_id, '_', OLD.product_code),
        'DELETE',
        JSON_OBJECT(
            'tenant_id', OLD.tenant_id,
            'product_code', OLD.product_code
        ),
        'PENDING'
    );
END //

DELIMITER ;

-- ============================================================
-- 5. 创建增量同步存储过程
-- ============================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS sync_platform_products_to_resources(IN p_batch_size INT DEFAULT 100)
BEGIN
    DECLARE v_sync_id BIGINT;
    DECLARE v_start_id BIGINT;
    DECLARE v_end_id BIGINT;
    DECLARE v_done BOOLEAN DEFAULT FALSE;
    DECLARE v_change_id BIGINT;
    DECLARE v_table_name VARCHAR(100);
    DECLARE v_record_id VARCHAR(255);
    DECLARE v_operation_type VARCHAR(20);
    DECLARE v_old_value JSON;
    DECLARE v_new_value JSON;
    DECLARE v_retry_count INT;
    DECLARE v_error_msg TEXT;
    DECLARE v_processed_count INT DEFAULT 0;
    DECLARE v_failed_count INT DEFAULT 0;

    -- 声明游标
    DECLARE cur_changes CURSOR FOR
        SELECT id, table_name, record_id, operation_type, old_value, new_value, retry_count
        FROM change_log
        WHERE table_name = 'platform_products_old'
          AND sync_status IN ('PENDING', 'FAILED')
          AND retry_count < 3
          AND id > v_start_id
        ORDER BY id
        LIMIT p_batch_size;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    -- 获取上次同步位置
    SELECT last_sync_id INTO v_start_id
    FROM sync_status
    WHERE sync_name = 'platform_products_to_resources';

    -- 获取本次处理的最大ID
    SELECT COALESCE(MAX(id), v_start_id) INTO v_end_id
    FROM change_log
    WHERE table_name = 'platform_products_old'
      AND id > v_start_id;

    -- 开始事务
    START TRANSACTION;

    BEGIN
        -- 打开游标
        OPEN cur_changes;

        -- 循环处理变更
        read_loop: LOOP
            FETCH cur_changes INTO v_change_id, v_table_name, v_record_id, v_operation_type, v_old_value, v_new_value, v_retry_count;

            IF v_done THEN
                LEAVE read_loop;
            END IF;

            BEGIN
                -- 标记为处理中
                UPDATE change_log
                SET sync_status = 'IN_PROGRESS',
                    retry_count = retry_count + 1
                WHERE id = v_change_id;

                CASE v_operation_type
                    WHEN 'INSERT', 'UPDATE' THEN
                        -- 同步到平台资源表
                        INSERT INTO platform_resources (id, code, type, name, category, description, status, sort_order, created_at, updated_at)
                        VALUES (
                            UUID_TO_BIN(UUID()),
                            CONCAT('PRODUCT_', UPPER(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(v_new_value, '$.code')), '-', '_'))),
                            'FUNCTION_PRODUCT',
                            JSON_UNQUOTE(JSON_EXTRACT(v_new_value, '$.name')),
                            JSON_UNQUOTE(JSON_EXTRACT(v_new_value, '$.category')),
                            JSON_UNQUOTE(JSON_EXTRACT(v_new_value, '$.description')),
                            CASE WHEN JSON_EXTRACT(v_new_value, '$.status') = 1 THEN 'ENABLED' ELSE 'DISABLED' END,
                            JSON_EXTRACT(v_new_value, '$.sort_order'),
                            CURRENT_TIMESTAMP(3),
                            CURRENT_TIMESTAMP(3)
                        )
                        ON DUPLICATE KEY UPDATE
                            name = JSON_UNQUOTE(JSON_EXTRACT(v_new_value, '$.name')),
                            category = JSON_UNQUOTE(JSON_EXTRACT(v_new_value, '$.category')),
                            description = JSON_UNQUOTE(JSON_EXTRACT(v_new_value, '$.description')),
                            status = CASE WHEN JSON_EXTRACT(v_new_value, '$.status') = 1 THEN 'ENABLED' ELSE 'DISABLED' END,
                            sort_order = JSON_EXTRACT(v_new_value, '$.sort_order'),
                            updated_at = CURRENT_TIMESTAMP(3);

                    WHEN 'DELETE' THEN
                        -- 软删除平台资源
                        UPDATE platform_resources
                        SET status = 'DISABLED',
                            deleted = TRUE,
                            updated_at = CURRENT_TIMESTAMP(3)
                        WHERE code = CONCAT('PRODUCT_', UPPER(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(v_old_value, '$.code')), '-', '_')));
                END CASE;

                -- 标记为成功
                UPDATE change_log
                SET sync_status = 'COMPLETED',
                    processed_at = CURRENT_TIMESTAMP(3)
                WHERE id = v_change_id;

                SET v_processed_count = v_processed_count + 1;

            EXCEPTION
                WHEN OTHERS THEN
                    GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
                    -- 标记为失败
                    UPDATE change_log
                    SET sync_status = 'FAILED',
                        sync_error = v_error_msg,
                        processed_at = CURRENT_TIMESTAMP(3)
                    WHERE id = v_change_id;
                    SET v_failed_count = v_failed_count + 1;
            END;

        END LOOP;

        -- 关闭游标
        CLOSE cur_changes;

        -- 更新同步状态
        UPDATE sync_status
        SET last_sync_id = v_end_id,
            last_sync_time = CURRENT_TIMESTAMP(3),
            records_synced = records_synced + v_processed_count,
            records_failed = records_failed + v_failed_count
        WHERE sync_name = 'platform_products_to_resources';

        -- 提交事务
        COMMIT;

    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RESIGNAL;
    END;

    -- 返回处理结果
    SELECT v_processed_count AS processed_count, v_failed_count AS failed_count;
END //

DELIMITER ;

-- ============================================================
-- 6. 创建租户资源配置同步存储过程
-- ============================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS sync_tenant_product_configs(IN p_batch_size INT DEFAULT 100)
BEGIN
    DECLARE v_sync_id BIGINT;
    DECLARE v_start_id BIGINT;
    DECLARE v_end_id BIGINT;
    DECLARE v_done BOOLEAN DEFAULT FALSE;
    DECLARE v_change_id BIGINT;
    DECLARE v_table_name VARCHAR(100);
    DECLARE v_record_id VARCHAR(255);
    DECLARE v_operation_type VARCHAR(20);
    DECLARE v_old_value JSON;
    DECLARE v_new_value JSON;
    DECLARE v_retry_count INT;
    DECLARE v_error_msg TEXT;
    DECLARE v_processed_count INT DEFAULT 0;
    DECLARE v_failed_count INT DEFAULT 0;
    DECLARE v_tenant_id BIGINT;
    DECLARE v_product_code VARCHAR(100);
    DECLARE v_resource_code VARCHAR(100);

    DECLARE cur_changes CURSOR FOR
        SELECT id, table_name, record_id, operation_type, old_value, new_value, retry_count
        FROM change_log
        WHERE table_name = 'product_configs_old'
          AND sync_status IN ('PENDING', 'FAILED')
          AND retry_count < 3
          AND id > v_start_id
        ORDER BY id
        LIMIT p_batch_size;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    SELECT last_sync_id INTO v_start_id
    FROM sync_status
    WHERE sync_name = 'tenant_product_configs';

    SELECT COALESCE(MAX(id), v_start_id) INTO v_end_id
    FROM change_log
    WHERE table_name = 'product_configs_old'
      AND id > v_start_id;

    START TRANSACTION;

    BEGIN
        OPEN cur_changes;

        read_loop: LOOP
            FETCH cur_changes INTO v_change_id, v_table_name, v_record_id, v_operation_type, v_old_value, v_new_value, v_retry_count;

            IF v_done THEN
                LEAVE read_loop;
            END IF;

            BEGIN
                UPDATE change_log
                SET sync_status = 'IN_PROGRESS',
                    retry_count = retry_count + 1
                WHERE id = v_change_id;

                CASE v_operation_type
                    WHEN 'INSERT', 'UPDATE' THEN
                        SET v_tenant_id = JSON_EXTRACT(v_new_value, '$.tenant_id');
                        SET v_product_code = JSON_UNQUOTE(JSON_EXTRACT(v_new_value, '$.product_code'));
                        SET v_resource_code = CONCAT('PRODUCT_', UPPER(REPLACE(v_product_code, '-', '_')));

                        INSERT INTO tenant_resource_configs (tenant_id, resource_code, enabled, config, created_at, updated_at)
                        VALUES (
                            v_tenant_id,
                            v_resource_code,
                            JSON_EXTRACT(v_new_value, '$.enabled'),
                            JSON_EXTRACT(v_new_value, '$.config_json'),
                            CURRENT_TIMESTAMP(3),
                            CURRENT_TIMESTAMP(3)
                        )
                        ON DUPLICATE KEY UPDATE
                            enabled = JSON_EXTRACT(v_new_value, '$.enabled'),
                            config = JSON_EXTRACT(v_new_value, '$.config_json'),
                            updated_at = CURRENT_TIMESTAMP(3);

                    WHEN 'DELETE' THEN
                        SET v_tenant_id = JSON_EXTRACT(v_old_value, '$.tenant_id');
                        SET v_product_code = JSON_UNQUOTE(JSON_EXTRACT(v_old_value, '$.product_code'));
                        SET v_resource_code = CONCAT('PRODUCT_', UPPER(REPLACE(v_product_code, '-', '_')));

                        UPDATE tenant_resource_configs
                        SET enabled = FALSE,
                            updated_at = CURRENT_TIMESTAMP(3)
                        WHERE tenant_id = v_tenant_id
                          AND resource_code = v_resource_code;
                END CASE;

                UPDATE change_log
                SET sync_status = 'COMPLETED',
                    processed_at = CURRENT_TIMESTAMP(3)
                WHERE id = v_change_id;

                SET v_processed_count = v_processed_count + 1;

            EXCEPTION
                WHEN OTHERS THEN
                    GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
                    UPDATE change_log
                    SET sync_status = 'FAILED',
                        sync_error = v_error_msg,
                        processed_at = CURRENT_TIMESTAMP(3)
                    WHERE id = v_change_id;
                    SET v_failed_count = v_failed_count + 1;
            END;

        END LOOP;

        CLOSE cur_changes;

        UPDATE sync_status
        SET last_sync_id = v_end_id,
            last_sync_time = CURRENT_TIMESTAMP(3),
            records_synced = records_synced + v_processed_count,
            records_failed = records_failed + v_failed_count
        WHERE sync_name = 'tenant_product_configs';

        COMMIT;

    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RESIGNAL;
    END;

    SELECT v_processed_count AS processed_count, v_failed_count AS failed_count;
END //

DELIMITER ;

-- ============================================================
-- 7. 创建主同步存储过程
-- ============================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS execute_incremental_sync(IN p_batch_size INT DEFAULT 100)
BEGIN
    DECLARE v_start_time TIMESTAMP(3);
    DECLARE v_end_time TIMESTAMP(3);

    SET v_start_time = CURRENT_TIMESTAMP(3);

    -- 依次执行各同步任务
    CALL sync_platform_products_to_resources(p_batch_size);
    CALL sync_tenant_product_configs(p_batch_size);

    SET v_end_time = CURRENT_TIMESTAMP(3);

    SELECT
        'Incremental sync completed' AS sync_result,
        v_start_time AS start_time,
        v_end_time AS end_time,
        TIMESTAMPDIFF(MICROSECOND, v_start_time, v_end_time) / 1000 AS duration_ms;
END //

DELIMITER ;

-- ============================================================
-- 8. 创建同步监控视图
-- ============================================================
CREATE OR REPLACE VIEW sync_monitoring AS
SELECT
    ss.sync_name,
    ss.last_sync_time,
    ss.records_synced,
    ss.records_failed,
    COUNT(CASE WHEN cl.sync_status = 'PENDING' THEN 1 END) AS pending_count,
    COUNT(CASE WHEN cl.sync_status = 'FAILED' AND cl.retry_count >= 3 THEN 1 END) AS failed_count,
    TIMESTAMPDIFF(MINUTE, ss.last_sync_time, NOW()) AS minutes_since_last_sync
FROM sync_status ss
LEFT JOIN change_log cl ON cl.table_name LIKE CONCAT('%', REPLACE(ss.sync_name, '_', '%'), '%')
GROUP BY ss.sync_name, ss.last_sync_time, ss.records_synced, ss.records_failed;

-- ============================================================
-- 使用说明:
-- 1. 此脚本建立基于触发器的变更捕获机制
-- 2. 手动执行同步: CALL execute_incremental_sync(100);
-- 3. 设置定时任务 (MySQL Event Scheduler):
--    CREATE EVENT IF NOT EXISTS evt_incremental_sync
--    ON SCHEDULE EVERY 1 MINUTE
--    DO CALL execute_incremental_sync(100);
-- 4. 查看同步状态: SELECT * FROM sync_monitoring;
-- ============================================================

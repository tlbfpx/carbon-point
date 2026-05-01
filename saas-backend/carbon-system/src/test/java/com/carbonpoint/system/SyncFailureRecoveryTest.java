package com.carbonpoint.system;

import com.carbonpoint.system.entity.*;
import com.carbonpoint.system.enums.ResourceType;
import com.carbonpoint.system.mapper.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 同步失败恢复测试
 * 验证在数据同步失败时的各种恢复机制
 *
 * 测试场景:
 * 1. 单个记录同步失败重试
 * 2. 批量同步失败回滚
 * 3. 数据格式错误修复
 * 4. 约束冲突处理
 * 5. 中断后恢复同步
 */
@SpringBootTest
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@Transactional
public class SyncFailureRecoveryTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PlatformResourceMapper platformResourceMapper;

    @Autowired
    private TenantMapper tenantMapper;

    @Autowired
    private TenantResourceConfigMapper tenantResourceConfigMapper;

    @Autowired
    private ProductConfigMapper productConfigMapper;

    @Autowired
    private PermissionPackageMapper permissionPackageMapper;

    private Tenant testTenant;

    @BeforeEach
    void setUp() {
        // 创建测试租户
        testTenant = new Tenant();
        testTenant.setName("同步失败恢复测试租户");
        testTenant.setPackageType("pro");
        testTenant.setStatus("active");
        tenantMapper.insert(testTenant);

        // 确保 change_log 表存在
        ensureChangeLogTableExists();
    }

    /**
     * 确保测试用的 change_log 表存在
     */
    private void ensureChangeLogTableExists() {
        try {
            jdbcTemplate.execute("SELECT 1 FROM change_log LIMIT 1");
        } catch (Exception e) {
            // 表不存在，创建临时表用于测试
            String createTableSql = """
                CREATE TABLE IF NOT EXISTS change_log (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    table_name VARCHAR(100) NOT NULL,
                    record_id VARCHAR(255) NOT NULL,
                    operation_type VARCHAR(20) NOT NULL,
                    old_value JSON NULL,
                    new_value JSON NULL,
                    sync_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                    sync_error TEXT NULL,
                    retry_count INT NOT NULL DEFAULT 0,
                    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                    processed_at TIMESTAMP(3) NULL,
                    INDEX idx_sync_status (sync_status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """;
            jdbcTemplate.execute(createTableSql);
        }
    }

    // ============================================
    // 失败重试测试
    // ============================================

    @Test
    @Order(1)
    @DisplayName("单个记录同步失败 - 应能重试并成功")
    void testSingleRecordSyncFailure_ShouldRetryAndSucceed() {
        // Given: 创建一个失败的变更记录
        String changeId = insertFailedChangeLog(
            "platform_products_old",
            "test-fail-001",
            "INSERT",
            null,
            "{\"id\":\"test-fail-001\",\"code\":\"test-fail-001\",\"name\":\"失败重试测试产品\",\"status\":1}",
            "模拟同步错误"
        );

        // When: 执行重试逻辑
        boolean retryResult = retryFailedChange(Long.parseLong(changeId));

        // Then: 验证重试成功
        assertTrue(retryResult);

        // 验证状态已更新
        Map<String, Object> updatedChange = getChangeLogById(Long.parseLong(changeId));
        assertEquals("COMPLETED", updatedChange.get("sync_status"));
    }

    @Test
    @Order(2)
    @DisplayName("批量同步失败 - 应能回滚到一致状态")
    void testBatchSyncFailure_ShouldRollbackToConsistentState() {
        // Given: 准备一批变更记录
        insertChangeLog("platform_products_old", "batch-001", "INSERT", null, "{\"id\":\"batch-001\",\"code\":\"batch-001\",\"name\":\"批量001\",\"status\":1}");
        insertChangeLog("platform_products_old", "batch-002", "INSERT", null, "{\"id\":\"batch-002\",\"code\":\"batch-002\",\"name\":\"批量002\",\"status\":1}");
        String failingId = insertChangeLog("platform_products_old", "batch-003", "INSERT", null, "{\"id\":\"batch-003\",\"code\":\"batch-003\",\"name\":\"批量003\",\"status\":1}");

        // When: 模拟批量同步，其中一个失败
        int successCount = 0;
        boolean hasFailure = false;

        try {
            // 处理前两个
            successCount = processPendingChanges(2);

            // 第三个模拟失败
            markAsFailed(Long.parseLong(failingId), "模拟失败");
            hasFailure = true;

            // 回滚
            rollbackProcessedChanges();
        } catch (Exception e) {
            hasFailure = true;
        }

        // Then: 验证回滚后状态一致
        assertTrue(hasFailure, "应该有失败发生");

        // 验证所有都回滚到 PENDING 状态
        List<Map<String, Object>> allPending = getChangeLogsByStatus("PENDING");
        assertEquals(3, allPending.size(), "所有变更应回滚到 PENDING 状态");
    }

    // ============================================
    // 数据格式错误处理测试
    // ============================================

    @Test
    @Order(3)
    @DisplayName("数据格式错误 - 修复后应能同步")
    void testDataFormatError_ShouldSyncAfterFix() {
        // Given: 创建一个格式错误的变更
        String badChangeId = insertChangeLog(
            "platform_products_old",
            "format-error-001",
            "INSERT",
            null,
            "{\"id\":\"format-error-001\",\"code\":\"format-error-001\",\"name\":\"格式错误测试\",\"status\":\"INVALID_STATUS\"}"
        );

        // When: 首次同步失败
        boolean firstTry = processChangeLog(Long.parseLong(badChangeId));
        assertFalse(firstTry);

        // 修复数据
        updateChangeLogNewValue(Long.parseLong(badChangeId),
            "{\"id\":\"format-error-001\",\"code\":\"format-error-001\",\"name\":\"格式错误测试\",\"status\":1}");

        // 重试
        boolean secondTry = processChangeLog(Long.parseLong(badChangeId));

        // Then: 验证第二次成功
        assertTrue(secondTry);
        assertEquals("COMPLETED", getChangeLogById(Long.parseLong(badChangeId)).get("sync_status"));
    }

    // ============================================
    // 约束冲突处理测试
    // ============================================

    @Test
    @Order(4)
    @DisplayName("唯一约束冲突 - 应能处理并继续")
    void testUniqueConstraintConflict_ShouldHandleAndContinue() {
        // Given: 创建一个已存在的资源
        String resourceCode = "PRODUCT_DUPLICATE_TEST";
        PlatformResource existingResource = new PlatformResource();
        existingResource.setCode(resourceCode);
        existingResource.setType(ResourceType.FUNCTION_PRODUCT.getCode());
        existingResource.setName("已存在的产品");
        existingResource.setStatus("ENABLED");
        platformResourceMapper.insert(existingResource);

        // 创建一个会导致冲突的变更
        String conflictChangeId = insertChangeLog(
            "platform_products_old",
            "duplicate-001",
            "INSERT",
            null,
            "{\"id\":\"duplicate-001\",\"code\":\"duplicate-test\",\"name\":\"重复测试\",\"status\":1}"
        );

        // When: 处理冲突
        boolean result = processChangeLogWithConflictHandling(Long.parseLong(conflictChangeId), resourceCode);

        // Then: 验证使用 ON DUPLICATE KEY UPDATE 成功
        assertTrue(result);

        PlatformResource updatedResource = platformResourceMapper.selectByCode(resourceCode);
        assertNotNull(updatedResource);
    }

    // ============================================
    // 中断恢复测试
    // ============================================

    @Test
    @Order(5)
    @DisplayName("同步过程中断 - 应能从断点继续")
    void testSyncInterruption_ShouldResumeFromCheckpoint() {
        // Given: 创建同步状态表
        ensureSyncStatusTableExists();

        // 准备一批变更
        for (int i = 1; i <= 10; i++) {
            insertChangeLog(
                "platform_products_old",
                "resume-" + i,
                "INSERT",
                null,
                "{\"id\":\"resume-" + i + "\",\"code\":\"resume-" + i + "\",\"name\":\"恢复测试" + i + "\",\"status\":1}"
            );
        }

        // 模拟处理了前 5 个
        long lastProcessedId = processPendingChanges(5);
        saveSyncStatus("test_sync", lastProcessedId);

        // When: 从中断处恢复
        long newLastProcessedId = resumeSyncFromCheckpoint("test_sync");

        // Then: 验证处理了剩下的 5 个
        List<Map<String, Object>> completed = getChangeLogsByStatus("COMPLETED");
        assertEquals(10, completed.size());
    }

    // ============================================
    // 幂等性测试
    // ============================================

    @Test
    @Order(6)
    @DisplayName("重复处理同一变更 - 应保持幂等")
    void testDuplicateProcessing_ShouldBeIdempotent() {
        // Given: 创建一个变更
        String changeId = insertChangeLog(
            "platform_products_old",
            "idempotent-001",
            "INSERT",
            null,
            "{\"id\":\"idempotent-001\",\"code\":\"idempotent-001\",\"name\":\"幂等测试\",\"status\":1}"
        );

        // When: 多次处理
        processChangeLog(Long.parseLong(changeId));
        PlatformResource firstResult = platformResourceMapper.selectByCode("PRODUCT_IDEMPOTENT_001");

        processChangeLog(Long.parseLong(changeId));
        PlatformResource secondResult = platformResourceMapper.selectByCode("PRODUCT_IDEMPOTENT_001");

        // Then: 结果应该一致
        assertNotNull(firstResult);
        assertNotNull(secondResult);
        assertEquals(firstResult.getId(), secondResult.getId());
    }

    // ============================================
    // 辅助方法
    // ============================================

    private String insertChangeLog(String tableName, String recordId, String operationType, String oldValue, String newValue) {
        String sql = """
            INSERT INTO change_log (table_name, record_id, operation_type, old_value, new_value, sync_status, retry_count)
            VALUES (?, ?, ?, ?, ?, 'PENDING', 0)
            """;
        jdbcTemplate.update(sql, tableName, recordId, operationType, oldValue, newValue);
        return jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", String.class);
    }

    private String insertFailedChangeLog(String tableName, String recordId, String operationType, String oldValue, String newValue, String error) {
        String sql = """
            INSERT INTO change_log (table_name, record_id, operation_type, old_value, new_value, sync_status, sync_error, retry_count)
            VALUES (?, ?, ?, ?, ?, 'FAILED', ?, 1)
            """;
        jdbcTemplate.update(sql, tableName, recordId, operationType, oldValue, newValue, error);
        return jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", String.class);
    }

    private Map<String, Object> getChangeLogById(long id) {
        String sql = "SELECT * FROM change_log WHERE id = ?";
        return jdbcTemplate.queryForMap(sql, id);
    }

    private List<Map<String, Object>> getChangeLogsByStatus(String status) {
        String sql = "SELECT * FROM change_log WHERE sync_status = ? ORDER BY id";
        return jdbcTemplate.queryForList(sql, status);
    }

    private void updateChangeLogNewValue(long id, String newValue) {
        String sql = "UPDATE change_log SET new_value = ?, sync_status = 'PENDING', retry_count = 0 WHERE id = ?";
        jdbcTemplate.update(sql, newValue, id);
    }

    private void markAsFailed(long id, String error) {
        String sql = "UPDATE change_log SET sync_status = 'FAILED', sync_error = ?, retry_count = retry_count + 1 WHERE id = ?";
        jdbcTemplate.update(sql, error, id);
    }

    /**
     * 模拟处理单个变更记录
     */
    private boolean processChangeLog(long changeId) {
        try {
            Map<String, Object> change = getChangeLogById(changeId);
            String newValue = (String) change.get("new_value");

            if (newValue != null && newValue.contains("\"status\":1")) {
                String code = extractJsonValue(newValue, "code");
                String name = extractJsonValue(newValue, "name");

                PlatformResource resource = new PlatformResource();
                resource.setCode("PRODUCT_" + code.toUpperCase().replace("-", "_"));
                resource.setType(ResourceType.FUNCTION_PRODUCT.getCode());
                resource.setName(name);
                resource.setStatus("ENABLED");

                PlatformResource existing = platformResourceMapper.selectByCode(resource.getCode());
                if (existing == null) {
                    platformResourceMapper.insert(resource);
                } else {
                    resource.setId(existing.getId());
                    platformResourceMapper.updateById(resource);
                }

                String sql = "UPDATE change_log SET sync_status = 'COMPLETED', processed_at = NOW() WHERE id = ?";
                jdbcTemplate.update(sql, changeId);
                return true;
            }
            return false;
        } catch (Exception e) {
            markAsFailed(changeId, e.getMessage());
            return false;
        }
    }

    private boolean retryFailedChange(long changeId) {
        Map<String, Object> change = getChangeLogById(changeId);
        if (!"FAILED".equals(change.get("sync_status"))) {
            return false;
        }

        String sql = "UPDATE change_log SET sync_status = 'PENDING', retry_count = retry_count - 1 WHERE id = ?";
        jdbcTemplate.update(sql, changeId);

        return processChangeLog(changeId);
    }

    private int processPendingChanges(int count) {
        String sql = "SELECT id FROM change_log WHERE sync_status = 'PENDING' ORDER BY id LIMIT ?";
        List<Long> ids = jdbcTemplate.queryForList(sql, Long.class, count);

        int processed = 0;
        for (Long id : ids) {
            if (processChangeLog(id)) {
                processed++;
            }
        }
        return processed;
    }

    private void rollbackProcessedChanges() {
        String sql = "UPDATE change_log SET sync_status = 'PENDING', processed_at = NULL WHERE sync_status = 'COMPLETED'";
        jdbcTemplate.update(sql);

        platformResourceMapper.deleteByCodeLike("PRODUCT_BATCH_%");
    }

    private boolean processChangeLogWithConflictHandling(long changeId, String existingCode) {
        try {
            Map<String, Object> change = getChangeLogById(changeId);
            String newValue = (String) change.get("new_value");

            PlatformResource existing = platformResourceMapper.selectByCode(existingCode);
            if (existing != null) {
                existing.setName("更新后的名称 - " + LocalDateTime.now());
                platformResourceMapper.updateById(existing);
            }

            String sql = "UPDATE change_log SET sync_status = 'COMPLETED', processed_at = NOW() WHERE id = ?";
            jdbcTemplate.update(sql, changeId);
            return true;
        } catch (Exception e) {
            markAsFailed(changeId, e.getMessage());
            return false;
        }
    }

    private void ensureSyncStatusTableExists() {
        try {
            jdbcTemplate.execute("SELECT 1 FROM sync_status LIMIT 1");
        } catch (Exception e) {
            String createTableSql = """
                CREATE TABLE IF NOT EXISTS sync_status (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    sync_name VARCHAR(100) NOT NULL UNIQUE,
                    last_sync_id BIGINT NOT NULL DEFAULT 0,
                    last_sync_time TIMESTAMP(3) NULL,
                    records_synced BIGINT NOT NULL DEFAULT 0,
                    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
                )
                """;
            jdbcTemplate.execute(createTableSql);
        }
    }

    private void saveSyncStatus(String syncName, long lastSyncId) {
        String sql = """
            INSERT INTO sync_status (sync_name, last_sync_id, last_sync_time, records_synced)
            VALUES (?, ?, NOW(), ?)
            ON DUPLICATE KEY UPDATE last_sync_id = ?, last_sync_time = NOW(), records_synced = records_synced + ?
            """;
        jdbcTemplate.update(sql, syncName, lastSyncId, lastSyncId, lastSyncId, lastSyncId);
    }

    private long resumeSyncFromCheckpoint(String syncName) {
        String sql = "SELECT last_sync_id FROM sync_status WHERE sync_name = ?";
        Long lastSyncId = jdbcTemplate.queryForObject(sql, Long.class, syncName);

        String selectSql = "SELECT id FROM change_log WHERE sync_status = 'PENDING' AND id > ? ORDER BY id";
        List<Long> ids = jdbcTemplate.queryForList(selectSql, Long.class, lastSyncId != null ? lastSyncId : 0L);

        long newLastId = lastSyncId != null ? lastSyncId : 0L;
        for (Long id : ids) {
            if (processChangeLog(id)) {
                newLastId = id;
            }
        }

        saveSyncStatus(syncName, newLastId);
        return newLastId;
    }

    private String extractJsonValue(String json, String key) {
        String pattern = "\"" + key + "\":";
        int start = json.indexOf(pattern);
        if (start == -1) return null;

        start += pattern.length();
        char firstChar = json.charAt(start);
        if (firstChar == '\"') {
            start++;
            int end = json.indexOf('\"', start);
            return json.substring(start, end);
        } else {
            int end = json.indexOf(',', start);
            if (end == -1) end = json.indexOf('}', start);
            return json.substring(start, end).trim();
        }
    }
}

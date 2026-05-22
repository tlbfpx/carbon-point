# Carbon Point 数据同步监控与告警计划

## 概述

本文档定义了 Carbon Point 平台从旧架构向新统一资源架构迁移过程中的数据同步监控与告警机制。

## 监控指标

### 1. 迁移进度监控

| 指标名称 | 描述 | 采集方式 | 告警阈值 |
|---------|------|---------|---------|
| `migration_status` | 各迁移步骤状态 | `migration_control` 表 | 任何步骤为 'FAILED' |
| `migration_duration` | 迁移步骤耗时 | 计算 `started_at` 到 `completed_at` | 单步超过 30 分钟 |
| `records_processed` | 已处理记录数 | `migration_control` 表 | 与预期数量偏差 > 10% |

### 2. 增量同步监控

| 指标名称 | 描述 | 采集方式 | 告警阈值 |
|---------|------|---------|---------|
| `pending_changes` | 待同步变更数 | `change_log` 表 `sync_status='PENDING'` | > 1000 条或超过 5 分钟未处理 |
| `failed_changes` | 同步失败变更数 | `change_log` 表 `sync_status='FAILED'` | > 0 条且重试 >= 3 次 |
| `sync_lag` | 同步延迟时间 | 最新变更的 `created_at` 到现在 | > 5 分钟 |
| `sync_throughput` | 同步吞吐量 | 每分钟处理记录数 | < 10 条/分钟持续 5 分钟 |

### 3. 数据一致性监控

| 指标名称 | 描述 | 采集方式 | 告警阈值 |
|---------|------|---------|---------|
| `resource_mismatch` | 资源记录不匹配 | 新旧表对比查询 | > 0 条 |
| `config_mismatch` | 配置不一致 | 新旧表对比查询 | > 0 条 |
| `menu_mismatch` | 菜单结构不一致 | 新旧 API 对比 | 菜单项差异 > 0 |

### 4. 性能监控

| 指标名称 | 描述 | 采集方式 | 告警阈值 |
|---------|------|---------|---------|
| `sync_api_latency` | 同步 API 延迟 | 性能基准测试 | P95 > 5 秒 |
| `menu_api_latency` | 菜单 API 延迟 | 性能基准测试 | P95 > 2 秒 |
| `db_connection_pool` | 数据库连接池使用率 | JMX / Spring Actuator | > 80% |

## 告警机制

### 告警级别

| 级别 | 描述 | 响应时间 | 通知方式 |
|------|------|---------|---------|
| **CRITICAL** | 严重故障，影响业务 | 立即响应 (< 15 分钟) | 电话 + 短信 + 邮件 |
| **WARNING** | 潜在问题，需要关注 | 2 小时内响应 | 邮件 + 企业微信 |
| **INFO** | 信息通知 | 每日汇总 | 邮件 |

### 告警规则

#### 1. 迁移阶段告警

```yaml
# 迁移失败告警
- name: MigrationFailed
  condition: migration_control.status = 'FAILED'
  level: CRITICAL
  message: "迁移步骤 {{migration_name}} 失败: {{error_message}}"

# 迁移超时告警
- name: MigrationTimeout
  condition: migration_control.status = 'IN_PROGRESS' AND TIMESTAMPDIFF(MINUTE, started_at, NOW()) > 30
  level: WARNING
  message: "迁移步骤 {{migration_name}} 执行时间超过 30 分钟"

# 数据量不匹配告警
- name: RecordCountMismatch
  condition: 实际记录数与预期偏差 > 10%
  level: WARNING
  message: "表 {{table_name}} 记录数偏差超过 10%"
```

#### 2. 同步阶段告警

```yaml
# 待同步队列积压告警
- name: PendingQueueBacklog
  condition: pending_changes > 1000 OR (pending_changes > 0 AND minutes_since_last_sync > 5)
  level: WARNING
  message: "待同步队列积压: {{pending_changes}} 条，最后同步: {{minutes_since_last_sync}} 分钟前"

# 同步失败告警
- name: SyncFailed
  condition: failed_changes > 0
  level: CRITICAL
  message: "有 {{failed_changes}} 条同步失败记录需要人工处理"

# 同步延迟告警
- name: SyncLagHigh
  condition: sync_lag > 300  # 5 分钟
  level: WARNING
  message: "同步延迟 {{sync_lag}} 秒，超过阈值 5 分钟"
```

#### 3. 数据一致性告警

```yaml
# 资源不匹配告警
- name: ResourceMismatch
  condition: resource_mismatch > 0
  level: CRITICAL
  message: "发现 {{resource_mismatch}} 条资源记录不一致"

# 配置不一致告警
- name: ConfigMismatch
  condition: config_mismatch > 0
  level: WARNING
  message: "发现 {{config_mismatch}} 条配置不一致"
```

### 告警通知渠道

1. **企业微信/钉钉**: 实时告警推送
2. **邮件**: 详细告警信息 + 日志链接
3. **短信/电话**: CRITICAL 级别告警
4. **监控大屏**: 实时状态展示

## 监控工具与实现

### 1. 数据库监控查询

#### 迁移状态查询
```sql
-- 查看迁移进度
SELECT * FROM migration_validation;

-- 查看迁移统计
SELECT
    SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_steps,
    SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed_steps,
    SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress_steps,
    SUM(records_processed) AS total_records_processed
FROM migration_control;
```

#### 同步状态查询
```sql
-- 查看同步监控
SELECT * FROM sync_monitoring;

-- 查看失败的变更
SELECT * FROM change_log
WHERE sync_status = 'FAILED' AND retry_count >= 3
ORDER BY created_at DESC;

-- 查看待同步队列
SELECT table_name, COUNT(*) AS pending_count
FROM change_log
WHERE sync_status = 'PENDING'
GROUP BY table_name;
```

#### 数据一致性检查
```sql
-- 检查平台资源一致性
SELECT
    (SELECT COUNT(*) FROM platform_products_old) AS old_count,
    (SELECT COUNT(*) FROM platform_resources WHERE type = 'FUNCTION_PRODUCT') AS new_count,
    (SELECT COUNT(*) FROM platform_products_old p
     LEFT JOIN platform_resources r ON r.code = CONCAT('PRODUCT_', UPPER(REPLACE(p.code, '-', '_')))
     WHERE r.id IS NULL) AS missing_in_new;

-- 检查租户资源配置一致性
SELECT
    t.id AS tenant_id,
    t.name AS tenant_name,
    COUNT(DISTINCT pc.id) AS old_config_count,
    COUNT(DISTINCT trc.id) AS new_config_count
FROM tenants t
LEFT JOIN product_configs_old pc ON t.id = pc.tenant_id
LEFT JOIN tenant_resource_configs trc ON t.id = trc.tenant_id
GROUP BY t.id, t.name
HAVING old_config_count != new_config_count;
```

### 2. Prometheus 指标暴露

通过 Spring Actuator 暴露自定义指标:

```java
// Gauge: 待同步变更数
Gauge.builder("sync.pending.changes", () -> {
    // 从数据库查询 pending_changes
    return jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM change_log WHERE sync_status = 'PENDING'",
        Integer.class
    );
}).register(registry);

// Gauge: 同步失败数
Gauge.builder("sync.failed.changes", () -> {
    return jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM change_log WHERE sync_status = 'FAILED' AND retry_count >= 3",
        Integer.class
    );
}).register(registry);

// Timer: 同步任务耗时
Timer.builder("sync.task.duration")
    .tag("task", "incremental_sync")
    .register(registry);
```

### 3. Grafana 监控面板

#### 面板结构:

1. **总览面板**
   - 迁移/同步状态概览
   - 关键指标趋势图
   - 告警列表

2. **迁移进度面板**
   - 各迁移步骤状态
   - 处理记录数趋势
   - 迁移耗时统计

3. **同步监控面板**
   - 待同步队列深度
   - 同步吞吐量
   - 同步延迟趋势
   - 失败记录列表

4. **数据一致性面板**
   - 新旧表记录数对比
   - 一致性检查结果
   - 菜单 API 一致性

5. **性能面板**
   - API 响应时间分布
   - 数据库连接池使用
   - 慢查询统计

### 4. 告警规则配置 (Prometheus Alertmanager)

```yaml
groups:
  - name: carbon_point_sync_alerts
    interval: 30s
    rules:
      # 同步失败告警
      - alert: SyncFailedAlert
        expr: sync_failed_changes > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "数据同步失败"
          description: "有 {{ $value }} 条同步失败记录需要处理"

      # 待同步队列积压告警
      - alert: PendingQueueBacklogAlert
        expr: sync_pending_changes > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "待同步队列积压"
          description: "待同步队列当前有 {{ $value }} 条记录"

      # 同步延迟告警
      - alert: SyncLagAlert
        expr: sync_lag_seconds > 300
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "同步延迟过高"
          description: "同步延迟 {{ $value }} 秒，超过阈值 5 分钟"

      # API 延迟告警
      - alert: ApiLatencyAlert
        expr: histogram_quantile(0.95, rate(sync_api_duration_seconds_bucket[5m])) > 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "API 响应时间过高"
          description: "P95 响应时间 {{ $value }} 秒，超过阈值 5 秒"
```

## 应急响应流程

### 1. 同步失败处理流程

```
检测到同步失败
    ↓
查看 change_log 表获取错误详情
    ↓
分析失败原因:
  - 数据格式问题 → 修复数据后重入队
  - 约束冲突 → 调整目标表结构或数据
  - 系统错误 → 恢复系统后重试
    ↓
手动重试:
  - 重置 retry_count = 0
  - 重置 sync_status = 'PENDING'
  - 或 CALL execute_incremental_sync()
    ↓
验证同步结果
    ↓
记录处理过程
```

### 2. 数据不一致处理流程

```
发现数据不一致
    ↓
锁定相关表，暂停写入 (如必要)
    ↓
对比新旧表数据，定位差异
    ↓
分析原因:
  - 同步漏处理 → 补同步
  - 数据转换错误 → 修复转换逻辑后重跑
  - 并发写入冲突 → 使用分布式锁
    ↓
执行数据修复:
  - 批量修复脚本
  - 或回滚到一致状态
    ↓
验证一致性
    ↓
恢复正常同步
```

### 3. 性能问题处理流程

```
检测到性能下降
    ↓
查看慢查询日志
    ↓
分析瓶颈:
  - 数据库锁等待 → 优化事务
  - 索引缺失 → 添加索引
  - 批量过大 → 调小批次
    ↓
实施优化
    ↓
验证性能恢复
    ↓
持续监控
```

## 健康检查

### 每日健康检查清单

- [ ] 迁移/同步状态正常，无失败
- [ ] 待同步队列在合理范围内
- [ ] 数据一致性检查通过
- [ ] API 响应时间正常
- [ ] 数据库连接池充足
- [ ] 无新的告警产生

### 一致性检查脚本

见 `consistency_checks.sql` (需单独创建)

## 联络人

| 角色 | 姓名 | 联系方式 | 职责 |
|------|------|---------|------|
| 技术负责人 | - | - | 重大决策、资源协调 |
| DBA | - | - | 数据库问题处理 |
| 后端开发 | - | - | 同步逻辑问题 |
| 运维 | - | - | 监控系统维护 |

## 附录

### A. 相关 SQL 文件

- `V2__unified_resource_architecture.sql` - 新架构 DDL
- `V2.1__data_migration.sql` - 基础数据迁移
- `bulk_migration.sql` - 批量迁移脚本
- `incremental_sync.sql` - 增量同步脚本
- `rollback_scripts.sql` - 回滚脚本

### B. 相关测试文件

- `DualWriteConsistencyTest.java` - 双写一致性测试
- `SyncFailureRecoveryTest.java` - 同步失败恢复测试
- `PerformanceBenchmarkTest.java` - 性能基准测试

### C. 版本历史

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|---------|
| 1.0 | 2026-04-30 | - | 初始版本 |

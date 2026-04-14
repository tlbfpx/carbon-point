## ADDED Requirements

### Requirement: 按时段打卡
用户 SHALL 能够在当前时间所属的时段内进行打卡操作，打卡成功后获得随机积分。每个时段每天只能打卡一次。

**时段约束：**
- 时段**不支持跨日**，开始时间必须严格早于结束时间（如 07:00-09:00 合法，22:00-06:00 不合法）
- 打卡日期归属：以**服务器时间的日期部分**为准（如 22:30 打卡归属当天日期）
- 前端创建/编辑时段规则时需校验 startTime < endTime

#### Scenario: 成功打卡
- **WHEN** 用户在早间时段（06:00-09:00）内点击打卡按钮
- **THEN** 系统在 15~20 范围内随机生成基础积分，记录打卡，展示打卡成功动画和获得积分数
- **积分计算**：基础积分经 point-engine 规则链计算（时段匹配 → 随机基数 → 特殊日期倍率 → 等级系数 → 四舍五入 → 每日上限 → 连续奖励），最终积分为整数

#### Scenario: 不在打卡时段
- **WHEN** 用户在没有任何配置时段覆盖的时间（如 10:00）点击打卡
- **THEN** 系统提示"当前不在打卡时段内"，展示下一个可打卡时段的开始时间

#### Scenario: 重复打卡
- **WHEN** 用户在同一时段内尝试第二次打卡
- **THEN** 系统提示"今日该时段已打卡"，展示已获得的积分数

### Requirement: 打卡防并发
系统 SHALL 防止用户通过并发请求在同一时段重复打卡。使用数据库唯一索引（user_id + 打卡日期 + 时段规则 ID）+ Redis 分布式锁双重保障。

#### Scenario: 并发打卡请求
- **WHEN** 用户在 100ms 内连续发送 3 次打卡请求
- **THEN** 系统仅处理第一次请求成功打卡，后两次请求返回"已打卡"

#### Data Model: 打卡记录 (CheckInRecord)
```yaml
checkin_time:
  type: DATETIME(3)  # 精确到毫秒
  description: 用户实际打卡时间，用于排行榜精确排序

# 其他字段
id:
  type: BIGINT
  primaryKey: true
  autoIncrement: true
user_id:
  type: BIGINT
  notNull: true
  comment: 打卡用户ID
tenant_id:
  type: BIGINT
  notNull: true
  comment: 租户ID
date:
  type: DATE
  notNull: true
  comment: 打卡日期（Asia/Shanghai 时区）
time_slot_rule_id:
  type: BIGINT
  notNull: true
  comment: 命中的时段规则ID
base_points:
  type: INT
  comment: 随机基础积分
multiplier:
  type: DECIMAL(4,2)
  comment: 积分倍率（特殊日期倍率 × 等级系数）
final_points:
  type: INT
  comment: 最终积分（四舍五入取整后）
consecutive_bonus:
  type: INT
  default: 0
  comment: 连续打卡奖励积分
consecutive_days:
  type: INT
  default: 0
  comment: 连续打卡天数（当日打卡后更新）
special_date:
  type: VARCHAR(50)
  nullable: true
  comment: 特殊日期类型（NEW_YEAR, SPRING_FESTIVAL 等）
created_at:
  type: DATETIME
  default: CURRENT_TIMESTAMP
```

**唯一索引：**
```sql
UNIQUE INDEX idx_user_date_slot (user_id, date, time_slot_rule_id)
```

#### Data Model: Redis 分布式锁规格
```yaml
lock_key_format: "lock:checkin:{userId}:{date}:{timeSlotRuleId}"
TTL: 10 秒
retry_attempts: 2 次
retry_interval: 100ms
acquisition_failure: 降级到 DB 唯一索引路径（路径2）
```

#### Concurrency Processing Paths

**路径1（Redis 锁成功）：**
```
1. 尝试获取 Redis 分布式锁（key = lock:checkin:{userId}:{date}:{timeSlotRuleId}，TTL=10s，重试2次/间隔100ms）
2. 获取成功后，检查 DB 唯一索引确认当日该时段是否已打卡
3. 若未打卡，写入打卡记录
4. 释放 Redis 锁
5. 返回打卡结果
```

**路径2（Redis 锁失败，降级）：**
```
1. 未获取到 Redis 锁，直接操作 DB
2. 检查 DB 唯一索引：若已存在，返回"已打卡"
3. 若不存在，尝试写入打卡记录
   - 写入成功：返回打卡结果
   - 唯一索引冲突（并发写入）：捕获异常，返回"已打卡"
```

#### DB Unique Index Conflict Handling
- **唯一索引冲突处理策略**：打卡记录幂等写入
  - 当并发写入导致唯一索引冲突时，捕获 `DuplicateKeyException` 或等效数据库异常
  - 直接返回"今日该时段已打卡"（HTTP 200，code=重复打卡），而非抛出错误
  - 打卡记录本身已写入（幂等），不重复计数

#### Timezone Definition
- **打卡日期归属**：所有打卡日期计算统一使用 `Asia/Shanghai`（UTC+8）时区
- **跨日时段处理**（如 22:00-06:00）：
  - 以打卡**请求接收时间**（服务器收到请求的时间）对应的 Asia/Shanghai 日期作为打卡日期
  - 不以前端展示日期或客户端本地时间为准
  - 示例：用户在 2026-04-13 00:30（UTC+8）打卡，请求接收时间属于 2026-04-13，归入 4/13 的 22:00-06:00 时段

### Requirement: 打卡记录查询
用户 SHALL 能够查看自己的打卡历史记录，包含打卡时间、获得积分、命中规则、加成详情。企业管理员能够查看本企业所有用户的打卡记录。

#### Scenario: 用户查看打卡历史
- **WHEN** 用户进入积分明细页面
- **THEN** 系统展示打卡记录列表，每条记录字段定义如下（见 `h5-user-app/spec.md` 引用）：
  | 字段 | 类型 | 说明 |
  | 时间 | DATETIME | 打卡/变动时间 |
  | 类型 | ENUM | 打卡获得/连续奖励/手动发放/兑换消耗/过期 |
  | 来源 | VARCHAR | 早晨时段 06:00-09:00 / 连续7天奖励 等 |
  | 积分 | INT | 正负数 |
  | 余额 | BIGINT | 变动后余额 |

### Requirement: 打卡结果展示
打卡成功后 SHALL 展示动画效果，包含：随机积分滚动动画、获得的积分数、是否有加成（特殊日期/等级系数）、是否触发连续打卡奖励。

#### Scenario: 触发连续打卡奖励的展示
- **WHEN** 用户打卡且触发连续 7 天打卡奖励
- **THEN** 打卡结果页展示基础积分 + 连续奖励积分，并有额外的庆祝动画提示

## ADDED Requirements

### Requirement: 积分账户管理
系统 SHALL 为每个用户维护积分账户，包含累计积分（total_points）、可用积分（available_points）和冻结积分（frozen_points）。三者关系为：**available_points = total_points - frozen_points**。所有积分变动必须通过 point_transactions 流水记录。

#### Scenario: 打卡获得积分
- **WHEN** 用户打卡获得 18 积分
- **THEN** 系统增加 total_points 18，增加 available_points 18，写入一条 type=check_in 的流水记录

#### Scenario: 冻结积分（兑换下单 pending）
- **WHEN** 用户发起兑换商品，消耗 200 积分
- **THEN** 系统减少 available_points 200，增加 frozen_points 200，写入一条 type=frozen 的流水记录（amount=-200，from_status=available，to_status=frozen）

#### Scenario: 扣除冻结积分（兑换成功 fulfilled）
- **WHEN** 兑换订单商品发放成功，订单状态变为 fulfilled
- **THEN** 系统减少 frozen_points 200（不减 available_points），写入一条 type=exchange 的流水记录（amount=-200）

#### Scenario: 解冻积分（兑换取消或超时）
- **WHEN** 兑换订单被取消（cancelled）或超时（expired）
- **THEN** 系统减少 frozen_points，恢复 available_points，写入一条 type=unfrozen 的流水记录（amount=+200，from_status=frozen，to_status=available）

#### Scenario: 兑换消耗积分（积分不足）
- **WHEN** 用户兑换价值 200 积分的商品，但 available_points 仅 100
- **THEN** 系统拒绝操作，提示"可用积分不足"（available_points < 兑换所需积分）

### Requirement: 积分流水查询
用户和管理员 SHALL 能够查询积分变动流水。用户只能查自己的，管理员可查本企业所有用户的。

#### Scenario: 用户查询积分流水
- **WHEN** 用户打开积分明细页面
- **THEN** 系统展示流水列表，每条包含变动类型、变动金额、变动后余额、时间、备注

#### Scenario: 管理员按用户查询
- **WHEN** 企业管理员搜索某用户的积分流水
- **THEN** 系统返回该用户的所有积分变动记录

### Requirement: 手动积分发放
具有 point:add 权限的企业管理员 SHALL 能够手动为用户发放积分，需填写发放数量和备注说明。

#### Scenario: 手动发放积分
- **WHEN** 管理员为用户张三手动发放 100 积分，备注"线下活动奖励"
- **THEN** 系统增加张三的 available_points 100，写入 type=manual_add 流水，记录操作人和备注

### Requirement: 手动积分扣减
具有 point:deduct 权限的企业管理员 SHALL 能够手动扣减用户积分，需填写扣减数量和备注说明。扣减后可用积分不可为负。

#### Scenario: 手动扣减积分
- **WHEN** 管理员扣减张三 50 积分，备注"违规扣除"
- **THEN** 系统减少张三的 available_points 50，写入 type=manual_deduct 流水

#### Scenario: 扣减超过余额
- **WHEN** 管理员扣减张三 200 积分，但张三 available_points 仅 150（即使 frozen_points 有余额）
- **THEN** 系统拒绝操作，提示"可用积分不足，当前可用余额 150"（冻结中的积分不可用于手动扣减）

### Requirement: 积分统计
系统 SHALL 提供用户积分统计：累计获得、累计消耗、可用余额、本月获得、排名。

#### Scenario: 查看积分统计
- **WHEN** 用户查看积分页面
- **THEN** 系统展示累计获得积分、可用积分、本月获得积分、当前排名

### Requirement: 积分扣减乐观锁
系统 SHALL 通过乐观锁机制保证并发扣减积分时数据一致性，防止 available_points 与 frozen_points / total_points 之间出现不一致。所有积分扣减场景（兑换消耗、手动扣减）均适用。

#### Scenario: 并发扣减积分 — 乐观锁生效
- **GIVEN** users 表有 `version` 字段（BIGINT，默认 0），用户 A 当前 available_points = 100，version = 5
- **WHEN** 线程 T1 和 T2 同时发起扣减，各需扣减 60 积分
- **THEN** T1 执行 `UPDATE users SET available_points = available_points - 60, version = version + 1 WHERE id = ? AND available_points >= 60 AND version = 5`，affected_rows = 1，available_points 变为 40，version 变为 6；T2 同样条件执行时 version 已为 6，affected_rows = 0，触发乐观锁冲突处理

#### Scenario: 乐观锁冲突 — 重试成功
- **WHEN** 扣减时 affected_rows = 0（余额不足或版本冲突）
- **THEN** 系统随机等待 100~200ms 后重试，最多重试 3 次；重试期间若另一事务已修改数据（version 变化），使用最新 version 重试
- **AND** 3 次重试后仍失败，抛出 `ServiceUnavailableException`

#### Scenario: 余额不足拒绝扣减
- **WHEN** 扣减时 available_points < 所需扣减数量
- **THEN** affected_rows = 0，返回"可用积分不足"错误，不重试

### Requirement: 数据库层积分非负约束
系统 SHALL 在数据库层保证 available_points 不可能为负数。

#### Scenario: DDL 层 CHECK 约束
- **GIVEN** users 表 available_points 列定义
- **WHEN** 建表或变更时
- **THEN** 添加 `CHECK (available_points >= 0)` 约束，或使用 `INT UNSIGNED` 类型，使负值写入直接被数据库拒绝

### Requirement: balance_after 一致性保证
积分变动流水中的 balance_after 字段 SHALL 与积分扣减操作在同一事务内原子更新，保证账务一致。

#### Scenario: 原子更新 balance_after
- **WHEN** 积分扣减事务提交时
- **THEN** point_transactions.balance_after = 扣减后 users.available_points，两者在同一数据库事务中同时成功或同时回滚

#### Scenario: 同一事务内双重写入
- **WHEN** 乐观锁扣减 SQL 执行成功后
- **THEN** 在同一事务中插入 point_transactions 记录，balance_after 取自 UPDATE 后的 available_points 值；若事务回滚则 balance_after 不落库

### Requirement: 积分过期策略
系统 SHALL 为租户提供可配置的积分过期机制，防止积分无限累积形成平台负债。

#### 过期规则配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 过期周期 | 12 个月 | 从最后活跃日期（打卡/积分变动）起算 |
| 提前通知 | 30 天 | 系统发送过期预警通知 |
| 手动延期 | 1 次 | 用户可申请一次延期机会 |
| 延期时长 | 3 个月 | 延期后重新计算周期 |

**租户可配置项：**
- 积分过期周期（6/12/24 个月）
- 提前通知天数（7/14/30 天）
- 是否启用手动延期功能
- 过期积分处理方式（没收 vs 捐赠）

#### Scenario: 积分过期检查
- **WHEN** 系统每日凌晨执行过期检查任务
- **THEN** 对最后活跃日期超过过期周期的用户，将其过期积分从可用余额中扣除
- **AND** 写入 type=expired 的 point_transactions 流水记录
- **AND** 用户收到过期通知

#### Scenario: 手动延期
- **WHEN** 用户在个人中心申请积分延期
- **THEN** 系统检查该用户是否已使用过延期机会
- **AND** 若未使用过，将积分有效期延长 3 个月
- **AND** 记录延期信息，用户不可再次申请

#### Scenario: 过期积分捐赠
- **WHEN** 租户开启了积分捐赠功能，且有用户积分过期
- **THEN** 过期积分转入平台公益账户，而非直接清零
- **AND** 用户收到捐赠通知

### Requirement: 积分过期定时任务
系统 SHALL 运行定时任务处理积分过期。

#### Scenario: 每日过期检查
- **WHEN** 定时任务每日执行
- **THEN** 查询所有用户的最后活跃日期
- **AND** 对超过过期周期的积分执行扣除操作
- **AND** 每条扣除写入 point_transactions 流水，type=expired

#### Scenario: 提前过期通知
- **WHEN** 定时任务执行时
- **THEN** 对即将在通知天数内过期的用户发送预警通知

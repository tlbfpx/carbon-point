## ADDED Requirements

### Requirement: 爬楼积分产品迁移
系统 SHALL 将现有 carbon-checkin 模块的打卡逻辑迁移到新的 carbon-stair 模块，实现 ProductModule 接口。迁移后功能行为保持不变。

#### Scenario: 爬楼积分产品结构
- **WHEN** 系统注册爬楼积分产品
- **THEN** 产品编码为 "stair_climbing"，触发器类型为 CheckInTrigger，规则链为 [TimeSlotMatch → RandomBase → SpecialDateMultiplier → LevelCoefficient → Round → DailyCap]，功能点包含 TimeSlotConfig（必选）、SpecialDate（可选）、WeeklyGift（可选）、ConsecutiveReward（可选）、PointsExchange（必选）

### Requirement: 打卡触发器实现
CheckInTrigger SHALL 封装用户打卡行为，产出触发上下文供规则链处理。

#### Scenario: 用户打卡触发
- **WHEN** 用户在有效时段内点击打卡按钮
- **THEN** CheckInTrigger 产出触发上下文，包含用户 ID、打卡时间、租户的时段规则配置

#### Scenario: 非时段内打卡
- **WHEN** 用户在非有效时段点击打卡
- **THEN** CheckInTrigger 返回失败，提示当前时段不可打卡

### Requirement: 规则链积木化重构
爬楼积分的规则链 SHALL 使用积木组件库中的标准 RuleNode 实现，每个节点独立可测试。

#### Scenario: 时段匹配节点（TimeSlotMatch）
- **WHEN** 规则链执行到 TimeSlotMatch 节点
- **THEN** 节点匹配打卡时间是否在有效时段内，匹配则透传，不匹配则返回 0

#### Scenario: 随机基数节点（RandomBase）
- **WHEN** 规则链执行到 RandomBase 节点
- **THEN** 节点在配置范围内生成随机基数积分

#### Scenario: 特殊日期倍率节点（SpecialDateMultiplier）
- **WHEN** 规则链执行到 SpecialDateMultiplier 节点，当天配置为特殊日期（倍率 2x）
- **THEN** 积分值乘以 2

#### Scenario: 等级系数节点（LevelCoefficient）
- **WHEN** 规则链执行到 LevelCoefficient 节点，用户等级为 Lv.3 Gold（系数 1.2）
- **THEN** 积分值乘以 1.2

#### Scenario: 四舍五入节点（Round）
- **WHEN** 规则链执行到 Round 节点
- **THEN** 积分值向下取整（floor）

#### Scenario: 每日上限节点（DailyCap）
- **WHEN** 规则链执行到 DailyCap 节点，用户今日已获得 150 积分，每日上限为 200，本次计算 80 积分
- **THEN** 节点返回 min(80, 200 - 150) = 50 积分

### Requirement: 积分事件产出
爬楼产品完成规则链计算后 SHALL 通过 PointsEventBus 发出标准积分事件。

#### Scenario: 打卡成功发出积分事件
- **WHEN** 规则链计算出最终积分值为 18
- **THEN** 系统通过 PointsEventBus 发出 PointsEvent，productCode = "stair_climbing"，sourceType = "check_in"，points = 18

#### Scenario: 连续打卡奖励事件
- **WHEN** 功能点 ConsecutiveReward 检测到用户连续打卡 7 天，发放 200 额外积分
- **THEN** 系统通过 PointsEventBus 发出 PointsEvent，productCode = "stair_climbing"，sourceType = "consecutive_bonus"，points = 200

### Requirement: 模块迁移兼容性
carbon-checkin 到 carbon-stair 的迁移 SHALL 保持所有现有打卡 API 路径和行为不变，确保前端无需修改。

#### Scenario: API 路径不变
- **WHEN** 前端调用 POST /api/checkin 接口
- **THEN** 请求路由到 carbon-stair 模块的控制器，行为与迁移前一致

#### Scenario: 数据库表无变化
- **WHEN** 迁移完成后
- **THEN** checkin_records 表结构不变，历史数据完整保留

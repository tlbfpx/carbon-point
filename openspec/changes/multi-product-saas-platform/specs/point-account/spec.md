## ADDED Requirements

### Requirement: 积分流水增加产品来源维度
积分流水表（points_ledger）SHALL 增加 product_code 和 source_type 字段，记录积分的来源产品和来源类型。

#### Scenario: 打卡积分记录产品来源
- **WHEN** 用户通过爬楼打卡获得 18 积分
- **THEN** 积分流水记录 product_code = "stair_climbing"，source_type = "check_in"

#### Scenario: 步数积分记录产品来源
- **WHEN** 用户领取步数积分获得 82 积分
- **THEN** 积分流水记录 product_code = "walking"，source_type = "step_claim"

#### Scenario: 连续打卡奖励记录来源
- **WHEN** 用户连续打卡 7 天获得 200 额外积分
- **THEN** 积分流水记录 product_code = "stair_climbing"，source_type = "consecutive_bonus"

#### Scenario: 兑换消耗积分记录来源
- **WHEN** 用户兑换商品消耗 200 积分
- **THEN** 积分流水记录 product_code = null（兑换不区分产品），source_type = "exchange"

### Requirement: 积分流水按产品筛选
用户和管理员 SHALL 能够按产品维度筛选积分流水。

#### Scenario: 按产品筛选流水
- **WHEN** 用户选择仅查看"走路积分"的流水
- **THEN** 系统返回 product_code = "walking" 的所有积分流水记录

#### Scenario: 按来源类型筛选流水
- **WHEN** 管理员选择按"步数领取"类型筛选
- **THEN** 系统返回 source_type = "step_claim" 的所有积分流水记录

## MODIFIED Requirements

### Requirement: 积分流水查询
用户和管理员 SHALL 能够查询积分变动流水。用户只能查自己的，管理员可查本企业所有用户的。流水支持按产品维度和来源类型筛选。

#### Scenario: 用户查询积分流水
- **WHEN** 用户打开积分明细页面
- **THEN** 系统展示流水列表，每条包含变动类型、变动金额、变动后余额、时间、备注、来源产品

#### Scenario: 管理员按用户查询
- **WHEN** 企业管理员搜索某用户的积分流水
- **THEN** 系统返回该用户的所有积分变动记录，支持按产品维度筛选

#### Scenario: 管理员按产品筛选
- **WHEN** 企业管理员选择仅查看"爬楼积分"产品的流水
- **THEN** 系统返回该用户 product_code = "stair_climbing" 的积分变动记录

## ADDED Requirements

### Requirement: PointsEventBus 事件处理
系统 SHALL 通过 PointsEventBus 统一处理所有产品的积分事件，替代原有的直接积分操作方式。

#### Scenario: 积分事件处理流程
- **WHEN** PointsEventBus 收到积分事件
- **THEN** 系统在同一事务中：更新积分账户（total_points / available_points）→ 计算并更新 balance_after → 写入积分流水（含 product_code 和 source_type）→ 检查等级晋升/降级

#### Scenario: 积分事件幂等性
- **WHEN** 同一个积分事件（bizId 相同）重复到达
- **THEN** 系统通过 bizId 去重，不重复处理积分变动

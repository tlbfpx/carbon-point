## ADDED Requirements

### MVP 阶段说明

> **MVP 阶段采用自建虚拟商品体系**（券码/直充/权益三种类型），积分兑换为纯积分交易，不涉及现金支付。
> 平安健康商品 API 对接、混合支付（积分+现金）为 **Phase 2** 功能，详见 `docs/superpowers/specs/2026-04-10-carbon-point-business-improvement.md` §2.2.4。

### Requirement: 虚拟商品管理
企业管理员 SHALL 能够创建、编辑、删除虚拟商品。每个商品包含：名称、描述、图片、商品类型（coupon/recharge/privilege）、兑换所需积分、库存、每人限兑数量、有效期天数、发放配置。

#### Scenario: 创建券码型商品
- **WHEN** 企业管理员创建一个"星巴克优惠券"商品，类型 coupon，积分 200，库存 100，有效期 30 天
- **THEN** 系统保存商品信息，状态为 inactive（需手动上架）

#### Scenario: 编辑商品积分定价
- **WHEN** 企业管理员将某商品积分从 200 改为 150
- **THEN** 系统更新商品定价，已有兑换订单不受影响

### Requirement: 商品上下架
企业管理员 SHALL 能够上架或下架商品。上架后用户端可见，下架后用户端不可见但已有兑换订单不受影响。

#### Scenario: 上架商品
- **WHEN** 企业管理员将商品上架
- **THEN** 该商品出现在用户端积分商城中，可被兑换

#### Scenario: 下架商品
- **WHEN** 企业管理员将商品下架
- **THEN** 用户端不再展示该商品，已兑换的卡券仍可正常使用

### Requirement: 库存管理
系统 SHALL 自动管理商品库存。每次兑换扣减库存，库存为 0 时自动标记为售罄，用户端展示"已兑完"。

#### Scenario: 兑换扣减库存
- **WHEN** 用户兑换某商品（库存 50），成功兑换 1 件
- **THEN** 库存变为 49

#### Scenario: 库存为零
- **WHEN** 商品库存扣减到 0
- **THEN** 用户端展示"已兑完"，不允许继续兑换

#### Scenario: 无限库存
- **WHEN** 商品库存设置为 null（无限库存）
- **THEN** 用户端不显示库存数量，兑换时不扣减库存

### Requirement: 积分兑换下单
用户 SHALL 能够使用可用积分兑换商品。系统校验积分余额（available_points）、库存、每人限兑数量，通过后冻结积分、创建兑换订单、发放虚拟商品。

#### 订单状态机（完整定义）

```
pending（积分已冻结）
  ├─ → fulfilled（商品发放成功）
  ├─ → expired（超时未处理，15min，自动解冻积分）
  └─ → cancelled（用户/管理员取消，立即解冻积分）

fulfilled（商品已发放）
  ├─ → used（卡券核销）
  └─ → expired（卡券过期，不涉及积分）

used / expired / cancelled 均为终态
```

##### 状态说明

| 状态 | 含义 | 积分操作 | 库存操作 |
|---|---|---|---|
| pending | 积分已冻结，等待发放 | frozen_points +N | 已扣减（创建订单时） |
| fulfilled | 商品已发放/卡券已生成 | frozen_points → exchange | 不涉及 |
| used | 卡券已核销 | 不涉及 | 不涉及 |
| expired | 超时或卡券过期 | pending→expired 时解冻 | cancelled 时回滚 +1 |
| cancelled | 主动取消 | 立即解冻回 available_points | 回滚 +1 |

#### 积分状态变更对照表

| 订单状态变更 | available_points | frozen_points | 流水类型 |
|---|---|---|---|
| 下单（user → pending） | -N（转出） | +N（转入） | frozen |
| 取消（pending → cancelled） | +N（转回） | -N（转出） | unfrozen |
| 超时（pending → expired） | +N（转回） | -N（转出） | unfrozen |
| 发放成功（pending → fulfilled） | 不变 | -N（直接扣减） | exchange |

### Requirement: pending 超时机制

#### 配置参数

| 参数 | 默认值 | 说明 |
|---|---|---|
| order.pending.timeout-minutes | 15 | pending 订单超时时间（分钟），可按租户配置 |

#### 定时扫描任务

- **执行频率**：每 5 分钟运行一次（Spring `@Scheduled(cron = "0 */5 * * * *")`）
- **扫描范围**：status = pending AND created_at < NOW() - timeout_minutes 的所有订单
- **批量处理**：每次最多处理 500 条，防止锁表
- **事务边界**：每条订单独立事务，单条失败不影响其他订单

#### 超时处理流程

1. 订单 status 由 pending → expired
2. frozen_points 解冻回 available_points（写入 type=unfrozen 流水）
3. 库存回滚 +1（创建订单时已扣减）
4. 不生成虚拟商品（从未生成）
5. 记录过期原因：timeout

#### Scenario: 超时未处理（积分解冻）
- **WHEN** 订单 pending 状态超过 15 分钟（默认）未转为 fulfilled
- **THEN** 系统自动将订单状态变为 expired，frozen_points 解冻回 available_points，写入 type=unfrozen 流水，库存 +1

### Requirement: cancelled 状态完整定义

#### 取消触发者

| 触发者 | 条件 | 权限 |
|---|---|---|
| 用户 | pending 状态下可取消 | 登录用户本人 |
| 管理员 | pending 状态下可取消 | 企业管理员 / 平台管理员 |

#### 取消执行逻辑

1. 订单 status 由 pending → cancelled
2. **积分解冻**：立即同步执行，frozen_points 解冻回 available_points（写入 type=unfrozen 流水）
3. **库存回滚**：若创建订单时已扣减库存，则库存 +1
4. 不生成虚拟商品

#### 前端展示样式

- 订单状态标签：灰色（#999999）
- 订单金额、商品名称：删除线（text-decoration: line-through）
- 取消原因（可选）：展示在订单卡片底部

#### Scenario: 用户取消兑换
- **WHEN** 用户在订单 pending 状态下取消兑换
- **THEN** 订单状态变为 cancelled，frozen_points 立即解冻回 available_points，写入 type=unfrozen 流水，库存 +1，用户端展示灰色删除线样式

### Requirement: fulfilled → used 核销幂等性

#### 幂等保障

- **防重键**：`coupon_code` 唯一索引
- 重复核销场景下：
  - 若卡券已处于 used 状态，返回"该券码已使用"（HTTP 200，error_code = COUPON_ALREADY_USED）
  - 不重复扣减积分，不重复写入核销流水

#### 核销权限

| 触发者 | 场景 | 说明 |
|---|---|---|
| 管理员 | 线下验证后核销 | 企业管理员 / 平台管理员 |
| 用户 | 自助确认使用 | 用户在"我的卡券"中点击"确认使用" |

#### Scenario: 管理员核销
- **WHEN** 企业管理员输入或扫描用户的券码进行核销
- **THEN** 系统检查 coupon_code 未被使用，将卡券状态标记为 used，记录核销时间、操作人 ID 和操作人类型

#### Scenario: 用户自助确认
- **WHEN** 用户在"我的卡券"中点击"确认使用"
- **THEN** 系统将卡券状态标记为 used，记录使用时间

#### Scenario: 重复核销（幂等）
- **WHEN** 已核销的券码被再次提交核销
- **THEN** 系统返回"该券码已使用"（error_code = COUPON_ALREADY_USED），不做重复操作

#### Scenario: 成功兑换
- **WHEN** 用户 available_points=300，兑换 200 积分的商品，库存充足，未超限兑数量
- **THEN** 系统冻结 200 积分（available_points -200，frozen_points +200，写入 type=frozen 流水），创建兑换订单（status=pending），发放虚拟商品后订单状态变为 fulfilled（frozen_points -200，写入 type=exchange 流水）

#### Scenario: 积分不足
- **WHEN** 用户 available_points=100，尝试兑换 200 积分的商品
- **THEN** 系统提示"积分不足"，不创建订单

#### Scenario: 超过限兑数量
- **WHEN** 商品每人限兑 2 次，用户已兑 2 次
- **THEN** 系统提示"已达兑换上限"

### Requirement: 虚拟商品发放
系统 SHALL 根据商品类型自动发放虚拟商品：券码型生成唯一券码，直充型填写手机号后对接充值接口，权益型直接激活。

#### Scenario: 券码型发放
- **WHEN** 用户成功兑换券码型商品
- **THEN** 系统生成唯一券码，展示给用户，用户可在"我的卡券"中查看

#### Scenario: 权益型发放
- **WHEN** 用户成功兑换权益型商品（如 VIP 7天）
- **THEN** 系统直接激活权益，展示权益生效时间和到期时间

### Requirement: 卡券核销（已由上方 fulfilled→used 核销幂等性 Requirement 完整定义）

### Requirement: 卡券过期
系统 SHALL 自动检测卡券有效期，过期后标记为 expired。

#### Scenario: 卡券过期
- **WHEN** 卡券有效期（如 30 天）已过
- **THEN** 系统将卡券状态标记为 expired，用户端展示"已过期"

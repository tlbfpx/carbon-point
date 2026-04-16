## ADDED Requirements

### Requirement: 站内消息系统
系统 SHALL 提供站内消息功能，支持系统通知和业务通知两种类型。每条消息包含：标题、内容、类型、关联业务ID、已读状态、创建时间。

#### Scenario: 用户收到系统通知
- **WHEN** 系统发送一条通知给用户（如"您的等级已升级为 Lv.3 黄金"）
- **THEN** 该消息出现在用户的"消息中心"，未读消息在底部 Tab 栏"我的"图标上显示红点数字

#### Scenario: 标记已读
- **WHEN** 用户点击一条未读消息
- **THEN** 系统将该消息标记为已读，未读计数减 1

#### Scenario: 全部已读
- **WHEN** 用户在消息列表页点击"全部已读"
- **THEN** 系统将该用户所有未读消息标记为已读，红点消失

#### Scenario: 消息分页加载
- **WHEN** 用户下拉消息列表到底部
- **THEN** 系统加载下一页消息（每页 20 条），按创建时间倒序排列

### Requirement: 业务通知触发场景
系统 SHALL 在以下业务场景自动发送通知：

| 触发场景 | 通知类型 | 通知渠道 | 接收人 | 触发模块 |
|----------|---------|---------|--------|---------|
| 打卡成功触发连续打卡奖励 | streak_bonus | 站内信 | 用户本人 | check-in |
| 用户等级升级 | level_up | 站内信 | 用户本人 | points |
| 用户获得新徽章 | badge_earned | 站内信 | 用户本人 | check-in |
| 积分即将过期（30 天前） | point_expiring | 站内信 + 短信 | 用户本人 | point-account |
| 积分已过期 | point_expired | 站内信 | 用户本人 | point-account |
| 卡券即将过期（7 天前） | coupon_expiring | 站内信 | 用户本人 | virtual-mall |
| 卡券进入宽限期 | coupon_grace_period | 站内信 | 用户本人 | virtual-mall |
| 兑换订单超时取消 | order_expired | 站内信 | 用户本人 | virtual-mall |
| 兑换订单履约完成 | order_fulfilled | 站内信 | 用户本人 | virtual-mall |
| 企业被停用 | tenant_suspended | 站内信 + 短信 | 该企业所有用户 | system |
| 用户被停用 | user_disabled | 短信 | 用户本人 | system |
| 管理员手动发放积分 | point_manual_add | 站内信 | 用户本人 | enterprise-admin |
| 管理员手动扣减积分 | point_manual_deduct | 站内信 | 用户本人 | enterprise-admin |
| 企业邀请链接即将过期 | invite_expiring | 站内信 | 企业管理员 | enterprise-admin |
| 连续打卡中断提醒 | streak_broken | 站内信 | 用户本人 | check-in |

#### Scenario: 等级升级通知
- **WHEN** 用户累计积分从 950 增长到 1,050，等级从 Lv.1 升级为 Lv.2
- **THEN** 系统发送站内消息，标题"恭喜升级！"，内容"您已升级为白银等级，积分系数提升至 1.2x"

#### Scenario: 积分即将过期通知
- **WHEN** 系统每日检查到用户有积分将在 30 天后过期
- **THEN** 系统发送站内信 + 短信通知，内容包含即将过期的积分数量和最后使用日期

### Requirement: 短信通知
系统 SHALL 支持通过短信渠道发送关键通知。短信通知用于高优先级场景（积分过期、账户变动、企业停用），受频率限制。

#### Scenario: 发送短信通知
- **WHEN** 触发需要短信通知的场景（如积分过期预警）
- **THEN** 系统调用短信网关发送短信，同一用户同一类型短信每天最多 1 条

#### Scenario: 短信发送失败降级
- **WHEN** 短信网关返回失败
- **THEN** 系统记录发送失败日志，仍创建站内消息，定时任务在 2 小时后重试短信

### Requirement: 通知模板管理
系统 SHALL 使用模板管理通知内容，支持变量替换。管理员可查看通知模板但不可删除系统预设模板。

#### Scenario: 通知模板变量替换
- **WHEN** 系统发送"等级升级"通知，模板为"恭喜升级！您已升级为{level_name}等级，积分系数提升至{coefficient}x"
- **THEN** 系统将 {level_name} 替换为"白银"，{coefficient} 替换为"1.2"，发送最终内容

### Requirement: 通知偏好设置
用户 SHALL 能够在"设置"页面配置通知偏好，选择接收哪些类型的通知。

#### Scenario: 关闭某类通知
- **WHEN** 用户在通知设置中关闭"连续打卡中断提醒"
- **THEN** 系统不再向该用户发送 streak_broken 类型的通知

#### Scenario: 必要通知不可关闭
- **WHEN** 用户尝试关闭"积分已过期"通知
- **THEN** 系统提示"此类通知不可关闭"，保持开启状态

### Requirement: 通知数据隔离
通知数据 SHALL 按租户隔离，遵循平台统一的多租户策略。平台管理员的通知独立于企业租户体系。

#### Scenario: 租户内通知可见性
- **WHEN** 企业 A 的用户登录查看消息中心
- **THEN** 仅展示发送给该用户本人的通知，不展示其他用户的通知

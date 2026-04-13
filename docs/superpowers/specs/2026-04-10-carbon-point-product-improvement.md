# Carbon Point 产品改进设计文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-10 |
| 文档类型 | 产品改进规格说明书 |
| 关联系统 | Carbon Point 碳积分平台 |

---

## 一、设计背景与目的

当前 Carbon Point 平台存在多项 P0/P1 级别的产品需求缺口，这些缺口直接影响平台的合规性、用户体验和企业级部署能力。本文档针对以下8项关键需求进行系统性设计：

**P0 关键缺陷：**
1. 无积分过期策略 — 用户积分无限累积，形成无上限负债
2. 订单失败无退款机制 — 积分已扣除但未收到商品
3. 用户离职/调岗场景缺失 — 员工变动时无处理流程

**P1 重要缺陷：**
4. 无密码重置/账号找回流程
5. 无数据保留/删除策略（GDPR 合规风险）
6. 优惠券过期宽限期未定义
7. 无企业计划升级/降级场景
8. 无用户等级降级规则

---

## 二、积分过期策略

### 2.1 当前缺口

用户积分可无限累积，平台承担无上限负债风险。缺乏过期机制会导致：
- 长期不活跃用户占用积分库存
- 平台财务模型无法准确预测负债
- 用户缺乏持续活跃动机

### 2.2 解决方案

#### 2.2.1 过期规则设计

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 过期周期 | 12 个月 | 从最后活跃日期（打卡/积分变动）起算 |
| 提前通知 | 30 天 | 系统发送过期预警通知 |
| 手动延期 | 1 次 | 用户可申请一次延期机会 |
| 延期时长 | 3 个月 | 延期后重新计算12个月周期 |

**租户可配置项：**
- 积分过期周期（6/12/24 个月）
- 提前通知天数（7/14/30 天）
- 是否启用手动延期功能
- 过期积分处理方式（没收 vs 捐赠）

#### 2.2.2 过期积分处理

```
过期积分处理流程：
1. 系统每日凌晨执行过期检查
2. 对已过期的积分记录标记为"已过期"
3. 过期积分从用户可用余额中扣除
4. 扣除记录写入 point_history，表类型为 EXPIRED
5. 用户收到过期通知（站内信 + 短信）
6. 过期积分可选捐赠给公益账户（需租户开启此功能）
```

#### 2.2.3 手动延期机制

- 用户可申请一次延期机会，延期后 3 个月内不会再过期
- 延期申请入口：个人中心 → 积分明细 → 申请延期
- 延期后积分仍可正常消耗和使用
- 延期记录永久保存，不可重复申请

### 2.3 场景示例

#### 场景一：积分即将过期

**Given** 用户 A 在平台有 5000 积分，最后活跃日期为 2025 年 1 月 1 日，当前日期为 2026 年 1 月 1 日（已过 12 个月）
**When** 系统执行每日过期检查任务
**Then**
- 用户 A 的 5000 积分被标记为已过期
- 系统发送过期通知："您的 5000 积分已于今日过期，感谢您一直以来的支持"
- 积分从可用余额中扣除

#### 场景二：积分过期前延期

**Given** 用户 B 有 3000 积分，最后活跃日期为 2025 年 10 月 1 日，系统配置的过期周期为 12 个月
**When** 用户 B 在 2026 年 2 月 1 日（过期前 1 个月）申请手动延期
**Then**
- 延期申请通过，积分有效期延长至 2026 年 5 月 1 日（延期后 3 个月）
- 用户收到通知："您已成功申请积分延期，有效期延长至 2026 年 5 月 1 日"
- 延期记录保存，用户不可再次申请延期

#### 场景三：过期积分捐赠

**Given** 租户开启了积分捐赠功能，用户 C 的积分已过期
**When** 系统处理用户 C 的过期积分
**Then**
- 过期积分不执行没收，而是转入平台公益账户
- 用户收到通知："您的 500 过期积分已捐赠至碳中和公益项目"
- 捐赠记录可在积分明细中查看

---

## 三、订单失败退款机制

### 3.1 当前缺口

当订单履约失败时（平安健康 App 侧取消、超时未完成、支付失败），积分已扣除但商品未发放。缺乏自动退款和用户通知机制。

> **业务背景更新：** 积分商品来自平安健康 App，用户兑换时跳转到平安健康下单。Carbon Point 仅做积分代扣，履约由平安健康负责。

### 3.2 解决方案

#### 3.2.1 订单状态定义

| 状态 | 说明 |
|------|------|
| PENDING | 订单已创建，积分已冻结，等待用户跳转至平安健康完成现金支付 |
| PAID | 用户在平安健康完成现金支付，等待平安健康回调 |
| FULFILLED | 平安健康回调确认履约完成，积分正式扣除 |

#### 3.2.1b 积分事务类型

| 类型 | 说明 |
|------|------|
| CHECK_IN | 打卡获得积分 |
| FROZEN | 兑换商品时冻结（待兑换成功后转为扣除） |
| REFUND | 兑换失败/取消后解冻返还 |
| EXPIRE | 积分过期 |
| TRANSFER_IN | 积分转入 |
| TRANSFER_OUT | 积分转出 |
| REDEEM | 积分兑换正式扣除（FROZEN 确认后） |
| CANCELLED | 用户取消或现金支付失败，积分解冻 |
| EXPIRED | 用户跳转后超时未完成（默认 30 分钟），积分解冻 |
| REFUNDED | 已退款（现金退回） |

#### 3.2.2 混合支付兑换流程

```
用户兑换商品（混合支付）流程：

1. 用户选择商品（商品总价 ¥100，积分部分抵换 ¥50）
2. 系统校验：
   - 用户积分余额 >= 5000（积分部分）
   - 租户商品配置有效
3. 积分冻结：
   - 冻结用户 5000 积分（point_transactions 类型 = FROZEN）
   - 订单状态 = PENDING
4. 跳转平安健康：
   - 生成跳转链接，携带订单号和现金金额（¥50）
   - 用户在平安健康完成现金支付
5. 回调确认：
   - 平安健康回调通知支付成功
   - 订单状态 = PAID → FULFILLED
   - 解冻积分正式扣除（FROZEN → CHECK_IN 冲正）
6. 失败处理：
   - 超时/取消：积分解冻返还
   - 现金支付失败：积分解冻返还
```

**积分冻结说明：** 积分在兑换时即冻结，确保用户有足够积分。若兑换失败（超时/取消），积分立即解冻返还用户。

#### 3.2.3 失败原因分类（来自平安健康回调）

| 原因码 | 说明 |
|--------|------|
| USER_CANCELLED | 用户主动取消 |
| PAYMENT_FAILED | 现金支付失败 |
| PRODUCT_UNAVAILABLE | 商品不可用（平安健康侧） |
| TIMEOUT | 用户跳转后超时未完成 |
| CALLBACK_ERROR | 回调异常 |

#### 3.2.4 超时与退款处理

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 超时时间 | 30 分钟 | 用户跳转后未回调的判定时间 |
| 超时状态 | EXPIRED | 超时后的订单状态 |
| 积分处理 | 即时解冻 | 超时/取消时积分立即返还用户 |

**重试流程：**
1. 订单失败后进入重试队列
2. 24 小时后自动重试
3. 重试成功则状态变为 FULFILLED
4. 重试失败则重试次数 +1
5. 达到最大重试次数后，标记为 FAILED，执行退款

### 3.3 场景示例

#### 场景一：积分充足，正常兑换

**Given** 用户 D 账户有 8000 积分，兑换商品（积分部分 ¥60，现金部分 ¥40）
**When** 用户发起兑换
**Then**
- 系统冻结 6000 积分（积分抵换 ¥60）
- 订单状态 = PENDING
- 跳转平安健康，用户支付 ¥40 现金
- 平安健康回调成功
- 订单状态 = PAID → FULFILLED
- 6000 积分从冻结转为正式扣除

#### 场景二：积分不足，拒绝兑换

**Given** 用户 E 账户有 3000 积分，兑换商品（需要 6000 积分抵换 ¥60）
**When** 用户发起兑换
**Then**
- 系统拒绝兑换
- 返回提示："积分不足，还需 3000 积分"
- 用户无法跳转平安健康

#### 场景三：用户支付超时

**Given** 用户 E 跳转至平安健康后 30 分钟内未完成支付
**When** 系统检测到超时
**Then**
- 订单状态变为 EXPIRED
- 6000 积分解冻返还用户账户
- 用户收到通知："您兑换的 [商品名称] 订单已超时取消"

#### 场景四：现金支付失败

**Given** 用户 F 在平安健康支付时现金支付失败
**When** 平安健康回调支付失败
**Then**
- 订单状态变为 CANCELLED
- 6000 积分解冻返还用户账户
- 用户收到通知："现金支付失败，订单已取消，积分已返还"

#### 场景五：兑换成功后回调失败

**Given** 用户 F 完成现金支付后，平安健康回调失败（系统异常）
**When** 系统收到回调失败通知
**Then**
- 订单状态变为 CANCELLED（需人工介入）
- 现金部分：用户已支付，通知用户联系平安健康退款
- 积分部分：保持冻结，等待确认后解冻
- 管理员收到告警："订单 #12345 回调异常，请人工核查"

---

## 四、用户生命周期管理

### 4.1 当前缺口

缺乏员工离职、岗位调动、企业关闭等场景的处理机制，可能导致：
- 离职员工积分无法处理
- 企业关闭后数据泄露风险
- 管理员离职后账号无法接管

### 4.2 解决方案

#### 4.2.1 用户自愿离职

用户主动退出企业时，提供三种处理方式：

| 选项 | 说明 | 限制 |
|------|------|------|
| 转移积分 | 将积分转移至新企业账户 | 需新企业管理员确认接收 |
| 冻结账户 | 积分冻结，账户暂停使用 | 可由管理员解冻 |
| 没收积分 | 积分清零，账户注销 | 需企业管理员确认 |

**转移流程：**
```
1. 用户提交离职申请，选择"转移积分"
2. 输入目标企业代码和新企业账号
3. 双方管理员审核确认
4. 积分转入新企业账户（扣除 5% 手续费）
5. 原账户注销
```

#### 4.2.2 管理员发起移除

| 场景 | 处理方式 |
|------|----------|
| 普通员工移除 | 直接移除，积分由企业决定没收或转移 |
| 管理员移除 | 必须先转移管理员权限才能移除 |
| 最后管理员移除 | 必须先指定新管理员才能移除 |

**管理员权限转移流程：**
1. 当前管理员指定接替人选
2. 接替人确认接收
3. 权限自动转移
4. 原管理员变为普通成员

#### 4.2.3 企业关闭处理

| 阶段 | 时间节点 | 处理内容 |
|------|----------|----------|
| 关闭申请 | Day 0 | 管理员提交企业关闭申请 |
| 数据导出 | Day 0-60 | 企业可导出全部数据 |
| 账户冻结 | Day 60 | 所有账户被冻结，无法登录 |
| 数据删除 | Day 90 | 全部数据永久删除（GDPR 合规） |

**数据导出内容：**
- 用户信息（姓名、邮箱、手机号）
- 积分明细
- 打卡记录
- 兑换记录
- 管理员可下载 JSON + CSV 格式（统一导出格式，详见 6.2.4）

### 4.3 场景示例

#### 场景一：用户自愿转移积分

**Given** 用户 G 准备离职，计划去新公司继续使用平台
**When** 用户 G 提交离职申请，选择"转移积分至新企业"
**Then**
- 用户输入目标企业代码和账号
- 原企业管理员收到转移申请，审核通过
- 新企业管理员收到接收确认，确认通过
- 用户 G 的 8000 积分转入新企业（扣除 5% 手续费，实际转入 7600）
- 原账户注销

#### 场景二：移除唯一管理员

**Given** 用户 H 是企业的唯一管理员，员工 I 是普通成员
**When** 管理员 H 尝试删除自己
**Then**
- 系统提示："您是企业的唯一管理员，请先转移管理员权限"
- 管理员 H 必须先指定员工 I 为新管理员
- 员工 I 确认后，管理员权限转移完成
- 管理员 H 变为普通成员后可被移除

#### 场景三：企业关闭数据保留

**Given** 企业管理员提交企业关闭申请
**When** 关闭申请提交后 60 天内
**Then**
- 企业账户可正常登录使用
- 管理员可导出全部数据
- 60 天后账户自动冻结
- 90 天后数据永久删除
- 删除前 7 天发送最后通知

---

## 五、密码重置与账户恢复

### 5.1 当前缺口

用户忘记密码后无法自助找回，必须联系管理员重置。缺乏自动化流程和账户锁定机制。

### 5.2 解决方案

#### 5.2.1 密码重置流程

**方式一：短信验证码重置**

```
密码重置流程（短信）：
1. 用户输入注册手机号
2. 系统发送 6 位数字验证码（有效期 5 分钟）
3. 用户输入验证码 + 新密码
4. 验证通过后更新密码
5. 发送密码变更通知到原手机号
```

**方式二：管理员重置**

```
管理员重置流程：
1. 管理员在后台搜索目标用户
2. 点击"重置密码"按钮
3. 系统生成临时密码并展示
4. 临时密码仅展示一次
5. 用户首次登录必须修改密码
6. 操作记录写入审计日志
```

#### 5.2.2 账户锁定策略

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 锁定阈值 | 5 次 | 连续密码错误后锁定 |
| 锁定时长 | 30 分钟 | 自动解锁时间 |
| 永久锁定 | — | 需管理员手动解锁 |

**锁定规则：**
- 连续 5 次密码错误，账户锁定 30 分钟
- 锁定期间不能登录或重置密码
- 解锁方式：等待自动解锁 或 管理员手动解锁
- 每次密码错误记录 IP 和时间

### 5.3 场景示例

#### 场景一：用户自助短信重置

**Given** 用户 J 忘记密码，试图登录失败
**When** 用户 J 点击"忘记密码"
**Then**
- 用户 J 输入注册手机号 138****8888
- 系统发送验证码到该手机号
- 用户 J 输入验证码和新密码
- 密码更新成功，立即可以登录

#### 场景二：账户被锁定

**Given** 用户 K 连续输入错误密码 5 次
**When** 第 5 次密码错误后
**Then**
- 账户被锁定 30 分钟
- 登录页面提示："账户已锁定，请 30 分钟后再试或联系管理员"
- 管理员收到通知："用户 K 因连续密码错误已被锁定"
- 30 分钟后自动解锁

#### 场景三：管理员重置密码

**Given** 用户 L 无法接收短信验证码，联系管理员
**When** 管理员在后台重置用户 L 的密码
**Then**
- 管理员操作：搜索用户 → 重置密码 → 获得临时密码
- 临时密码展示给管理员，管理员告知用户
- 用户 L 使用临时密码登录
- 系统提示："请立即修改密码"
- 管理员操作记录写入审计日志

---

## 六、数据保留与删除策略

### 6.1 当前缺口

缺乏用户数据删除机制和保留策略，存在 GDPR 合规风险。用户无法行使"被遗忘权"。

### 6.2 解决方案

#### 6.2.1 数据删除类型

| 删除类型 | 说明 | 恢复期 |
|----------|------|--------|
| 软删除 | 数据标记为已删除，仍可恢复 | 30 天 |
| 硬删除 | 数据永久清除，不可恢复 | 无 |

#### 6.2.2 用户数据删除流程

```
用户申请删除流程：
1. 用户提交删除申请（个人中心 → 账户安全 → 删除账户）
2. 系统显示删除影响说明：
   - 积分余额将被清零
   - 历史积分记录将被保留（合规要求）
   - 打卡记录将被匿名化处理
3. 用户确认删除（需短信验证码）
4. 账户进入 30 天软删除期
5. 期间用户可申请恢复
6. 30 天后自动执行硬删除
7. 发送删除确认邮件
```

#### 6.2.3 企业数据保留

| 数据类型 | 保留期限 | 说明 |
|----------|----------|------|
| 用户积分明细 | 90 天 | 企业关闭后 |
| 打卡记录 | 90 天 | 企业关闭后 |
| 兑换记录 | 90 天 | 企业关闭后 |
| 审计日志 | 3 年 | 法定保留 |

#### 6.2.4 数据导出功能（统一）

**导出格式：JSON + CSV**

所有数据导出功能统一使用 JSON + CSV 双格式输出：
- 用户数据导出（个人）：用户可申请导出个人数据
- 企业数据导出（管理员）：管理员可导出企业全部数据
- 导出内容包括：基本信息、积分记录、打卡记录、兑换记录
- JSON 格式：便于程序处理和系统对接
- CSV 格式：便于人工查看和数据分析

**同意管理：**
- 首次注册时获取数据使用同意
- 同意记录永久保存
- 用户可在设置中撤回同意（触发账户删除流程）

### 6.3 场景示例

#### 场景一：用户申请删除账户

**Given** 用户 M 提交账户删除申请
**When** 用户 M 确认删除
**Then**
- 账户进入 30 天软删除期
- 用户 M 无法登录
- 30 天后执行硬删除
- 用户 M 收到邮件："您的账户已于 [日期] 删除"

#### 场景二：软删除期间恢复

**Given** 用户 N 申请删除后第 15 天想恢复账户
**When** 用户 N 登录并选择"恢复账户"
**Then**
- 账户恢复正常
- 所有数据完整保留
- 删除申请记录清除

#### 场景三：企业关闭后数据保留

**Given** 企业于 Day 0 提交关闭申请
**When** Day 90
**Then**
- Day 0-60：企业可正常导出数据
- Day 60：所有账户冻结
- Day 90：全部数据永久删除
- Day 83：发送最后 7 天删除预警

---

## 七、优惠券过期宽限期

### 7.1 当前缺口

优惠券过期后立即失效，用户可能因疏忽错过使用时间，造成不必要的损失和投诉。

### 7.2 解决方案

#### 7.2.1 优惠券生命周期

| 阶段 | 说明 |
|------|------|
| ACTIVE | 优惠券可用 |
| EXPIRING_SOON | 过期前 7 天（提前通知） |
| GRACE_PERIOD | 过期后 7 天宽限期 |
| EXTENDED | 已使用一次延期机会 |
| EXPIRED | 已过期，不可使用 |

#### 7.2.2 宽限期规则

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 宽限期时长 | 7 天 | 过期后可用期限 |
| 延期机会 | 1 次 | 可申请一次延期 |
| 延期时长 | 7 天 | 延期后的有效期 |

**宽限期使用规则：**
- 宽限期内优惠券可正常使用
- 宽限期结束后优惠券标记为 EXPIRED
- 用户可申请一次延期，延期后获得 7 天额外有效期
- 延期机会仅限一次，不可重复申请
- 延期后不可再申请第二次延期

### 7.3 场景示例

#### 场景一：优惠券过期进入宽限期

**Given** 用户 O 有一张有效期至 2026-04-01 的优惠券
**When** 2026-04-02（过期后第 1 天）
**Then**
- 优惠券状态变为 GRACE_PERIOD
- 用户 O 仍可使用该优惠券
- 用户收到通知："您有一张优惠券已于昨日过期，现已进入 7 天宽限期，请尽快使用"

#### 场景二：宽限期内使用优惠券

**Given** 用户 P 的优惠券进入宽限期（第 3 天）
**When** 用户 P 在宽限期内使用优惠券下单
**Then**
- 优惠券正常抵扣
- 订单完成后优惠券标记为已使用
- 不触发延期逻辑

#### 场景三：申请延期

**Given** 用户 Q 的优惠券已过期，进入宽限期（第 5 天）
**When** 用户 Q 申请优惠券延期
**Then**
- 延期申请通过
- 优惠券获得额外 7 天有效期（至 2026-04-12）
- 状态变为 EXTENDED
- 用户收到通知："优惠券已延期至 2026-04-12，此为一次性延期机会"

#### 场景四：宽限期结束后

**Given** 用户 R 的优惠券宽限期已过（已过期 7 天且未延期）
**When** 系统每日检查时
**Then**
- 优惠券状态变为 EXPIRED
- 用户收到通知："您的优惠券已过期，无法使用"
- 优惠券不可恢复

---

## 八、企业计划变更

### 8.1 当前缺口

缺乏企业从当前计划升级到更高级别，或降级到更低级别的处理机制。

### 8.2 解决方案

#### 8.2.1 计划类型定义

| 计划 | 用户上限 | 功能 |
|------|----------|------|
| Free | 50 人 | 基础打卡功能 |
| Pro | 500 人 | 高级报表 + API |
| Enterprise | 无限制 | 全部功能 + 专属客服 |

#### 8.2.2 升级流程

```
即时升级流程：
1. 管理员选择目标计划
2. 选择支付周期（月付/年付）
3. 完成支付
4. 计划立即升级
5. 用户上限立即扩大
6. 新功能立即开放
7. 发送升级成功通知
```

**按比例计费：**
- 年付升级时，按剩余天数比例计算费用
- 已支付金额按比例抵扣

#### 8.2.3 降级流程

```
优雅降级流程：
1. 管理员申请降级
2. 系统检查当前用户数是否超过目标计划上限
   - 若不超过：立即降级
   - 若超过：进入待处理状态
3. 待处理状态下，管理员需处理超限用户：
   - 将用户转移到其他企业
   - 删除不活跃用户
   - 等待降级生效（下一账单周期）
4. 降级生效时，超限用户自动暂停
5. 被暂停用户收到通知，可联系管理员处理
```

**降级时超限用户处理规则：**
- 按用户最后活跃时间排序
- 最长 90 天未活跃的用户优先暂停
- 被暂停用户不影响企业积分总量，积分保留

### 8.3 场景示例

#### 场景一：Pro 升级到 Enterprise

**Given** 企业当前为 Pro 计划，用户 300 人
**When** 管理员升级到 Enterprise 计划
**Then**
- 立即获得 Enterprise 全部功能
- 用户上限解除
- 专属客服开通
- 当月费用按剩余天数比例计算

#### 场景二：降级时用户超限

**Given** 企业为 Pro 计划，用户 450 人，管理员想降级到 Free（上限 50 人）
**When** 管理员申请降级
**Then**
- 系统检测到超限用户 400 人
- 提示管理员："降级将导致 400 名用户被暂停，请先处理"
- 管理员可查看超限用户列表
- 管理员选择"下次账单周期生效"
- 在下次账单前，管理员可将部分用户转移到其他企业
- 下次账单日时，仍超限的用户自动暂停

#### 场景三：超限用户自动暂停

**Given** 企业 Free 计划，账单周期为每月 1 日，当前用户 45 人
**When** 新用户 6 人加入，总用户数 51 人，超过上限 1 人
**Then**
- 第 51 名用户加入时，系统提示管理员
- 管理员可选择暂停一名用户
- 最长未活跃用户被暂停
- 被暂停用户收到通知："您的账户已被暂停，请联系管理员"

---

## 九、用户等级降级规则

### 9.1 用户等级定义

> **权威来源：** 等级定义以 `openspec/changes/carbon-point-platform/specs/point-engine/spec.md` 中"用户等级体系"为准。以下为同步摘要。

| 等级 | 等级名称 | 累计积分门槛 | 默认系数 |
|------|----------|--------------|---------|
| Lv.1 | 青铜 | 0 - 999 | 1.0x |
| Lv.2 | 白银 | 1,000 - 4,999 | 1.2x |
| Lv.3 | 黄金 | 5,000 - 19,999 | 1.5x |
| Lv.4 | 铂金 | 20,000 - 49,999 | 2.0x |
| Lv.5 | 钻石 | 50,000+ | 2.5x |

**等级晋升规则（与 point-engine/spec.md 一致）：**
- 用户累计积分（total_points）达到门槛即自动升级
- 等级不可跨级晋升，需逐级提升
- 严格模式（默认）等级只升不降；灵活模式允许不活跃降级
- 等级称号永久展示，不随降级调整

### 9.2 当前缺口

当前设计采用"等级只升不降"原则，但部分企业客户要求能对长期不活跃用户进行等级调整以维护平台活跃度。

### 9.2 解决方案

#### 9.2.1 等级降级策略（可配置）

| 租户配置 | 说明 |
|----------|------|
| 严格模式（默认） | 等级只升不降，用户体验优先 |
| 灵活模式 | 允许降级，管理员可配置触发条件 |

**严格模式（默认）：**
- 用户等级一旦提升，绝不下降
- 即使长期不活跃，等级保持不变
- 鼓励持续活跃，但不惩罚沉默用户

**灵活模式配置项：**

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 不活跃阈值 | 90 天 | 超过此天数无打卡视为不活跃 |
| 降级检查周期 | 每月 | 每月检查一次不活跃用户 |
| 降级幅度 | 1 级 | 每次检查最多降 1 级 |
| 最低等级 | Lv.1 | 不会降至 Lv.1 以下 |

#### 9.2.2 降级流程

```
不活跃降级流程（灵活模式）：
1. 系统每月 1 日执行不活跃检查
2. 查询过去 90 天无打卡记录的用户
3. 对这些用户的等级 -1
4. 降级记录写入 audit_log
5. 用户收到通知："因连续 90 天未参与活动，您的等级已从 Lv.3 调整为 Lv.2"
6. 用户重新活跃后，等级可重新提升
```

#### 9.2.3 活跃度定义

| 活动类型 | 计入活跃 |
|----------|----------|
| 打卡 | 是 |
| 积分兑换 | 是 |
| 每日签到 | 是 |
| 查看排行榜 | 否 |
| 登录 APP | 否 |

### 9.3 场景示例

#### 场景一：严格模式下长期不活跃

**Given** 用户 S 是 Lv.4 铂金用户，已连续 120 天未打卡（租户采用严格模式）
**When** 系统每月不活跃检查时
**Then**
- 用户等级保持 Lv.4 不变
- 用户收到通知："您已 120 天未参与活动，再接再厉！"

#### 场景二：灵活模式下降级

**Given** 用户 T 是 Lv.3 黄金用户，已连续 95 天未打卡（租户采用灵活模式，不活跃阈值 90 天）
**When** 系统每月检查时
**Then**
- 用户等级从 Lv.3 降为 Lv.2
- 用户收到通知："因连续 90 天未参与活动，您的等级已从 Lv.3 调整为 Lv.2"
- 用户重新活跃后，可通过打卡重新升级

#### 场景三：灵活模式最低等级保护

**Given** 用户 U 是 Lv.1 青铜用户，已连续 100 天未打卡
**When** 系统检查时
**Then**
- 用户等级保持 Lv.1（不会降到 Lv.0）
- 用户收到通知："您已长期未参与活动，请尽快回归！"

---

## 十一、字典管理

### 11.1 需求背景

后台管理系统中存在大量下拉框选项（如状态、类型、级别等），目前硬编码在代码中难以维护。需要统一的字典表管理，支持灵活配置和扩展。

### 11.2 数据模型

#### 11.2.1 字典表

```sql
CREATE TABLE sys_dict (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    category        VARCHAR(50) NOT NULL COMMENT '字典分类',
    label           VARCHAR(100) NOT NULL COMMENT '显示文本',
    value           VARCHAR(200) NOT NULL COMMENT '存储值',
    sort            INT DEFAULT 0 COMMENT '排序',
    status          VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/inactive',

    -- 可扩展字段
    parent_id       BIGINT COMMENT '父级ID（支持树形结构）',
    css_class       VARCHAR(100) COMMENT '样式Class（用于下拉框颜色）',
    extra           JSON COMMENT '扩展数据（如icon、description等）',

    -- 系统字段
    is_preset       TINYINT(1) DEFAULT 0 COMMENT '是否系统预设（1不可删除）',
    created_by      VARCHAR(50),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_category_value (category, value),
    INDEX idx_category (category),
    INDEX idx_parent_id (parent_id),
    INDEX idx_status (status)
);
```

#### 11.2.2 字典分类表（可选，便于管理）

```sql
CREATE TABLE sys_dict_category (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    code            VARCHAR(50) NOT NULL UNIQUE COMMENT '分类编码',
    name            VARCHAR(100) NOT NULL COMMENT '分类名称',
    description     VARCHAR(200),
    sort            INT DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 11.3 API 设计

```java
// 字典 Controller
@RestController
@RequestMapping("/api/v1/dict")
public class SysDictController {

    // 根据分类获取字典列表
    @GetMapping("/category/{category}")
    public Result<List<SysDict>> getByCategory(@PathVariable String category);

    // 根据多个分类获取（一次性获取多个下拉框）
    @GetMapping("/categories")
    public Result<Map<String, List<SysDict>>> getByCategories(
            @RequestParam List<String> categories);

    // 获取树形字典
    @GetMapping("/tree/{category}")
    public Result<List<SysDictTreeVO>> getTree(@PathVariable String category);

    // CRUD（平台管理员）
    @PostMapping public Result<Void> create(@RequestBody SysDict dict);
    @PutMapping("/{id}") public Result<Void> update(@PathVariable Long id, @RequestBody SysDict dict);
    @DeleteMapping("/{id}") public Result<Void> delete(@PathVariable Long id);
}
```

### 11.4 预置数据

```sql
-- 基础状态类
INSERT INTO sys_dict (category, label, value, sort, is_preset) VALUES
('common_status', '启用', 'active', 1, 1),
('common_status', '禁用', 'inactive', 2, 1);

-- 企业相关
INSERT INTO sys_dict (category, label, value, sort, is_preset) VALUES
('tenant_package', '免费版', 'free', 1, 1),
('tenant_package', '专业版', 'pro', 2, 1),
('tenant_package', '企业版', 'enterprise', 3, 1),
('tenant_status', '正常', 'active', 1, 1),
('tenant_status', '停用', 'suspended', 2, 1),
('tenant_status', '到期', 'expired', 3, 1);

-- 用户相关
INSERT INTO sys_dict (category, label, value, sort, is_preset) VALUES
('user_status', '正常', 'active', 1, 1),
('user_status', '禁用', 'disabled', 2, 1),
('user_status', '注销', 'deleted', 3, 1);

-- 打卡相关
INSERT INTO sys_dict (category, label, value, sort, is_preset) VALUES
('point_rule_type', '时段规则', 'time_slot', 1, 1),
('point_rule_type', '连续打卡奖励', 'streak', 2, 1),
('point_rule_type', '特殊日期翻倍', 'special_date', 3, 1),
('point_rule_type', '等级系数', 'level_coefficient', 4, 1),
('point_rule_type', '每日上限', 'daily_cap', 5, 1);

-- 订单相关
INSERT INTO sys_dict (category, label, value, sort, is_preset) VALUES
('order_status', '待处理', 'pending', 1, 1),
('order_status', '已支付', 'paid', 2, 1),
('order_status', '已完成', 'fulfilled', 3, 1),
('order_status', '已取消', 'cancelled', 4, 1),
('order_status', '已过期', 'expired', 5, 1);

-- 告警相关
INSERT INTO sys_dict (category, label, value, sort, css_class, is_preset) VALUES
('alert_level', '绿色', 'green', 1, 'success', 1),
('alert_level', '黄色', 'yellow', 2, 'warning', 1),
('alert_level', '橙色', 'orange', 3, 'warning', 1),
('alert_level', '红色', 'red', 4, 'danger', 1),
('alert_level', '已流失', 'churned', 5, 'info', 1);
```

### 11.5 使用方式

**前端批量获取：**
```
GET /api/v1/dict/categories?categories=user_status,tenant_package,order_status

Response:
{
  "user_status": [
    { "value": "active", "label": "正常" },
    { "value": "disabled", "label": "禁用" }
  ],
  "tenant_package": [...],
  "order_status": [...]
}
```

### 11.6 设计要点

| 要点 | 说明 |
|------|------|
| **category + value 唯一** | 防止同一分类下重复的 value |
| **is_preset 保护** | 系统预设数据不可删除，防止业务崩塌 |
| **JSON extra 字段** | 预留扩展，避免频繁改表 |
| **parent_id 树形** | 支持部门等层级数据 |
| **批量查询 API** | 减少请求次数，一次获取多个分类 |
| **Redis 缓存** | 字典数据变化少，加缓存提升性能 |

---

## 十、附录

### 10.1 新增数据表设计

```sql
-- 积分过期配置表
CREATE TABLE point_expiration_config (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL COMMENT '租户ID',
    expiration_months INT NOT NULL DEFAULT 12 COMMENT '过期月数',
    notify_days_before INT NOT NULL DEFAULT 30 COMMENT '提前通知天数',
    extension_enabled TINYINT(1) DEFAULT 1 COMMENT '是否允许手动延期',
    extension_months INT DEFAULT 3 COMMENT '延期时长',
    expired_handling VARCHAR(20) DEFAULT 'FORFEIT' COMMENT '过期处理: FORFEIT/DONATE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE uk_tenant_id (tenant_id)
);

-- 积分过期记录表
CREATE TABLE point_expiration (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    points BIGINT NOT NULL COMMENT '过期积分数量',
    expired_at DATETIME NOT NULL COMMENT '过期时间',
    handled_at DATETIME COMMENT '处理时间',
    status VARCHAR(20) DEFAULT 'PENDING' COMMENT '状态: PENDING/PROCESSED',
    INDEX idx_user_id (user_id),
    INDEX idx_expired_at (expired_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 用户延期记录表
CREATE TABLE point_extension (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    extended_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '延期时间',
    original_expiration DATETIME NOT NULL COMMENT '原过期时间',
    new_expiration DATETIME NOT NULL COMMENT '新过期时间',
    INDEX idx_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 订单失败记录表
CREATE TABLE order_failure_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL COMMENT '订单ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    points BIGINT NOT NULL COMMENT '退款积分',
    failure_reason VARCHAR(50) NOT NULL COMMENT '失败原因',
    retry_count INT DEFAULT 0 COMMENT '重试次数',
    status VARCHAR(20) DEFAULT 'FAILED' COMMENT '状态',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order_id (order_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 积分兑换订单表（混合支付）
CREATE TABLE exchange_orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_no VARCHAR(64) NOT NULL UNIQUE COMMENT '订单号',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    tenant_id BIGINT NOT NULL COMMENT '租户ID',
    external_product_id VARCHAR(100) NOT NULL COMMENT '平安健康商品ID',
    product_name VARCHAR(200) COMMENT '商品名称（冗余）',
    total_product_price DECIMAL(10,2) NOT NULL COMMENT '商品总价（元）',
    points_deducted INT NOT NULL COMMENT '积分扣除数量',
    points_value DECIMAL(10,2) NOT NULL COMMENT '积分抵换金额（积分/100）',
    cash_deducted DECIMAL(10,2) NOT NULL COMMENT '现金扣除金额',
    order_status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending/paid/fulfilled/cancelled/expired',
    redirect_url VARCHAR(500) NOT NULL COMMENT '跳转平安健康URL',
    callback_status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending/success/failed/timeout',
    paid_at DATETIME COMMENT '现金支付完成时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order_no (order_no),
    INDEX idx_user_id (user_id),
    INDEX idx_status (order_status)
);

-- 订单回调日志表（平安健康回调记录）
CREATE TABLE exchange_callback_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL COMMENT '订单ID',
    callback_type VARCHAR(20) NOT NULL COMMENT '回调类型: SUCCESS/FAIL/TIMEOUT',
    response_code VARCHAR(50) COMMENT '平安健康响应码',
    response_message VARCHAR(200) COMMENT '平安健康响应消息',
    raw_payload JSON COMMENT '原始回调数据',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_id (order_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (order_id) REFERENCES exchange_orders(id) ON DELETE CASCADE
);

-- 账户删除申请表
CREATE TABLE account_deletion_request (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    status VARCHAR(20) DEFAULT 'PENDING' COMMENT '状态: PENDING/APPROVED/REJECTED/EXPIRED',
    soft_delete_at DATETIME COMMENT '软删除时间',
    hard_delete_at DATETIME COMMENT '硬删除时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 优惠券宽限期表（扩展原有 coupon 表）
-- 新增字段：grace_period_days INT DEFAULT 7, extension_count INT DEFAULT 0, extended_at DATETIME
```

**外键关系定义：**

| 子表 | 父表 | 关联字段 | 删除策略 |
|------|------|----------|----------|
| point_expiration | users | user_id | CASCADE |
| point_extension | users | user_id | CASCADE |
| order_failure_log | orders | order_id | CASCADE |
| order_failure_log | users | user_id | CASCADE |
| exchange_callback_log | exchange_orders | order_id | CASCADE |
| account_deletion_request | users | user_id | CASCADE |

### 10.2 新增配置项

| 配置分类 | 配置项 | 默认值 |
|----------|--------|--------|
| 积分兑换 | point.ratio | 100 | 积分抵换比例（100积分=1元） |
| 积分兑换 | exchange.timeout_minutes | 30 | 兑换跳转超时时间 |
| 积分过期 | point.expiration.months | 12 |
| 积分过期 | point.expiration.notify.days | 30 |
| 积分过期 | point.expiration.extension.enabled | true |
| 账户安全 | security.lockout.max_attempts | 5 |
| 账户安全 | security.lockout.duration_minutes | 30 |
| 数据保留 | data.retention.enterprise_days | 90 |
| 数据保留 | data.retention.soft_delete_days | 30 |
| 用户等级 | level.demotion.enabled | false |
| 用户等级 | level.demotion.inactive_days | 90 |
| 企业降级 | downgrade.user_suspension_order | INACTIVE_FIRST |
| 积分转移 | transfer.fee_percentage | 5 |
| 计费周期 | billing.cycle_type | SIGNUP_DATE |

**计费周期配置说明：**

| 计费周期类型 | 说明 |
|--------------|------|
| SIGNUP_DATE | 按用户注册日期按月计费（推荐） |
| CALENDAR_MONTH | 按自然月计费，统一在每月1日 |

**降级触发时机：**
- SIGNUP_DATE 模式：下一账单周期生效（按用户注册日计算）
- CALENDAR_MONTH 模式：下一自然月1日生效 |

### 10.3 审计日志字段

所有敏感操作均需记录审计日志：

| 操作类型 | 记录内容 |
|----------|----------|
| 管理员重置密码 | 操作人、被操作人、时间、IP |
| 用户等级调整 | 用户、调整前等级、调整后等级、原因 |
| 积分退款 | 订单号、用户、积分数量、原因 |
| 账户删除 | 用户、申请时间、删除类型 |
| 企业降级 | 企业、原计划、新计划、超限用户数 |

---

## 十一、优先级与实施计划

### 11.1 优先级矩阵

| 需求 | 优先级 | 估计工时 | 依赖关系 |
|------|--------|----------|----------|
| 积分过期策略 | P0 | 2 周 | 无 |
| 订单失败退款 | P0 | 2 周 | 无 |
| 用户生命周期 | P0 | 3 周 | 积分过期 |
| 密码重置 | P1 | 1 周 | 无 |
| 数据保留/删除 | P1 | 2 周 | 用户生命周期 |
| 优惠券宽限期 | P1 | 1 周 | 无 |
| 企业计划变更 | P1 | 2 周 | 用户生命周期 |
| 用户等级降级 | P1 | 1 周 | 无 |

### 11.2 推荐实施顺序

```
Phase 1 (P0 - 第 1-2 周):
- 积分过期策略
- 订单失败退款机制

Phase 2 (P0 - 第 3-5 周):
- 用户生命周期管理

Phase 3 (P1 - 第 6-7 周):
- 密码重置与账户恢复
- 优惠券过期宽限期

Phase 4 (P1 - 第 8-10 周):
- 数据保留与删除策略
- 企业计划变更

Phase 5 (P1 - 第 11 周):
- 用户等级降级规则（可选功能）
```

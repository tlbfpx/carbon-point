# Carbon Point 平台规格四维审查报告

**审查日期:** 2026-04-11
**审查范围:** openspec/ 全部 12 模块规格 + design.md + 4 份改进文档 + 荣誉体系 MVP + 实施计划
**审查团队:** 产品专家 / 架构师 / 安全与风控 / DBA

---

# 一、产品专家报告

**审查人:** 产品专家
**审查维度:** 功能完整性、用户体验逻辑、商业闭环

## 1. 功能完整性评估

### 1.1 核心业务闭环 — 完整度 85%

| 业务链路 | 状态 | 缺口 |
|----------|------|------|
| 打卡→积分→兑换 | ✅ 完整 | — |
| 注册→邀请→绑定企业 | ✅ 完整 | — |
| 规则配置→生效→计算 | ✅ 完整 | — |
| 积分发放→消耗→过期 | ⚠️ 部分覆盖 | 产品改进文档已补，但主 spec 未同步更新 |
| 订单→履约→退款 | ⚠️ 部分覆盖 | 退款流程在产品改进文档中定义，但与主 spec 的 virtual-mall 状态机不一致 |

### 1.2 关键功能缺口

**P0 — 无通知/消息系统：** 12 个模块 spec 中没有消息中心或推送系统的规格。以下场景依赖通知但无载体：
- 打卡成功反馈（H5 有动画，但无持久化通知）
- 积分即将过期预警（产品改进 §2 要求 30 天前通知）
- 连续打卡中断提醒
- 卡券过期前 7 天通知
- 企业被停用通知
- 订单回调失败告警
- 等级升级通知
- 徽章获得通知

**建议:** 新增 `notification` 模块 spec，至少包含站内信 + 短信两个渠道，定义通知模板、已读状态、批量已读。

**P0 — 荣誉体系与主规格冲突：**
- `honor-system-mvp-design.md` 定义等级基于**累计打卡天数**（30/100/300/500 天）
- `point-engine/spec.md` 定义等级基于**累计积分**（0~500/500~2000/2000+）
- `product-improvement.md` 又定义了第三套等级（基于累计积分 1000/5000/20000/50000）

三套等级定义互相矛盾，必须在开发前统一。

**P1 — 商品搜索/分类缺失：** virtual-mall spec 仅支持按 sort_order 排序列表，缺少：
- 商品分类/标签
- 商品搜索
- 商品筛选（按积分范围）
- 商品推荐

对于商城体验来说，仅靠排序在商品超过 20 个后体验急剧下降。

**P1 — 批量操作支持不足：**
- 批量导入用户有规格，但批量停用/启用用户无规格
- 批量积分发放无规格（发放活动奖励场景）
- 批量核销卡券无规格

**P1 — 数据导出格式不统一：**
- reporting spec 仅提到 Excel 导出
- product-improvement §6.2.4 定义了 JSON + CSV 双格式
- 两者需统一

### 1.3 用户体验逻辑问题

**连续打卡的中断定义不精确：** point-engine spec 说"第 7 天未打卡则重置为 0"，但未定义：
- 周末是否计入连续天数？
- 企业配置的时段在周末不可用时怎么办？
- 用户跨时区打卡的处理？

**积分不足的 UX 断裂：** UX 改进文档 §7 定义了积分差距指示器（进度条），但此组件需要知道用户积分余额和商品价格，这意味着商品列表 API 需要额外返回用户积分余额，当前 spec 的商品列表 API 未设计此字段。

**H5 WebView 兼容性：** h5-user-app spec 提到适配微信 WebView 和 APP WebView，但未提及：
- JS Bridge 调用规范（如何从 WebView 获取用户信息）
- 微信授权登录流程（OAuth2 规范）
- 离线场景处理（网络断开时的打卡队列缓存）

**打卡时段的跨日问题：** 时段规则仅定义了 start_time 和 end_time，未考虑：
- 跨日时段（如 22:00-06:00）的处理
- 打卡日期归属（22:30 打卡算当天还是次日？）

### 1.4 商业模式审查

**积分经济模型有结构性风险：**
- 积分发放规则由企业自主配置，平台仅设每日上限
- 无平台级"积分通胀率"实时监控（商业改进文档有设计但标为 Phase 2）
- 积分与人民币比率 100:1 固定，但企业配置规则可随意放大发放量
- 建议 MVP 即实现平台级发放量监控告警

**平安健康对接范围模糊：**
- 商业改进文档提出跳转平安健康 App 完成现金支付
- 但主 spec 的 virtual-mall 定义的是自建虚拟商品体系（券码/直充/权益）
- 两套方案并存，需明确 MVP 阶段采用哪一套

## 1.5 产品专家总结

| 维度 | 评分 | 说明 |
|------|------|------|
| 核心链路完整性 | 85% | 主链路完整，退款/过期为后补 |
| 规格一致性 | 65% | 三套等级定义冲突，两套商城方案并存 |
| 用户体验 | 80% | UX 规范详尽，但部分场景断裂 |
| 商业闭环 | 70% | 变现模式清晰但实现路径有歧义 |
| 通知/消息 | 30% | 几乎空白，多个场景依赖通知 |

---

# 二、架构师报告

**审查人:** 架构师
**审查维度:** 架构扩展性、可维护性、技术选型、模块边界

## 2.1 模块划分评估

### 2.1.1 后端模块 — 合理但有耦合风险

| 模块 | 职责清晰度 | 问题 |
|------|-----------|------|
| carbon-common | ✅ 清晰 | 统一响应、异常、常量 |
| carbon-system | ⚠️ 过重 | 同时承担用户、租户、RBAC、认证四个领域，建议拆分为 carbon-auth + carbon-tenant |
| carbon-checkin | ✅ 清晰 | 打卡业务 |
| carbon-points | ⚠️ 边界模糊 | 同时包含积分引擎和积分账户，应拆分为 carbon-rule-engine + carbon-account |
| carbon-mall | ✅ 清晰 | 商品与兑换 |
| carbon-report | ✅ 清晰 | 报表 |
| carbon-app | ✅ 清晰 | 启动入口 |

**核心问题：carbon-checkin → carbon-points 循环依赖风险。** 打卡成功后调用积分引擎计算积分，积分引擎又可能触发连续打卡奖励（回调打卡模块）。当前设计中这通过 check-in spec §7.1 的"检查连续打卡"实现，但这意味着 carbon-checkin 需要知道连续打卡规则（属于 carbon-points 的 point-engine），形成双向依赖。

**建议:** 引入事件驱动解耦。打卡成功后发布 `CheckInCompletedEvent`，积分引擎监听后计算积分并发放，连续打卡奖励通过 Outbox 模式异步处理。

### 2.1.2 前端 Monorepo — 结构合理

H5 和 Dashboard 分离的决策正确。packages 共享层设计合理。但需注意：
- `packages/api` 需要同时支持 H5（移动端偏好更小的 bundle）和 Dashboard（桌面端）
- 状态管理 React Query + Zustand 的分层合理
- 建议在 packages 层增加 `packages/types` 共享 TypeScript 类型定义

## 2.2 技术选型评估

| 选型 | 评估 | 风险 |
|------|------|------|
| Spring Boot 3.x + Java 21 | ✅ 成熟，长期支持 | 无 |
| MyBatis-Plus 多租户拦截器 | ✅ 成熟方案 | @InterceptorIgnore 绕过需严格审计 |
| JWT (access + refresh) | ⚠️ 有改进空间 | 技术改进文档已识别 localStorage 风险并提出 Cookie 方案 |
| Argon2id 密码哈希 | ✅ 业界最佳 | 64MB 内存/次登录，需做线程池隔离 |
| Redis (分布式锁 + 缓存 + Token) | ⚠️ 单点依赖 | Redis 不可用时系统大面积不可用 |
| React 18 + Ant Design 5 | ✅ 成熟 | 无 |
| Maven 多模块 | ✅ 标准 | 无 |
| pnpm Monorepo | ✅ 标准 | 无 |

**Redis 单点故障风险是架构层面最大的技术债务。** 从技术改进文档的测试策略表中可以看到，Redis 不可用时几乎所有核心功能都会抛出 `ServiceUnavailableException`：
- Token 刷新失败
- 分布式锁获取失败
- 限流失效
- 幂等性保证失效
- RBAC 权限缓存丢失

**建议:**
1. Redis 部署为 Sentinel/Cluster 模式（至少 3 节点）
2. 关键路径实现本地缓存降级（如 RBAC 权限 → 本地 Caffeine 缓存）
3. 限流服务实现内存滑动窗口降级
4. 添加 Redis 连接池健康检查和熔断器

### 2.3 积分规则引擎架构

当前设计为 JSON config + 规则链，评估：

**优点:**
- 规则类型可扩展（新增 type 枚举即可）
- 规则数据量小（每企业几十条），内存执行无性能问题
- 执行顺序固定，结果可预测

**问题:**
1. **规则链顺序硬编码：** 6 步计算链的顺序在代码中固定，如果企业需要自定义顺序则不支持。当前场景下可以接受，但若未来有"先检查上限再计算加成"的需求则需要重构。
2. **规则配置无版本管理：** 企业管理员修改规则后立即生效，无灰度发布、无回滚能力。建议增加规则版本号和生效时间。
3. **规则之间无互斥/依赖定义：** 例如"特殊日期 3 倍"和"每日上限 100 积分"的组合效果可能是非预期的。建议增加规则组合预览功能。

### 2.4 事务与一致性

**积分计算事务设计（技术改进文档 §6）评估：**

当前设计使用 `@Transactional` + Outbox 模式，基本合理。但存在以下问题：

1. **Outbox 轮询间隔 5 秒太短：** 对于 MVP 阶段，积分奖励的实时性要求不高，建议改为 30 秒或 1 分钟，减少数据库压力。
2. **Outbox 无死信处理：** 重试次数无上限，建议设为 3 次后进入死信队列。
3. **连续打卡奖励使用 `REQUIRES_NEW` 事务：** 设计意图正确（奖励失败不影响主流程），但 Outbox 状态和奖励发放的原子性需要保证。建议 Outbox 写入在主事务内，奖励执行在定时任务中。

### 2.5 API 设计

**URL 路径版本控制（技术改进文档 §8）评估：**

`/api/v1/` 前缀方案合理。但有以下问题：

1. **所有 API 都需要加版本前缀：** 当前 spec 中所有 API 都写成 `/api/enterprise/members` 形式，未包含版本前缀，需统一修改。
2. **版本兼容性映射硬编码：** `VersionCompatibilityMap` 的 COMPATIBILITY 映射写在代码中，建议外部化为配置文件。
3. **无 API 限流分层：** 当前限流设计仅覆盖认证端点，业务 API 无限流。建议实现 per-tenant 和 per-user 两级限流。

### 2.6 架构师总结

| 维度 | 评分 | 说明 |
|------|------|------|
| 模块划分 | 80% | 大体合理，system 和 points 模块过重 |
| 技术选型 | 85% | 成熟栈，Redis 单点风险需缓解 |
| 扩展性 | 75% | 规则引擎可扩展，但耦合度偏高 |
| 事务一致性 | 80% | Outbox 方案合理，细节需调整 |
| API 设计 | 70% | 版本策略好，但未全面落地 |

---

# 三、安全与风控报告

**审查人:** 安全与风控专家
**审查维度:** 数据安全、防刷积分、认证授权、合规风险

## 3.1 已识别并解决的风险

技术改进文档已覆盖以下关键安全问题，设计基本合理：

| 风险 | 解决方案 | 评估 |
|------|---------|------|
| 平台管理员跨租户数据泄露 | PlatformAdminSecurityContext + 白名单 + 审计 | ✅ 方案完整 |
| JWT 存 localStorage 的 XSS 风险 | httpOnly Cookie + SameSite=Strict | ✅ 方案完整 |
| 认证端点暴力破解 | Redis 滑动窗口 + 渐进延迟 | ✅ 方案完整 |
| 订单重复提交 | 幂等性 Key + SETNX | ✅ 方案完整 |
| Token 并发刷新 | Refresh Token 旋转 + 原子操作 | ✅ 方案完整 |

## 3.2 仍存在的安全风险

### 3.2.1 [严重] 打卡积分防刷 — 覆盖不足

当前防刷措施：
- 数据库唯一索引（user_id + 日期 + 时段规则 ID） ✅
- Redis 分布式锁 ✅
- 每日积分上限 ✅

**缺失的防刷维度：**

| 攻击场景 | 当前防护 | 缺口 |
|----------|---------|------|
| 多设备同时打卡 | 分布式锁 ✅ | — |
| 修改手机时间欺骗时段校验 | 无 | 服务端应以服务器时间为准（spec 已隐含，需显式声明） |
| 机器人自动打卡 | 无 | 缺少设备指纹、行为验证码 |
| 批量注册虚拟用户刷积分 | 邀请链接有使用次数限制 | 但无手机号验证（注册仅需手机号+密码，未要求短信验证码） |
| 管理员手动发放积分无审批 | 无 | 任何有 point:add 权限的人可直接发放，无二次确认/审批流程 |
| 积分规则配置过于宽松 | 仅每日上限 | 无平台级"单次打卡最大积分"限制 |

**建议:**
1. 注册流程强制短信验证码验证手机号真实性
2. 打卡 API 增加设备指纹校验，同一设备短时间内仅允许一个账号打卡
3. 管理员手动发放积分增加审批流程或双重确认
4. 增加平台级积分规则上限（如单次打卡不超过 100 分、每日不超过 500 分）

### 3.2.2 [严重] 批量导入用户的安全风险

user-management spec 定义了管理员上传 Excel 批量导入用户，但：

- **无文件类型/大小校验规格：** 恶意文件上传风险
- **无导入频率限制：** 可反复导入大量用户
- **默认密码策略未定义：** 批量创建的用户使用什么默认密码？如果统一默认密码，新用户首次登录是否强制修改？
- **Excel 解析库的安全风险：** Apache POI 处理恶意 Excel 文件可能导致 XXE 或 DoS

**建议:**
1. 限制上传文件大小（如 5MB）和行数（如 1000 行）
2. 定义默认密码策略（随机密码 + 首次登录强制修改）
3. 增加导入操作审计日志
4. POI 使用 SAX 模式解析避免 OOM

### 3.2.3 [中等] RBAC 权限缓存刷新的竞态条件

rbac spec 定义"角色权限变更时主动刷新缓存"，但：
- 刷新是删除缓存还是覆盖写入？
- 如果是删除，在高并发场景下可能导致大量请求同时穿透到数据库
- 如果角色变更频繁（如批量调整），可能导致缓存抖动

**建议:** 使用版本号机制，角色变更时写入新版本数据，读取时优先读新版本，旧版本延迟淘汰。

### 3.2.4 [中等] 邀请链接无认证要求

当前设计：用户打开邀请链接即可注册并绑定企业。攻击者可以：
1. 获取邀请链接后批量注册虚拟账号
2. 邀请链接的邀请码暴露在 URL 中，可被猜测或暴力枚举

**建议:**
1. 邀请码使用加密随机字符串（至少 16 位）
2. 注册时强制短信验证码
3. 邀请链接设置使用次数上限（已有）+ 单 IP 使用次数限制

### 3.2.5 [中等] 敏感数据保护不足

| 数据 | 当前状态 | 风险 |
|------|---------|------|
| 用户手机号 | 明文存储和返回 | 隐私泄露，应脱敏返回（138****8888） |
| 用户密码 | Argon2id 哈希 ✅ | — |
| 积分余额 | 明文存储 | 大额积分账户可能成为攻击目标 |
| 审计日志 | 明文存储 | 包含敏感操作记录，应考虑日志加密 |
| JWT | Cookie httpOnly ✅ | — |

### 3.2.6 [低] CSP 策略过于宽松

技术改进文档 §2.2.3 的 CSP 策略包含 `'unsafe-inline'`，这削弱了 XSS 防护。建议：
- 使用 nonce-based CSP 替代 unsafe-inline
- script-src 使用 `'nonce-{random}'` 或 `'strict-dynamic'`

## 3.3 合规风险

### 3.3.1 个人信息保护法（PIPL）合规

| 要求 | 当前状态 | 缺口 |
|------|---------|------|
| 用户同意机制 | 未提及 | 需在注册时获取明确同意 |
| 数据最小化 | 手机号+昵称 | ✅ 合理 |
| 被遗忘权 | 产品改进文档有方案 | ✅ 已覆盖 |
| 数据导出权 | 产品改进文档有方案 | ✅ 已覆盖 |
| 数据跨境传输 | 未提及 | 如有跨境需求需额外处理 |
| 敏感个人信息 | 未分类 | 手机号为个人信息，需明确告知 |

### 3.3.2 审计日志保留期限

product-improvement §6.2.3 定义审计日志保留 3 年。需确认是否满足行业监管要求（金融/医疗行业可能要求 5-7 年）。

## 3.4 安全与风控总结

| 维度 | 评分 | 说明 |
|------|------|------|
| 已识别风险覆盖 | 90% | 技术改进文档质量高 |
| 打卡防刷 | 60% | 基础防护有，高级防刷缺失 |
| 认证安全 | 85% | 多层防护，Argon2 加分 |
| 数据保护 | 65% | 手机号明文、缓存竞态 |
| 合规性 | 70% | PIPL 需补全 |

---

# 四、DBA 报告

**审查人:** DBA
**审查维度:** 表结构设计、索引策略、范式分析、分库分表策略、数据增长预估

## 4.1 表结构设计审查

### 4.1.1 整体评估

从所有 spec 文档汇总，核心表约 25-30 张，分布在以下领域：

| 领域 | 表数量 | 设计质量 |
|------|--------|---------|
| 租户/用户 | ~6 张 | 基本合理 |
| RBAC | ~4 张 | 标准设计 |
| 打卡/积分 | ~4 张 | 需要优化 |
| 商品/订单 | ~4 张 | 有改进文档扩充 |
| 荣誉体系 | ~4 张 | 缺少索引设计 |
| 运营 | ~5 张 | 新增表待审查 |

### 4.1.2 [严重] 打卡记录表 — 缺少关键索引

check-in spec 要求唯一索引 `UNIQUE(user_id, checkin_date, time_slot_rule_id)`。这是正确的，但还需：

**缺失索引：**
```sql
-- 打卡记录高频查询场景分析
-- 场景1: 用户查自己的打卡历史 → WHERE user_id = ? ORDER BY checkin_date DESC
-- 需要: INDEX(user_id, checkin_date)

-- 场景2: 管理员查本企业所有打卡记录 → WHERE tenant_id = ? AND checkin_date = ?
-- 需要: INDEX(tenant_id, checkin_date)

-- 场景3: 计算连续打卡天数 → WHERE user_id = ? AND checkin_date >= ?
-- 需要: INDEX(user_id, checkin_date) -- 已被场景1覆盖

-- 场景4: 统计今日打卡人数 → WHERE tenant_id = ? AND checkin_date = ?
-- 需要: INDEX(tenant_id, checkin_date) -- 已被场景2覆盖
```

**建议索引：**
```sql
CREATE TABLE check_in_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    time_slot_rule_id BIGINT NOT NULL,
    checkin_date DATE NOT NULL,
    base_points INT NOT NULL,
    final_points INT NOT NULL,
    multiplier DECIMAL(5,2) DEFAULT 1.0,
    level_coefficient DECIMAL(5,2) DEFAULT 1.0,
    consecutive_days INT DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 唯一约束（防重复打卡）
    UNIQUE KEY uk_user_date_slot (user_id, checkin_date, time_slot_rule_id),

    -- 高频查询索引
    INDEX idx_tenant_date (tenant_id, checkin_date),
    INDEX idx_user_date (user_id, checkin_date),

    -- tenant_id 必须存在以配合 MyBatis-Plus 拦截器
    -- 拦截器会自动追加 WHERE tenant_id = ?，因此 tenant_id 需在联合索引首位
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 4.1.3 [严重] 积分流水表 — 增长量最大的表

point_transactions 是全平台增长最快的表，估算：
- 假设 100 家企业，每企业平均 200 用户，每人每日 3 次打卡
- 日增量：100 × 200 × 3 = 60,000 行
- 年增量：~2200 万行
- 加上兑换、手动发放等操作，年增量约 2500-3000 万行

**必须的设计决策：**

```sql
CREATE TABLE point_transactions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    amount INT NOT NULL,          -- 正数为获得，负数为消耗
    type VARCHAR(30) NOT NULL,    -- check_in/exchange/manual_add/manual_deduct/streak_bonus/expire/...
    reference_id VARCHAR(64),     -- 关联业务ID（打卡记录ID/订单ID）
    balance_after INT NOT NULL,   -- 变动后余额
    remark VARCHAR(200),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 高频查询索引
    INDEX idx_user_created (user_id, created_at),           -- 用户查流水
    INDEX idx_tenant_type_created (tenant_id, type, created_at),  -- 管理员按类型筛选
    INDEX idx_tenant_created (tenant_id, created_at),       -- 管理员查全部流水
    INDEX idx_reference (type, reference_id),                -- 按关联ID反查
    INDEX idx_expire_time (expire_time)                      -- 积分过期检查（如实现FIFO过期）
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**分区策略建议：**
- 按 `created_at` 做 RANGE 分区，每季度一个分区
- 历史分区可归档到冷存储
- 保留最近 12 个月的热数据在线上

```sql
ALTER TABLE point_transactions PARTITION BY RANGE (TO_DAYS(created_at)) (
    PARTITION p2026q2 VALUES LESS THAN (TO_DAYS('2026-07-01')),
    PARTITION p2026q3 VALUES LESS THAN (TO_DAYS('2026-10-01')),
    PARTITION p2026q4 VALUES LESS THAN (TO_DAYS('2027-01-01')),
    PARTITION p2027q1 VALUES LESS THAN (TO_DAYS('2027-04-01')),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);
```

### 4.1.4 [中等] 用户表设计缺失

所有 spec 文档都引用了 users 表，但没有一份给出完整的 DDL。从各 spec 反推：

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,                    -- 多租户隔离
    phone VARCHAR(20) NOT NULL,                   -- 登录账号
    password_hash VARCHAR(255) NOT NULL,          -- Argon2id 哈希
    nickname VARCHAR(50),                         -- 昵称
    avatar VARCHAR(500),                          -- 头像URL
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active/disabled/deleted
    level INT NOT NULL DEFAULT 1,                 -- 用户等级 1-5
    total_points INT NOT NULL DEFAULT 0,          -- 累计积分
    available_points INT NOT NULL DEFAULT 0,      -- 可用积分
    frozen_points INT NOT NULL DEFAULT 0,         -- 冻结积分（兑换中）
    consecutive_days INT NOT NULL DEFAULT 0,      -- 当前连续打卡天数
    last_checkin_date DATE,                       -- 最后打卡日期
    department_id BIGINT,                         -- 部门ID
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- 唯一约束：同一手机号只能注册一次
    UNIQUE KEY uk_phone (phone),
    -- 或者同一租户内唯一：UNIQUE KEY uk_tenant_phone (tenant_id, phone)

    -- 高频查询索引
    INDEX idx_tenant_status (tenant_id, status),
    INDEX idx_department (department_id),
    INDEX idx_last_checkin (last_checkin_date)     -- 连续打卡检查
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**关键设计问题 — 手机号唯一范围：**
- 方案 A: 全局唯一（uk_phone）— 一个手机号只能属于一个企业，与 spec "一人仅属一企业"一致
- 方案 B: 租户内唯一（uk_tenant_phone）— 允许同一手机号在不同企业注册

spec 明确"一人仅属一企业"，应使用方案 A。

**另一个问题：** `available_points` 和 `frozen_points` 存在 users 表中，每次积分变动需要 `UPDATE users SET available_points = available_points + ?`。在高并发场景下：
- 多次打卡/兑换同时操作同一用户的积分 → 行锁竞争
- 建议：积分余额更新使用乐观锁（version 字段）或 `UPDATE ... WHERE available_points >= ?` 的条件更新

### 4.1.5 [中等] RBAC 表设计

```sql
-- 标准设计，基本合理
CREATE TABLE roles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    is_preset TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant_name (tenant_id, name)
);

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    INDEX idx_role (role_id)                      -- 角色变更时批量刷新缓存
);

CREATE TABLE role_permissions (
    role_id BIGINT NOT NULL,
    permission_code VARCHAR(50) NOT NULL,         -- 如 enterprise:member:create
    PRIMARY KEY (role_id, permission_code)
);
```

**问题：** `role_permissions` 缺少 `permissions` 表作为权限定义的来源。spec 提到"权限定义表"包含 6 模块约 25 个权限点，但没有 DDL。

```sql
CREATE TABLE permissions (
    code VARCHAR(50) PRIMARY KEY,                 -- enterprise:member:create
    module VARCHAR(30) NOT NULL,                  -- enterprise:member
    operation VARCHAR(20) NOT NULL,               -- create
    description VARCHAR(100),
    sort_order INT DEFAULT 0,
    INDEX idx_module (module)
);
```

### 4.1.6 [中等] 排行榜数据 — 实时计算 vs 缓存

honor-system-mvp-design 定义排行榜每小时更新，缓存到 Redis。这意味着：
- 排行榜数据不需要持久化到 MySQL
- 但需要 Redis Sorted Set 结构存储
- 排行榜历史数据（如上周排行）需要定期快照到 MySQL

**建议增加排行榜快照表：**
```sql
CREATE TABLE leaderboard_snapshot (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    snapshot_type VARCHAR(20) NOT NULL,    -- today/week/history/department
    snapshot_date DATE NOT NULL,
    rank_data JSON NOT NULL,               -- [{rank, userId, nickname, points}]
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant_type_date (tenant_id, snapshot_type, snapshot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 4.2 范式与冗余分析

### 4.2.1 合理的冗余

| 冗余字段 | 所在表 | 来源 | 原因 |
|----------|--------|------|------|
| `total_points` / `available_points` | users | point_transactions 聚合 | 避免每次查询 SUM |
| `consecutive_days` | users | check_in_records 计算 | 避免每次打卡时回溯计算 |
| `product_name` | exchange_orders | products | 商品下架后仍需显示订单 |
| `balance_after` | point_transactions | users 积分余额 | 流水查询时无需关联 users |

这些冗余是合理的，属于经典的 OLTP 优化。

### 4.2.2 不合理的冗余

| 问题 | 影响 |
|------|------|
| `point_transactions.balance_after` 需要与 `users.available_points` 保持一致 | 如果并发更新，可能不一致 |
| `users.consecutive_days` 需要每日检查是否中断 | 定时任务失败会导致数据漂移 |
| 荣誉体系的 `user_level.total_checkin_days` 与 `check_in_records` 聚合 | 两处数据可能不同步 |

**建议：** 对关键冗余字段增加定期校验任务（如每日凌晨比对 users.total_points 与 SUM(point_transactions)），发现不一致时自动修复并告警。

## 4.3 分库分表策略

### 4.3.1 当前阶段 — 不需要分库分表

预估规模：
- 100 家企业 × 平均 200 用户 = 20,000 用户
- 年打卡记录：~2000 万行
- 年积分流水：~2500 万行

MySQL 单表支持千万级数据无压力（配合合适的索引和分区），当前阶段不需要分库分表。

### 4.3.2 扩展到 1000+ 企业时的方案

当数据量达到以下阈值时考虑分表：
- point_transactions 超过 1 亿行
- check_in_records 超过 5000 万行

**推荐方案：按 tenant_id 分表**
- 使用 ShardingSphere 或 MyBatis-Plus 分表插件
- 每个租户的逻辑数据隔离到独立分片
- 分片规则：`point_transactions_{tenant_id % 16}`
- 最多 16 个物理表，每个物理表承载约 60 个租户

**不推荐方案：**
- 按企业独立建库（运维成本过高）
- 按用户 ID 分表（MyBatis-Plus 拦截器按 tenant_id 过滤，按 user_id 分表会导致跨分片查询）

## 4.4 字符集与排序规则

所有表应统一使用：
```sql
ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

- `utf8mb4` 支持 Emoji（用户昵称可能包含）
- `unicode_ci` 排序正确处理中文

## 4.5 数据一致性校验清单

| 校验项 | 频率 | 方法 |
|--------|------|------|
| users.total_points = SUM(point_transactions WHERE amount > 0) | 每日 | 定时任务 |
| users.available_points = SUM(point_transactions) | 每日 | 定时任务 |
| products.stock + 已兑换数 = 初始库存 | 每日 | 定时任务 |
| users.consecutive_days 与 check_in_records 连续性 | 每日 | 定时任务 |
| user_level.total_checkin_days = COUNT(DISTINCT checkin_date FROM check_in_records) | 每日 | 定时任务 |

## 4.6 DBA 总结

| 维度 | 评分 | 说明 |
|------|------|------|
| 表结构设计 | 70% | 分散在多个文档，缺少完整 DDL |
| 索引策略 | 55% | 仅定义了唯一索引，查询索引严重缺失 |
| 范式/冗余 | 80% | 冗余合理但缺少一致性校验 |
| 分区/分表 | 85% | 当前阶段不需要，有清晰的扩展路径 |
| 数据增长预估 | 75% | 有考虑但未在 spec 中量化 |

---

# 五、Lead 汇总：关键冲突与改进建议

## 5.1 必须立即解决的冲突

| # | 冲突 | 涉及方 | 严重度 | 建议 |
|---|------|--------|--------|------|
| **C1** | **三套用户等级定义冲突** | 产品 + 架构 | 🔴 阻塞 | 召集产品团队统一为单一等级方案。建议以累计积分为准（与积分引擎对齐），取消打卡天数方案 |
| **C2** | **两套商城方案并存**（自建虚拟商品 vs 平安健康跳转） | 产品 | 🔴 阻塞 | 明确 MVP 阶段方案。建议 MVP 用自建虚拟商品（spec 已完整），平安健康对接作为 Phase 2 |
| **C3** | **订单状态机不一致**（virtual-mall spec: pending→fulfilled→used/expired vs 产品改进: pending→paid→fulfilled→cancelled/expired） | 产品 + DBA | 🔴 阻塞 | 统一状态机，增加 paid 和 frozen 状态支持混合支付场景 |
| **C4** | **产品改进文档与主 spec 未同步**（积分过期、退款等仅在改进文档中） | 全体 | 🟡 高 | 将产品改进文档的 P0 内容合并回主 spec，确保开发团队以 spec 为准 |
| **C5** | **API 路径缺少版本前缀** | 架构 | 🟡 高 | 所有 API 路径统一改为 `/api/v1/...` 格式 |

## 5.2 高优先级改进建议

| # | 建议 | 负责人 | 工时估算 |
|---|------|--------|---------|
| **R1** | 新增 `notification` 模块 spec | 产品 | 2d |
| **R2** | 补全所有表的完整 DDL（含索引） | DBA | 3d |
| **R3** | 打卡防刷增强（设备指纹 + 注册短信验证 + 积分发放审批） | 安全 | 3d |
| **R4** | Redis 高可用部署方案（Sentinel/Cluster）+ 本地缓存降级 | 架构 | 2d |
| **R5** | 用户手机号脱敏返回（列表和详情 API） | 安全 + 架构 | 1d |
| **R6** | 积分流水表分区策略设计 | DBA | 1d |
| **R7** | 解耦 carbon-checkin ↔ carbon-points 双向依赖（事件驱动） | 架构 | 2d |
| **R8** | 新增 PIPL 合规条款（用户同意、隐私政策） | 安全 | 2d |
| **R9** | 定义跨日时段规则处理逻辑 | 产品 | 0.5d |
| **R10** | 统一数据导出格式（JSON + CSV vs Excel） | 产品 | 0.5d |

## 5.3 规格文档质量总评

| 文档 | 完整度 | 一致性 | 可执行性 |
|------|--------|--------|---------|
| 12 模块 spec | 85% | 70% | 80% |
| design.md (架构决策) | 90% | 85% | 75% |
| tasks.md (任务列表) | 95% | 90% | 90% |
| UX 改进 | 95% | 95% | 90% |
| 技术改进 | 90% | 85% | 80% |
| 商业改进 | 80% | 60% | 65% |
| 产品改进 | 85% | 70% | 75% |
| 荣誉体系 MVP | 85% | 50% | 70% |

## 5.4 最终建议

**在进入开发阶段前，必须完成以下三件事：**

1. **规格仲裁会议：** 解决 C1-C3 三个阻塞性冲突，统一等级体系、商城方案和订单状态机
2. **Spec 合并：** 将改进文档中的 P0 内容（积分过期、订单退款、用户生命周期）合并回主 spec，消除"源文档"歧义
3. **DDL 定稿：** DBA 基于合并后的 spec 输出完整 DDL 文件（含索引、分区策略），作为 Flyway 迁移脚本的基础

完成以上三项后，团队即可按 tasks.md 的 14 组任务有序进入开发阶段。

---

*报告完毕。各专家可在后续会议上就具体问题进行深入讨论。*

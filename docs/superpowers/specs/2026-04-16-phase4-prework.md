# Phase 4 架构评审前置工作

**评估日期:** 2026-04-16
**评估人:** 首席架构师
**状态:** Phase 4 前置预审（非正式评审）

---

## 一、积分引擎架构预审

### 1.1 计算链顺序验证 ✅

路径: `carbon-points/service/PointEngineService.calculate()`

| 步骤 | 代码位置 | 验证 |
|------|----------|------|
| 1. 时段匹配 | `calculateBasePoints()` - 随机 min~max | ✅ |
| 2. 特殊日期倍率 | `getSpecialDateMultiplier()` | ✅ |
| 3. 等级系数 | `LevelConstants.getCoefficient()` | ✅ |
| 4. 四舍五入 | `Math.round(rawPoints)` | ✅ |
| 5. 每日上限 | `dailyLimit - dailyAwarded` | ✅ |
| 6. 连续奖励 | `checkAndAwardStreakReward()` 独立调用 | ✅ |

**每日上限实现验证:**
```java
// dailyAwarded = sum of finalPoints (not basePoints) from check_in_records
int awarded = checkInRecordQueryMapper.sumFinalPointsToday(userId, todayStr);
// cap applied: allowed = dailyLimit - awarded
if (dailyLimit > 0 && dailyAwarded + roundedPoints > dailyLimit) {
    roundedPoints = allowed; // truncated, not rejected
}
```
✅ 正确：cap 在等级放大之后，且 streak bonus 不计入 `dailyAwarded`

**连续奖励不计入每日上限验证:**
```java
// Step 6 is called AFTER the main transaction
if (consecutiveDays > 0) {
    pointEngine.checkAndAwardStreakReward(userId, consecutiveDays);
}
// streak_bonus is saved separately to check_in_records.streak_bonus = 0
```
✅ 正确：streak bonus 通过独立事务发放，不影响每日上限

### 1.2 PointCalcResult 字段分析

| 字段 | 类型 | 说明 | 状态 |
|------|------|------|------|
| basePoints | int | 随机基础积分 | ✅ |
| multiplierRate | double | 特殊日期倍率 | ✅ |
| levelMultiplier | double | 等级系数 | ✅ |
| finalPoints | int | 四舍五入后积分 | ✅ |
| extraPoints | int | 连续奖励 (默认0) | ✅ 设计分离 |
| totalPoints | int | finalPoints + extraPoints | ✅ |
| dailyCapHit | boolean | 是否触及上限 | ✅ |

**extraPoints 说明:** `int` 原始类型默认值 0。连续奖励通过 `checkAndAwardStreakReward()` 独立事务发放，`streak_bonus` 字段写入 0 是**正确的**（因为奖励不通过 calcResult 传递）。

### 1.3 潜在风险点

| 风险 | 描述 | 严重度 |
|------|------|--------|
| `sumFinalPointsToday` 查询性能 | 每日上限依赖 sum 查询，大数据量时可能慢 | 🟡 建议加索引 |
| `getRulesByType` 每次查询 DB | 时段匹配每次查 DB，无缓存 | 🟢 低 |
| 特殊日期规则空指针 | `getSpecialDateMultiplier` 返回 null 时 multiplierRate=1.0 | ✅ 有保护 |

---

## 二、订单状态机架构预审

### 2.1 状态流转图

```
pending
  ├── fulfill (瞬时) → fulfilled ──→ used (核销)
  │                          └──→ expired (过期)
  └── cancel (用户/管理员) → cancelled
```

### 2.2 各路径实现验证

| 路径 | 方法 | 状态 |
|------|------|------|
| pending → fulfilled | `exchange()` 同一方法内完成 | ✅ 虚拟商品即时发放 |
| pending → cancelled (用户) | `cancelOrder()` | ✅ 解冻积分 + 回滚库存 |
| pending → cancelled (管理员) | `adminCancelOrder()` | ✅ 同上 |
| pending → expired | `@Scheduled` 每5分钟 | ✅ 15min超时 + 解冻 + 回滚 |
| fulfilled → used | `fulfillOrder()`, `redeemByCouponCode()`, `userConfirmUse()` | ✅ |
| fulfilled → expired | `@Scheduled` 每日2AM | ✅ 仅改状态，不涉及积分 |

### 2.3 关键设计决策

**决策 1: pending → fulfilled 在同一方法内完成**

```java
public ExchangeOrder exchange(Long userId, Long productId) {
    // freeze points
    pointAccountService.freezePoints(...);
    // create order with status="pending"
    exchangeOrderMapper.insert(order);
    // fulfill virtual product
    String couponCode = fulfillProduct(order, product);
    // update status to "fulfilled"
    order.setOrderStatus("fulfilled");
    exchangeOrderMapper.updateById(order);
    // confirm frozen points consumed
    pointAccountService.confirmFrozenPoints(...);
}
```

✅ **正确**：虚拟商品无需异步处理，fulfillment 是瞬时的，所以 pending 状态只是中间态。

**问题**: `fulfillProduct()` 如果抛出异常，整个事务回滚，积分冻结但订单未创建。需要确认 `fulfillProduct()` 足够简单不会失败。

**决策 2: 库存乐观锁**

```java
int rows = productMapper.deductStockWithVersion(latest.getId(), latest.getVersion());
// WHERE id=? AND version=? AND stock > 0
if (rows == 1) { /* success */ }
```

✅ 正确实现。

### 2.4 潜在风险点

| 风险 | 描述 | 严重度 |
|------|------|--------|
| pending 订单并发兑换 | 同一商品两个用户同时 pending，库存扣减顺序 | ✅ 有乐观锁 |
| `deductStockWithVersion` 条件包含 `stock > 0` | 库存为0时跳过，更新0行 → 抛异常 | ✅ 有保护 |
| `restoreStockWithRetry` 3次失败后静默 | 取消订单时库存回滚失败 | 🟡 需监控/告警 |
| 直充/权益类型未实现 | `fulfillProduct()` 对 recharge/privilege 只打日志 | 🟢 Phase 2 |

---

## 三、RBAC 架构预审（租户隔离分析）

### 3.1 表结构分析

| 表 | tenant_id 列 | DDL | Entity | 租户隔离方式 |
|----|-------------|------|--------|-------------|
| permissions | 无 | ❌ | ❌ | 全局（平台共享）✅ |
| roles | 有 | ✅ | ✅ | `TenantLineInnerInterceptor` |
| role_permissions | 无 | ❌ | ⚠️ Entity有DDL无 | 通过 Role → tenant_id 间接隔离 ✅ |
| user_roles | 无 | ❌ | ⚠️ Entity有DDL无 | 通过 Role → tenant_id 间接隔离 ⚠️ |

### 3.2 租户隔离机制验证

**UserRole 表缺少 tenant_id 列（DDL vs Entity 不一致）**

- **DDL** (`carbon-point-schema.sql:145-151`):
```sql
CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id)
    -- 无 tenant_id 列
);
```

- **Entity** (`UserRole.java`):
```java
@TableField("tenant_id")
private Long tenantId;  // Entity 有此字段
```

**问题:** `TenantLineInnerInterceptor` 会尝试自动填充 `tenant_id`，但 DDL 中无此列，INSERT 会失败。

**缓解因素:** `user_roles` 的隔离通过 `role_id → roles → tenant_id` 实现。只要 `user_roles.user_id` 正确，租户隔离就有效。

**实际风险:** 如果直接 INSERT user_roles（绕过 Mapper 的 `@InterceptorIgnore`），会因为缺列而失败。

**RolePermission 表 - 正确设计**

- `role_permissions` 无 tenant_id 是**正确的设计**
- 权限是平台共享的（`permissions` 表也无 tenant_id）
- 角色有 tenant_id，角色的权限通过 role_id 间接隔离

### 3.3 权限查询链路

```
User → user_roles → roles (tenant_id) → role_permissions → permissions
```

JWT → TenantContext → TenantLineInnerInterceptor 自动过滤

✅ 租户隔离有效（假设 DDL 问题修复后）

### 3.4 关键发现

| 发现 | 描述 | 建议 |
|------|------|------|
| user_roles DDL 缺 tenant_id | Entity 有字段但 DDL 无列 | 需执行 DDL 迁移脚本添加该列 |
| role_permissions DDL 无 tenant_id | 正确设计，无需修改 | 保持现状 |
| 两套 JWT 实现（JwtUtil vs JwtUtils）| 不同用途：租户用户 vs 平台管理员 | 见下方详细分析 |

### 3.4 JWT 架构分析（已澄清）

**两套 JWT 实现用途不同，不应简单合并：**

| 属性 | JwtUtil (carbon-common) | JwtUtils (carbon-system) |
|------|------------------------|-------------------------|
| 使用者 | 租户用户 | 平台管理员 |
| Token 类型 | 仅 access token | access + refresh token |
| Claims | `userId`, `tenantId`, `roles` | `userId`(sub), `tenantId`, `roles`, `type`, `jti` |
| Refresh Token | 不支持 | 支持（带 jti） |
| 错误处理 | 返回 null | 抛出 JwtException |
| 配置文件 | `jwt.access-token-expiration` | `jwt.refresh-token-expiration-ms` |

**建议:**
- **不合并**：两套实现服务不同对象（租户 vs 平台），分离更清晰
- **建议**：在 `JwtUtil` 中添加 refresh token 支持，或将 `JwtUtils` 迁移到 common 模块统一管理
- **简化方案**：删除 `JwtUtil`，将 `JwtUtils` 迁移到 `carbon-common` 统一使用

---

## 四、MyBatis-Plus 拦截器配置审查

### 4.1 配置验证

**carbon-common/MyBatisPlusConfig.java:**
```java
@Bean
public MybatisPlusInterceptor mybatisPlusInterceptor() {
    interceptor.addInnerInterceptor(new TenantLineInnerInterceptor(
            new CustomTenantLineHandler()
    ));
    interceptor.addInnerInterceptor(new OptimisticLockerInnerInterceptor());
}
```

✅ **正确**: TenantLine 在 OptimisticLocker 之前，符合注释要求。

**carbon-checkin/CheckinMyBatisConfig.java:**
```java
// 空实现，仅占位符
```
✅ **正确**: 全局配置在 common，checkin 无需重复配置。

**carbon-points/PointsMyBatisConfig.java:**
> 待检查（未读取）

### 4.2 @InterceptorIgnore 使用

**正确示例** (`PermissionMapper.java`):
```java
@InterceptorIgnore(tenantLine = "true")
@Select("SELECT ... FROM permissions p " +
        "INNER JOIN role_permissions rp ON ...")
List<String> selectPermissionCodesByUserId(Long userId);
```

✅ 正确使用，避免多表 JOIN 时 tenant_id 污染。

---

## 五、安全架构预审

### 5.1 Spring Security 配置 ✅

**SecurityConfig.java 审查:**

| 配置项 | 实现 | 状态 |
|--------|------|------|
| CSRF | `AbstractHttpConfigurer::disable` | ✅ JWT stateless |
| CORS | 允许 localhost 开发端口 | ✅ 开发时安全，生产需配置 |
| Session | `STATELESS` | ✅ JWT 正确 |
| 安全响应头 | HSTS/X-Frame-Options/CSP 等 | ✅ 完整 |
| 认证入口点 | JSON 格式 401/403 | ✅ |
| `@EnableMethodSecurity` | 启用 | ✅ |

**Filter 链顺序:**
```
MDCFilter → SecurityHeadersFilter → JwtAuthenticationFilter → PlatformAuthenticationFilter
```
✅ 正确

### 5.2 密码加密 ✅

**EnhancedPasswordEncoder.java:**
- 新密码: Argon2id (内存 64MB, 并行度 4, 迭代 3 次)
- 旧密码: BCrypt 自动升级到 Argon2id
- 密码历史: 最近 5 次不可复用

✅ 符合 Phase 13 安全要求

### 5.3 安全配置化 ✅

**SecurityProperties.java:**
| 配置 | 默认值 |
|------|--------|
| Captcha 长度 | 4 位 |
| Captcha 过期 | 5 分钟 |
| 失败次数触发 Captcha | 3 次 |
| 密码最小长度 | 8 |
| 密码最少字符类型 | 3 种 |
| 密码历史 | 5 次 |
| 密码过期 | 0 (禁用) |
| 限流/IP | 5 次/5分钟窗口 |
| 限流/账户 | 5 次/5分钟窗口 |
| 账户锁定时长 | 30 分钟 |

✅ 所有安全阈值均可配置

### 5.4 安全响应头配置 ✅

- HSTS: `max-age=31536000; includeSubDomains; preload`
- X-Frame-Options: `DENY`
- Content-Security-Policy: `default-src 'self'` (生产环境)
- Referrer-Policy: `strict-origin-when-cross-origin`
- Permissions-Policy: 全部禁用

### 5.5 潜在安全观察点

| 观察点 | 描述 | 严重度 |
|--------|------|--------|
| CORS 生产配置 | `allowedOrigins` 默认仅 localhost，生产需配置 | 🟡 需确认 |
| JWT secret | 从 `@Value("${jwt.secret}")` 注入，需确认非明文配置 | 🟡 需确认 |
| refresh_token jti | `JwtUtils` 有 jti，但 Redis 存储和验证链路待确认 | 🟡 需确认 |

---

## 六、Phase 4 正式评审清单（待执行）

### 5.1 积分引擎评审清单

- [ ] `sumFinalPointsToday` 查询性能（是否需要索引 `idx_user_date_final_points`）
- [ ] 时段匹配是否有缓存机制
- [ ] 等级降级逻辑（`tenant.level_mode = flexible` 时每月降级）
- [ ] `PointRule.type = level_coefficient` 的配置结构验证
- [ ] 连续奖励的 N 天倍数触发逻辑边界测试

### 5.2 订单状态机评审清单

- [ ] pending → fulfilled 并发安全性
- [ ] fulfillProduct 异常时的回滚完整性
- [ ] restoreStockWithRetry 失败后的补偿机制
- [ ] 直充/权益类型 Phase 2 接入规范
- [ ] 订单状态流转的幂等性验证

### 5.3 RBAC 评审清单

- [ ] DDL user_roles 添加 tenant_id 列的迁移脚本
- [ ] 两套 JWT 实现合并方案
- [ ] 权限缓存 Redis 的 key 过期策略
- [ ] 超管保护逻辑的实际验证
- [ ] Permission Package 变更时权限刷新链路

### 5.4 安全评审清单

- [ ] JWT secret 配置（是否从环境变量注入）
- [ ] Argon2id 参数配置（时间/内存/并发度）
- [ ] 登录限流 Redis key 的过期时间
- [ ] 账户锁定后的解锁机制
- [ ] 密码历史记录的检查逻辑

### 5.5 多租户隔离评审清单

- [ ] `@InterceptorIgnore` 使用位置审查（是否有遗漏）
- [ ] 跨租户查询的防护（如有 SQL 拼装）
- [ ] 平台管理员查询绕过租户拦截的方式

---

## 七、预审结论

### 可提前确认的结论

| 结论 | 置信度 | 说明 |
|------|--------|------|
| 积分计算链顺序正确 | 高 | 代码逐行验证 |
| 每日上限在等级放大之后 | 高 | 代码逻辑验证 |
| 连续奖励独立于每日上限 | 高 | 通过独立事务实现 |
| 订单状态机流转正确 | 高 | 5条路径均验证 |
| 租户隔离机制有效 | 中 | 依赖 DDL 修复 |
| 两套 JWT 用途不同（不合并）| 高 | 租户用户 vs 平台管理员 |
| Spring Security 配置正确 | 高 | CSRF/CORS/Header/Filter 均正确 |
| 密码加密 Argon2id 正确 | 高 | 升级策略正确 |
| 安全配置可配置化 | 高 | SecurityProperties 完整 |

### 需 Phase 4 正式评审确认的项

| 项 | 说明 |
|----|------|
| DDL user_roles tenant_id 不一致 | 需实际执行 DDL 验证 |
| 积分引擎查询性能 | 需大数据量压测 |
| 直充/权益 Phase 2 接入规范 | 需产品确认 |
| 等级降级逻辑 | 需验证 tenant.level_mode |
| JWT secret 生产配置 | 需确认非明文 |
| refresh_token Redis 验证链路 | 需确认 jti 校验 |
| CORS 生产环境 origins | 需确认生产配置 |

---

---

## 八、安全配置化清单（已验证）

Phase 3 统一 JWT 实现推荐方案：

**方案: 迁移 JwtUtils 到 carbon-common，统一使用**

| 步骤 | 说明 |
|------|------|
| 1 | 将 `JwtUtils` 从 `carbon-system` 迁移到 `carbon-common` |
| 2 | 保留 `JwtUtils` 的所有功能（access + refresh + jti） |
| 3 | 删除 `carbon-common/JwtUtil.java`（功能已被 JwtUtils 覆盖） |
| 4 | 更新 `carbon-system/AuthService` 使用迁移后的 `JwtUtils` |
| 5 | 统一配置文件：`jwt.secret`, `jwt.access-token-expiration-ms`, `jwt.refresh-token-expiration-ms` |

*首席架构师 Phase 4 前置工作完成 - 第二版更新*
*2026-04-16*

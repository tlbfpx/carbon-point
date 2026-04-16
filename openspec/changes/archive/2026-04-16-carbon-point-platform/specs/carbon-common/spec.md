# carbon-common 模块规格

> 本规格定义全平台统一的错误码体系、响应结构和全局异常处理规范。所有其他模块规格在遇到错误场景时 MUST 引用本规格中定义的错误码，不得自行定义新的错误码或响应格式。

## 1. 标准响应结构

所有 API 响应统一使用 `Result<T>` 包装结构：

```json
{
  "code": "CHECKIN001",
  "message": "当前时段不可打卡",
  "data": null,
  "traceId": "abc123"
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | String | 是 | 业务错误码，格式为 `{模块}_{序号}`，如 `CHECKIN001` |
| `message` | String | 是 | 面向用户的中文错误描述 |
| `data` | Object | 否 | 成功时承载业务数据，失败时为 `null` |
| `traceId` | String | 是 | 请求链路追踪 ID，用于日志排查 |

### HTTP 状态码映射

| HTTP Status | 适用场景 |
|---|---|
| 200 | 业务成功 |
| 400 | 参数校验失败、非法请求 |
| 401 | 未认证或 Token 失效 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 409 | 业务冲突（如重复打卡） |
| 429 | 请求过于频繁（限流） |
| 500 | 服务器内部错误 |

> **注意：** HTTP 状态码用于网络层判断，**具体业务错误类型由 `code` 字段区分**。即使 HTTP 200 也可能通过 `code` 传达业务级错误（如 `CHECKIN002` 已打卡）。

### 成功响应示例

```json
{
  "code": "0000",
  "message": "success",
  "data": {
    "checkinId": 12345,
    "points": 18,
    "level": "Lv.2"
  },
  "traceId": "4a7f2e1b"
}
```

> `code: "0000"` 表示业务成功，`message` 为固定 `"success"`。

---

## 2. 统一错误码定义

### 2.1 编码规范

- 每个错误码格式为 `{模块}_{序号}`，如 `CHECKIN001`
- 序号为 3 位数字（001-999），从各模块区间起始
- 错误码一旦使用不得删除或复用，只能标记为 `deprecated` 并保留原码

### 2.2 模块区间分配

| 模块前缀 | 区间 | 所属模块 |
|----------|------|----------|
| `CHECKIN` | 10001-10100 | carbon-checkin |
| `POINT` | 10201-10300 | carbon-points |
| `ORDER` | 10401-10500 | carbon-mall |
| `USER` | 10601-10700 | carbon-system |
| `MALL` | 10801-10900 | carbon-mall |
| `SYSTEM` | 19901-19999 | carbon-common |

---

### 2.3 CHECKIN 错误码 (10001-10100)

| 错误码 | HTTP Status | 错误消息 | 触发场景 |
|--------|-------------|----------|----------|
| `CHECKIN001` | 409 | 当前时段不可打卡 | 用户点击打卡时，当前时间不在任何可用时段内 |
| `CHECKIN002` | 409 | 今日该时段已打卡 | 同一时段当天重复打卡 |
| `CHECKIN003` | 400 | 打卡时段已结束 | 用户尝试在已关闭时段打卡（跨日边界等） |
| `CHECKIN004` | 404 | 打卡规则不存在 | 引用的时段规则 ID 不存在或已禁用 |
| `CHECKIN005` | 503 | 打卡服务暂时不可用，请稍后重试 | Redis 分布式锁获取失败 |
| `CHECKIN006` | 400 | 打卡日期格式错误 | 传入的日期参数格式不符 |
| `CHECKIN007` | 404 | 打卡记录不存在 | 查询或取消时引用的打卡记录不存在 |

---

### 2.4 POINT 错误码 (10201-10300)

| 错误码 | HTTP Status | 错误消息 | 触发场景 |
|--------|-------------|----------|----------|
| `POINT001` | 404 | 积分账户不存在 | 用户积分账户未初始化 |
| `POINT002` | 400 | 积分余额不足 | 积分扣减或兑换时余额不足 |
| `POINT003` | 400 | 积分已过期 | 使用过期积分（未来版本） |
| `POINT004` | 400 | 每日积分上限已达 | 打卡积分达到每日上限 |
| `POINT005` | 409 | 积分变动冲突 | 并发修改积分时乐观锁版本不匹配 |
| `POINT006` | 400 | 冻结积分不足 | 取消订单解冻时冻结余额不足 |
| `POINT007` | 400 | 积分数量无效 | 积分入参为负数或非整数 |
| `POINT008` | 404 | 积分规则不存在 | 引用的积分规则 ID 不存在 |
| `POINT009` | 409 | 等级晋升冲突 | 并发操作导致等级状态不一致 |

---

### 2.5 ORDER 错误码 (10401-10500)

| 错误码 | HTTP Status | 错误消息 | 触发场景 |
|--------|-------------|----------|----------|
| `ORDER001` | 404 | 订单不存在 | 查询或操作不存在的订单 |
| `ORDER002` | 409 | 订单状态不允许此操作 | 如对已完成的订单取消、对已取消的订单确认 |
| `ORDER003` | 409 | 订单已超时 | 等待支付超时的 pending 订单 |
| `ORDER004` | 400 | 积分不足，无法冻结 | 下单时冻结积分余额不足 |
| `ORDER005` | 400 | 订单数量无效 | 兑换数量为 0 或负数 |
| `ORDER006` | 404 | 商品不存在或已下架 | 兑换时商品已下架或库存为零 |
| `ORDER007` | 400 | 商品库存不足 | 库存为 0 或不足以满足数量 |
| `ORDER008` | 409 | 订单已使用 | 重复核销同一订单 |
| `ORDER009` | 400 | 退款积分类型不匹配 | 退款时请求的积分类型与原订单不符 |
| `ORDER010` | 400 | 不支持混合支付 | 当前版本不支持积分+现金混合支付 |

---

### 2.6 USER 错误码 (10601-10700)

| 错误码 | HTTP Status | 错误消息 | 触发场景 |
|--------|-------------|----------|----------|
| `USER001` | 404 | 用户不存在 | 根据 ID 或手机号查询用户不存在 |
| `USER002` | 409 | 用户已存在 | 注册时手机号/账号已注册 |
| `USER003` | 401 | 账号或密码错误 | 登录时凭证不匹配 |
| `USER004` | 401 | Token 已过期 | Access Token 或 Refresh Token 过期 |
| `USER005` | 403 | 无权限访问此资源 | 用户尝试访问不属于本租户的资源 |
| `USER006` | 400 | 验证码错误或已过期 | 注册/重置密码时验证码不正确或已超时 |
| `USER007` | 400 | 验证码请求过于频繁 | 60 秒内重复请求验证码 |
| `USER008` | 400 | 手机号格式错误 | 手机号不符合中国大陆 11 位格式 |
| `USER009` | 403 | 账号已被禁用 | 用户被租户管理员禁用 |
| `USER010` | 400 | 密码强度不足 | 新密码不符合安全策略（长度、复杂度） |
| `USER011` | 401 | Refresh Token 无效 | Refresh Token 被篡改或已在黑名单 |
| `USER012` | 409 | 不允许删除最后一个管理员 | 租户下删除最后一个超管账号 |

---

### 2.7 MALL 错误码 (10801-10900)

| 错误码 | HTTP Status | 错误消息 | 触发场景 |
|--------|-------------|----------|----------|
| `MALL001` | 404 | 商品不存在 | 查询或兑换不存在的商品 |
| `MALL002` | 400 | 商品未上架 | 商品处于草稿或下架状态 |
| `MALL003` | 400 | 商品库存不足 | 库存不足以满足兑换数量 |
| `MALL004` | 409 | 商品兑换限制 | 超过单人每日/每周兑换上限 |
| `MALL005` | 400 | 卡券激活失败 | 券码已使用、已过期或格式无效 |
| `MALL006` | 400 | 直充手机号格式错误 | 直充商品手机号校验失败 |
| `MALL007` | 409 | 卡券已使用 | 重复使用同一券码 |
| `MALL008` | 409 | 卡券已过期 | 使用已超过有效期 |
| `MALL009` | 404 | 优惠券不存在 | 用户尝试使用不存在的优惠券 |
| `MALL010` | 400 | 不满足优惠券使用条件 | 积分不足、订单金额不达标等 |

---

### 2.8 SYSTEM 错误码 (19901-19999)

| 错误码 | HTTP Status | 错误消息 | 触发场景 |
|--------|-------------|----------|----------|
| `SYSTEM001` | 403 | 访问被拒绝 | 用户无权限访问该接口或资源（对应 `PlatformAccessDeniedException`） |
| `SYSTEM002` | 429 | 请求过于频繁，请稍后重试 | 触发限流阈值（对应 `RateLimitExceededException`） |
| `SYSTEM003` | 503 | 服务暂时不可用，请稍后重试 | 分布式锁获取失败（对应 `LockAcquisitionException`） |
| `SYSTEM004` | 500 | 系统内部错误 | 未预期的异常捕获 |
| `SYSTEM005` | 400 | 参数校验失败 | `@Valid` 注解校验不通过 |
| `SYSTEM006` | 404 | 资源不存在 | 全局 404 处理 |
| `SYSTEM007` | 400 | 请求参数格式错误 | JSON 解析失败、必填参数缺失 |
| `SYSTEM008` | 502 | 第三方服务异常 | 调用外部服务（如 OSS、短信）失败 |
| `SYSTEM009` | 503 | 数据库服务不可用 | 数据库连接失败 |
| `SYSTEM010` | 503 | 缓存服务不可用 | Redis 连接失败 |

---

## 3. 全局异常映射

### 3.1 异常类定义

| 异常类 | HTTP Status | 错误码 | 说明 |
|--------|-------------|--------|------|
| `PlatformAccessDeniedException` | 403 | `SYSTEM001` | 权限校验失败 |
| `RateLimitExceededException` | 429 | `SYSTEM002` | 触发限流 |
| `LockAcquisitionException` | 503 | `SYSTEM003` | 分布式锁获取失败 |
| `BizException` | 可配置 | 可配置 | 通用业务异常基类 |
| `ValidationException` | 400 | `SYSTEM005` | 参数校验失败 |
| `ThirdPartyServiceException` | 502 | `SYSTEM008` | 第三方服务调用失败 |

### 3.2 全局异常处理器要求

- 所有异常统一由 `@ControllerAdvice` 全局处理器捕获
- 异常处理器将异常映射为标准 `Result<T>` 响应
- 所有异常响应必须包含 `traceId`，从 `slf4j MDC` 或请求头 `X-Trace-Id` 获取
- 未捕获的运行时异常统一返回 `SYSTEM004`
- 日志记录需包含：traceId、异常类型、错误码、请求路径、用户 ID（若已认证）

---

## 4. 跨模块引用要求

### 4.1 引用规范

所有其他模块的 spec.md 在遇到错误场景时 MUST 引用本规格的错误码。例如：

- check-in/spec.md 中的"不在打卡时段"场景 → 引用 `CHECKIN001`
- point-engine/spec.md 中的"积分不足"场景 → 引用 `POINT002`
- virtual-mall/spec.md 中的"商品已下架"场景 → 引用 `MALL002`

错误码引用格式：
```
> 错误码：CHECKIN001（详见 carbon-common/spec.md §2.3）
```

### 4.2 不得自行定义新错误码

其他模块 spec 不得在正文或 scenario 中自行定义错误码字符串。如有新错误码需求，须先向 carbon-common/spec.md 提交新增申请，由本规格统一分配。

### 4.3 错误消息国际化预留

当前所有 `message` 字段为中文。系统应预留 `messageKey` 字段支持未来国际化，结构扩展为：

```json
{
  "code": "CHECKIN001",
  "message": "当前时段不可打卡",
  "messageKey": "checkin.error.timeslot_unavailable",
  "data": null,
  "traceId": "abc123"
}
```

> **国际化（i18n）属于 Phase 2 范围，当前 Phase 1 实现时预留字段即可。**

---

## 5. 实现要点

### 5.1 Result<T> 泛型类

```java
public class Result<T> {
    private String code;
    private String message;
    private T data;
    private String traceId;

    public static <T> Result<T> ok(T data) { ... }
    public static <T> Result<T> fail(String code, String message) { ... }
}
```

### 5.2 ErrorCode 枚举

每个模块维护自己的错误码枚举，统一实现 `ErrorCodeInterface`：

```java
public interface ErrorCodeInterface {
    String getCode();
    String getMessage();
    int getHttpStatus();
}
```

### 5.3 BizException 工厂方法

```java
public class BizException extends RuntimeException {
    public static BizException of(ErrorCodeInterface errorCode) { ... }
    public static BizException of(ErrorCodeInterface errorCode, Object... args) { ... }
}
```

### 5.4 拦截器链顺序

1. `TenantLineInnerInterceptor` — 多租户隔离
2. `TraceIdInterceptor` — 链路追踪 ID 注入
3. `AuthInterceptor` — JWT 认证
4. `RateLimitInterceptor` — 限流
5. `PermissionInterceptor` — 权限校验
6. `@ControllerAdvice` — 全局异常处理

---

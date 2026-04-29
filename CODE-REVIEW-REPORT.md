# Carbon Point 代码审查报告

**项目**: Carbon Point - 多租户 SaaS 碳积分打卡平台
**审查日期**: 2026-04-21
**审查团队**: 后端专家 + 前端专家 + 安全专家 + 性能专家 + 代码质量专家

---

## 执行摘要

本次代码审查覆盖了 Carbon Point 项目的前后端代码，包括：
- **后端**: Spring Boot 3.x + Java 21 + MyBatis-Plus
- **前端**: React 18 + Ant Design 5 + Vite + TypeScript

| 严重程度 | 问题数量 |
|----------|----------|
| Critical | 3 |
| Major | 8 |
| Minor | 12 |
| 优化建议 | 15 |

---

## 一、严重问题 (Critical)

### 1. 安全风险 - JWT Secret 硬编码

**位置**: `saas-backend/carbon-system/src/main/java/.../JwtTokenProvider.java`

**问题描述**:
JWT 密钥可能硬编码在配置文件中或存储在代码仓库中，如果泄露将导致全部用户 Token 被伪造。

**修复建议**:
```java
// 错误示例
private final String secret = "hardcoded-secret-key";

// 正确做法
private final String secret = System.getenv("JWT_SECRET_KEY");
```

**优先级**: P0 - 立即修复

---

### 2. SQL 注入风险 - 动态 SQL 使用 `${}`

**位置**: 多处 Mapper XML 文件

**问题描述**:
使用 `${param}` 而非 `#{}` 会导致 SQL 注入攻击。`${}` 直接拼接字符串，`#{}` 使用预编译语句。

**受影响文件示例**:
- `carbon-system/src/main/resources/mapper/*Mapper.xml`
- `carbon-points/src/main/resources/mapper/*Mapper.xml`

**修复建议**:
```xml
<!-- 错误 -->
<select id="findByName" resultType="User">
  SELECT * FROM users WHERE name = '${name}'
</select>

<!-- 正确 -->
<select id="findByName" resultType="User">
  SELECT * FROM users WHERE name = #{name}
</select>
```

**优先级**: P0 - 立即修复

---

### 3. 敏感数据暴露风险

**位置**: `AuthController.java:67`

**问题描述**:
手机号脱敏虽已实现，但需全面审计所有返回用户敏感信息的接口。

**修复建议**:
- 审计所有 `/api/**` 接口返回的 DTO
- 确保密码、盐值等永不在响应中返回
- 添加敏感字段过滤工具类

**优先级**: P1 - 本周修复

---

## 二、重要问题 (Major)

### 后端问题

#### 1. 缺少全局异常处理

**位置**: 所有 Controller 层

**问题描述**:
当前每个接口都需要手动 try-catch 处理异常，应该使用 `@ControllerAdvice` 统一处理。

**当前代码**:
```java
@PostMapping("/award")
public Result<String> awardPoints(...) {
    try {
        // business logic
    } catch (Exception e) {
        return Result.error(ErrorCode.INTERNAL_ERROR);
    }
}
```

**建议实现**:
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(BusinessException.class)
    public Result<?> handleBusinessException(BusinessException e) {
        return Result.error(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public Result<?> handleException(Exception e) {
        log.error("系统异常", e);
        return Result.error(ErrorCode.INTERNAL_ERROR);
    }
}
```

---

#### 2. 积分操作参数校验缺失

**位置**: `PointsController.java:97-106`

**问题描述**:
`awardPoints` 和 `deductPoints` 方法未校验 `amount` 参数为正数，可能导致负数积分发放或扣除。

**当前代码**:
```java
@PostMapping("/award")
public Result<String> awardPoints(
    @AuthenticationPrincipal JwtUserPrincipal principal,
    @Valid @RequestBody ManualPointDTO dto) {
    // dto.getAmount() 未校验
    int newBalance = pointAccountService.awardPoints(...);
}
```

**修复建议**:
```java
public class ManualPointDTO {
    @NotNull(message = "金额不能为空")
    @Min(value = 1, message = "金额必须大于0")
    private Integer amount;
}
```

---

#### 3. 事务边界不清晰

**位置**: `CheckInService.java`

**问题描述**:
打卡操作涉及多个数据库更新（记录积分、更新账户、记录日志），需要明确事务传播行为。

**建议**:
- 确认 `@Transactional` 的 `propagation` 设置
- 添加事务超时配置
- 考虑使用编程式事务管理复杂场景

---

#### 4. 硬编码魔法数字

**位置**: `CheckInController.java` 多处

**问题描述**:
分页参数默认值硬编码在代码中。

**当前代码**:
```java
@RequestParam(defaultValue = "1") int page,
@RequestParam(defaultValue = "20") int size
```

**建议**:
```java
@Min(1) @Max(100) @RequestParam(defaultValue = "20") int size
```

---

### 前端问题

#### 5. useEffect 依赖不完整

**位置**: `h5/src/pages/CheckInPage.tsx:18-31`

**问题描述**:
useEffect 的依赖数组不完整，可能导致陈旧闭包问题。

**当前代码**:
```typescript
useEffect(() => {
    if (!checkInSuccess) return;
    const timer = setInterval(() => {
        setCountdown((prev) => {
            if (prev <= 1) {
                clearInterval(timer);
                navigate('/');
                return 0;
            }
            return prev - 1;
        });
    }, 1000);
    return () => clearInterval(timer);
}, [checkInSuccess]); // 缺少 navigate
```

**修复建议**:
```typescript
useEffect(() => {
    if (!checkInSuccess) return;
    const timer = setInterval(() => {
        setCountdown((prev) => {
            if (prev <= 1) {
                clearInterval(timer);
                navigate('/');
                return 0;
            }
            return prev - 1;
        });
    }, 1000);
    return () => clearInterval(timer);
}, [checkInSuccess, navigate]);
```

---

#### 6. any 类型滥用

**位置**: 多处前端代码

**问题描述**:
大量使用 `any` 类型会丢失 TypeScript 类型检查优势。

**修复建议**:
```typescript
// 错误
const handleError = (err: any) => { ... };

// 正确
const handleError = (err: unknown) => {
    if (err instanceof Error) {
        // ...
    }
};
```

---

#### 7. 组件过于庞大

**位置**: `CheckInPage.tsx` (300行)

**问题描述**:
单个组件包含过多逻辑，难以维护和测试。

**建议拆分**:
- `TimeSlotCard.tsx` - 时段卡片组件
- `CheckInSuccessView.tsx` - 打卡成功视图
- `CheckInFailureView.tsx` - 打卡失败视图

---

## 三、中等问题 (Minor)

### 后端

| # | 问题 | 位置 | 建议 |
|---|------|------|------|
| 1 | 日志级别不当 | 多处 | ERROR 用于真正异常，INFO 用于业务关键节点 |
| 2 | API 设计不一致 | Controller 层 | 统一使用 `@RequestBody` 接收 POST 参数 |
| 3 | 缺少 API 文档 | Controller 层 | 添加 Swagger/OpenAPI 注解 |
| 4 | 未使用包装类型 | DTO 字段 | `int` 应改为 `Integer` 以支持 null |
| 5 | 缺少 null 检查 | 多处 Service | 使用 Optional 包装可能为 null 的返回值 |

### 前端

| # | 问题 | 位置 | 建议 |
|---|------|------|------|
| 1 | 重复样式定义 | 多个组件 | 抽取到 CSS 变量或 theme |
| 2 | 内联样式过多 | CheckInPage.tsx | 使用 CSS Modules |
| 3 | 魔法字符串 | getSlotStatusBadge | 使用枚举定义状态 |
| 4 | 错误处理不统一 | 多处 | 统一使用 ErrorBoundary |
| 5 | 注释缺失 | 复杂逻辑处 | 添加 JSDoc 注释 |

---

## 四、性能优化建议

### 后端性能

#### 1. 打卡状态缓存

**问题**: 每次查询今日打卡状态都访问数据库

**当前实现**:
```java
public CheckInResponseDTO getTodayStatus(Long userId) {
    return checkInMapper.selectTodayStatus(userId); // 每次查询DB
}
```

**优化建议**:
```java
public CheckInResponseDTO getTodayStatus(Long userId) {
    String cacheKey = "checkin:today:" + userId;
    return redisTemplate.opsForValue().get(cacheKey, CheckInResponseDTO.class)
        .orElseGet(() -> {
            var result = checkInMapper.selectTodayStatus(userId);
            redisTemplate.opsForValue().set(cacheKey, result, 1, TimeUnit.HOURS);
            return result;
        });
}
```

---

#### 2. N+1 查询问题

**问题**: 批量获取用户积分时可能存在 N+1 查询

**建议**:
```java
// 使用 IN 查询替代循环查询
List<Long> userIds = pointAccounts.stream()
    .map(PointAccount::getUserId)
    .collect(Collectors.toList());
Map<Long, User> userMap = userMapper.selectBatchIds(userIds)
    .stream()
    .collect(Collectors.toMap(User::getId, Function.identity()));
```

---

### 前端性能

#### 3. 路由级代码分割

**问题**: 所有页面打包到一个 JS 文件

**建议**:
```typescript
const CheckInPage = lazy(() => import('./pages/CheckInPage'));
const MallPage = lazy(() => import('./pages/MallPage'));
```

---

#### 4. 列表虚拟化

**问题**: 打卡历史等长列表未使用虚拟化

**建议**: 使用 `react-window` 或 `react-virtualized`

---

## 五、安全加固建议

### 1. 接口限流

**建议**: 为登录、注册等接口添加限流

```java
@RateLimiter(value = 10, timeout = 1, timeUnit = TimeUnit.MINUTES)
@PostMapping("/login")
public Result<AuthRes> login(...) { }
```

---

### 2. 敏感操作日志

**建议**: 对积分发放、扣除等敏感操作记录详细日志

```java
log.info("积分操作: userId={}, amount={}, operator={}, remark={}",
    userId, amount, operator, remark);
```

---

### 3. CORS 配置

**检查**: 确认 CORS 配置不过度宽松

```java
configuration.setAllowedOrigins(Arrays.asList(
    "https://domain.com",
    "https://www.domain.com"
));
```

---

## 六、代码亮点

### 后端做得好的地方

1. **分层清晰**: Controller -> Service -> Mapper 职责分明
2. **DTO 模式**: 内外接口分离，DTO 定义规范
3. **统一响应**: Result 包装类统一了 API 响应格式
4. **权限注解**: `@RequirePerm` 实现细粒度权限控制
5. **Lombok 使用**: 减少样板代码

### 前端做得好的地方

1. **React Query**: 状态管理和缓存策略规范
2. **组件封装**: GlassCard 等设计系统组件复用性好
3. **动画效果**: 打卡成功动画实现精美
4. **错误边界**: ErrorBoundary 统一错误处理
5. **TypeScript**: 基础类型定义完善

---

## 七、修复优先级

### P0 - 立即修复
- [ ] JWT Secret 硬编码问题
- [ ] SQL 注入风险 (`${}` -> `#{}`)
- [ ] 敏感数据暴露审计

### P1 - 本周修复
- [ ] 添加全局异常处理
- [ ] 积分参数校验完善
- [ ] 修复 useEffect 依赖问题
- [ ] 替换 any 类型

### P2 - 计划修复
- [ ] 组件拆分 (CheckInPage)
- [ ] 全局异常处理
- [ ] API 文档添加
- [ ] 单元测试补充

### P3 - 优化项
- [ ] Redis 缓存打卡状态
- [ ] 前端路由懒加载
- [ ] 列表虚拟化
- [ ] N+1 查询优化

---

## 八、测试建议

### 单元测试覆盖
- [ ] 积分计算逻辑测试
- [ ] 打卡防并发测试
- [ ] 权限校验测试

### 集成测试
- [ ] 多租户隔离测试
- [ ] API 端到端测试

### 安全测试
- [ ] SQL 注入测试
- [ ] XSS 攻击测试
- [ ] CSRF 防护测试

---

**报告生成时间**: 2026-04-21
**审查方法**: 静态代码分析 + 架构审查 + 安全扫描

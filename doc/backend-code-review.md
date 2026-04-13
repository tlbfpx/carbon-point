
---

## carbon-honor 模块

阅读了 BadgeService、LeaderboardService、DepartmentService 的核心代码:

- 徽章定义、用户徽章关系设计正确 ✅
- 排行榜快照使用 Redis 缓存，小时级更新 ✅
- 部门层级关系设计合理 ✅

**发现问题:**
- 排行榜缓存更新需要保证一致性，建议使用延时双删策略

---

## carbon-report 模块

代码精简，仅提供看板数据查询接口，符合设计规范。建议添加缓存减少数据库压力。

---

## carbon-app 模块

**`Application.java`** - 正确的 Spring Boot 启动类，组件扫描配置正确。

---

## 架构设计问题

1. **用户积分字段存储在 users 表**
   - 当前设计: `total_points` / `available_points` / `frozen_points` 放在 users 表
   - 优点: 查询用户信息时可一起取出，性能好
   - 缺点: 积分账户和用户实体耦合，积分交易表有完整历史，查询余额需要汇总所有交易
   - 评估: 当前设计可行，对于 MVP 来说足够

2. **平台管理端点和租户端点共用一个 SecurityFilterChain**
   - 当前设计: 一个过滤器链处理两类端点，通过不同 Filter 分别处理
   - 优点: 配置简单
   - 缺点: 两类 Token 结构不同（租户 Token 有 userId+tenantId，平台 Token 有 adminId）
   - 评估: 当前实现正确，能工作，可以接受

3. **权限缓存按用户缓存到 Redis**
   - 用户角色/权限变更时需要主动清空缓存
   - 当前 `PermissionService.refreshUserCache` 已有该方法，调用点需要确保覆盖所有变更场景

---

## 安全问题

| 优先级 | 问题 | 建议 |
|--------|------|------|
| P1 | CORS 允许 `*` origin + allowCredentials=true | 改为配置可限制允许的域名列表 |
| P2 | JWT 密钥从配置文件读取，生产环境应使用环境变量/密钥管理服务 | 当前开发环境没问题，上线前需要处理 |
| P2 | 密码编码已使用 Argon2id，参数配置正确 (memory=64MB, iterations=3) ✅ | 保持现状 |
| P2 | 登录限流（IP + 账号双重限流）、账户锁定 ✅ | 保持现状 |
| P3 | 序列化的 JWT claims 包含 roles 列表，正确 | 保持现状 |

---

## 性能问题

1. **用户权限 Redis 缓存** ✅ 良好设计，减少 DB 查询
2. **排行榜 Redis 缓存** ✅ 小时级快照，减轻 DB 压力
3. **积分账户查询直接走 DB** ✅ 单次查询，性能足够
4. **打卡并发** 分布式锁减少 DB 并发冲突 ✅
5. **建议:** 增加分页查询默认最大条数限制，防止一次查过多数据

---

## 代码质量问题

**总体:** 代码质量高，命名清晰，注释适当。

少数问题:
- 部分文件使用 field 注入 (`@Autowired`)，推荐改用构造器注入（Spring 最佳实践）
- 少数地方返回 `null` 给调用方，调用方需要检查，建议抛出 BusinessException
- Lombok 注解使用正确，`@Data` 用在实体上没问题

---

## 推荐改进清单

### P0 - 必须修复（影响功能正确性）

1. **`MyBatisPlusConfig.java:20-23`** - 交换 OptimisticLocker 和 TenantLine 拦截器顺序
   ```java
   // 当前错误顺序
   interceptor.addInnerInterceptor(new OptimisticLockerInnerInterceptor());
   interceptor.addInnerInterceptor(new TenantLineInnerInterceptor(...));
   
   // 正确顺序应该是:
   interceptor.addInnerInterceptor(new TenantLineInnerInterceptor(...));
   interceptor.addInnerInterceptor(new OptimisticLockerInnerInterceptor());
   ```
   **原因:** 必须先过滤租户数据，再应用乐观锁条件，否则乐观锁可能不生效。

2. **`PermissionService.java:52-56`** - 修复 `refreshTenantCache` 查询逻辑
   ```java
   // 当前错误:
   List<Long> roleIds = userRoleMapper.selectRoleIdsByUserId(tenantId);
   
   // 应该改为: 查询该租户下所有角色 → 每个角色查询所有用户 → 清空每个用户缓存
   ```

3. **`AuthController.java:34-38`** - 添加 `currentUser.getUserId()` null 检查
   ```java
   if (currentUser.getUserId() == null) {
       return Result.error(ErrorCode.UNAUTHORIZED);
   }
   ```

### P1 - 重要改进（影响健壮性/安全性）

1. 修复 CORS 配置，不要允许所有 origin
2. 当 BCrypt 密码验证成功时，异步升级为 Argon2id
3. 超时订单取消确保解冻积分，检查 `processExpiredPendingOrders` 是否处理了解冻

### P2 - 建议改进（代码质量/可维护性）

1. JwtUtil 去掉 userId 冗余存储
2. PointAccountService 使用 User 实体替代 Map<String, Object> 类型不安全的访问
3. 乐观锁重试增加退避间隔
4. 将 null 表示无限库存改为 `-1`，语义更清晰
5. 分页查询增加最大条数限制

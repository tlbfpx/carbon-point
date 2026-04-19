# Architecture（架构文档合并）


---

## 文件：architecture-optimization.md

# 碳积分打卡平台架构分析与优化建议

> 分析日期：2026-04-13  
> 项目阶段：规格定义（无源代码）  
> 分析人：oracle

## 一、当前架构合理性评估

### 优势
1. **阶段匹配合理**：MVP 阶段选择共享数据库+字段级隔离，符合初期几百家企业的规模预期，运维成本最低
2. **模块化清晰**：后端按业务领域拆分模块，前端按应用类型拆分+共享包，职责分明
3. **扩展性设计到位**：积分引擎采用 JSON 配置+规则链，支持灵活扩展规则类型；单体架构预留未来拆分微服务的空间
4. **安全基线健全**：从认证到加密到限流多层防护，Argon2id 密码哈希、双维度限流等选择体现了安全优先

### 整体合理性评分：**8.5/10**  
决策清醒，取舍明确，适配当前 SaaS 创业项目阶段。

## 二、潜在风险与问题

### 1. **多租户层面**
- **查询性能风险**：所有租户数据混在一张表，随着数据量增长，即使有 tenant_id 索引，范围查询性能会逐步下降
- **跨租户统计麻烦**：平台管理员需要全租户统计，虽然绕过拦截器，但 SQL 写法不统一容易出问题
- **数据备份粒度粗**：单库备份无法按租户粒度备份恢复

### 2. **积分引擎层面**
- **规则链硬编码**：当前设计规则执行顺序固定，虽然需求明确，但未来如果租户需要自定义规则顺序，扩展困难
- **规则配置无版本管理**：规则修改后无法回滚，出错后难追溯
- **缺乏规则预览能力**：企业管理员修改规则后无法模拟计算看结果，直接上线有风险

### 3. **前端架构层面**
- **企业+平台后台合并**：虽然减少重复代码，但随着功能迭代，两者权限模型差异会越来越大，代码会越来越复杂
- **Monorepo 依赖管理**：pnpm workspace 缺乏严格的依赖访问控制，可能出现 apps 直接依赖内部 packages 以外的包，循环依赖风险

### 4. **数据层**
- **排行榜缓存策略**：小时级更新，秒级新鲜度不够，但频繁更新又给 DB 带来压力
- **打卡防并发**：唯一索引+分布式锁正确，但锁释放时机需要小心，失败场景要处理

### 5. **安全层面**
- **JWT 密钥管理**：文档中没提及密钥轮换策略，固定密钥泄露后影响全局
- **refresh_token 轮换**：设计提到轮换，但实现不当会导致用户频繁登录

## 三、具体优化建议

### 架构分层与模块划分

**1. 后端模块细化**
```
carbon-common          # 继续保留公共基础
├── carbon-common-core   # 工具、异常、响应、上下文
├── carbon-common-security # 安全、加密、认证、限流通用逻辑
├── carbon-common-tenancy # 多租户基础设施（拦截器、注解）
carbon-system     # 用户、租户、RBAC、认证（不变）
carbon-checkin    # 打卡、时段规则、防并发（不变）
carbon-points     # 积分引擎、积分账户、等级（不变）
carbon-mall       # 虚拟商品、兑换、核销（不变）
carbon-report     # 数据报表、看板（不变）
carbon-app        # Spring Boot 启动模块（不变）
```
- 将公共横切关注点抽更细，未来拆微服务更容易
- 多租户逻辑独立成模块，便于替换隔离方案

**2. 积分引擎规则链优化**
- 保留固定顺序，但将每个步骤做成策略接口，通过 SPI 自动发现
- 允许企业级开关控制某些步骤是否执行，不改变整体顺序但增加灵活性
- 增加规则版本表 `point_rule_versions`，每次修改保存新版本，支持一键回滚

### 多租户架构优化
- **查询规范**：定义 `PlatformRepository` 基类专门处理跨租户查询，统一权限校验，避免散落在各个 Service 里的手动校验
- **分片预热**：初期预留 tenant_id 分库分表字段，未来数据量增长可以平滑迁移到按 tenant_id 哈希分片
- **租户配置缓存**：每个租户的规则、角色等配置用 Caffeine 做本地缓存+Redis 二级缓存，减少 DB 访问

### 前端架构优化
- **边界控制**：使用 `package.json` 的 `workspaces` + `pnpm` 的 `--filter` 严格控制依赖，避免循环依赖
- **权限分层**：dashboard 内按 `src/modules/{enterprise,platform}` 拆分，保持代码隔离，未来如果需要拆分仓库也容易
- **兼容性兜底**：针对 H5 WebView 兼容性，在构建配置中明确 targets 到 iOS 12+ 和 Android 6+，使用 `core-js` 做 polyfill

### 性能优化
- **排行榜**：采用「增量更新+定时重组」，用户打卡后增加 Redis 原子计数，不需要全表重算，达到近实时更新
- **积分计算**：规则配置预加载到内存，计算过程无 IO，单请求毫秒级完成
- **打卡防并发**：先拿分布式锁，再插 DB，锁失败直接返回，避免 DB 唯一键冲突抛异常控制流程

### 安全性增强
- **密钥轮换**：JWT 密钥支持多版本存储，支持平滑轮换，旧密钥保留一段时间用于降级
- **设备指纹**：refresh_token 绑定设备指纹，校验不通过要求重登
- **审计日志**：敏感操作（规则修改、商品上下架、用户删除）必须记审计日志，包含操作人、IP、新旧值对比

### 可观测性
- **统一链路追踪**：每个请求注入 traceId，日志打印，问题排查快
- **慢查询告警**：对租户交叉查询和报表查询设置慢查询阈值，告警通知

## 四、实施优先级建议

| 优先级 | 优化项 | 说明 |
|--------|--------|------|
| P0 | 模块拆分细化、多租户基础设施抽离 | 基础架构，越早做越好 |
| P0 | 积分引擎规则策略化、增加版本管理 | 避免需求变更后积重难返 |
| P1 | 排行榜增量更新优化 | 提升用户体验，减少 DB 压力 |
| P1 | JWT 密钥轮换、refresh_token 设备绑定 | 基础安全增强 |
| P2 | 平台查询规范化、审计日志 | 后 MVP 阶段做 |
| P2 | 分布式链路追踪 | 有一定用户量后加 |

## 总结
当前架构非常贴合项目阶段，没有过度设计，关键风险点也已经识别并给出应对方案。上述优化建议主要是在现有决策基础上做细节补充和预留扩展空间，不改变整体架构方向。
---

## 文件：backend-code-review.md


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


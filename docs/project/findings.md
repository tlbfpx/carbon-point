# Findings & Decisions

## Requirements

### 来自 proposal.md
- 多租户 SaaS 平台，支持企业注册、开通、停用的全生命周期管理
- 用户端 H5 应用（嵌入微信小程序 WebView 和 APP WebView）：打卡、积分查看、商城兑换
- 企业管理后台：员工管理、积分规则引擎配置、虚拟商品管理、订单管理、积分运营、角色权限管理
- 平台运营后台：企业管理、全平台数据看板、系统管理
- 打卡积分采用时段随机机制
- 积分规则引擎：时段规则、连续打卡奖励、特殊日期翻倍、用户等级系数、每日积分上限
- RBAC 权限体系，菜单+按钮+API 三级控制，每企业独立
- 用户通过企业邀请链接或管理员批量导入加入企业，一人仅属一企业
- 虚拟商品（优惠券码、直充、权益激活），支持核销管理

### 来自 tasks.md（15个模块 ~110+ 任务项）
1. 项目初始化与基础设施
2. 数据库 Schema 与公共模块
3. 多租户与企业租户管理（multi-tenant）
4. 用户管理（user-management）
5. RBAC 权限体系（rbac）
6. 积分规则引擎（point-engine）
7. 打卡系统（check-in）
8. 积分账户（point-account）
9. 虚拟积分商城（virtual-mall）
10. 数据报表（reporting）
11. 平台运营后台（platform-admin）
12. 用户端 H5 完善
13. 登录系统安全增强
14. 通知/消息系统（notification）
15. 集成测试与部署

## Technical Decisions

### 1. 多租户隔离方案：共享数据库 + tenant_id
| Decision | Rationale |
|----------|-----------|
| 所有租户共享一个 MySQL 数据库，通过 tenant_id 字段实现逻辑隔离 | 初期企业数量预计几百以内，逻辑隔离足够；运维成本最低；MyBatis-Plus TenantLineInnerInterceptor 成熟可用；后续可迁移到 Schema 隔离或独立库 |

**备选方案**：
- 每企业独立数据库：数据物理隔离更安全，但运维复杂度高，当前规模不需要
- Schema 隔离：折中方案，但 MyBatis-Plus 支持不如字段隔离成熟

### 2. 前端架构：pnpm Monorepo
| Decision | Rationale |
|----------|-----------|
| pnpm workspace，apps/h5（用户端）+ apps/dashboard（企业后台+平台后台合并）+ packages/（共享） | 企业后台和平台后台 UI 结构类似（都是后台管理面板），合并一套代码通过登录身份区分菜单；H5 交互模式完全不同（移动端、打卡动画），独立应用更灵活；共享 packages 避免重复 |

### 3. 积分规则引擎：JSON 配置 + 规则链执行
| Decision | Rationale |
|----------|-----------|
| point_rules 表存储规则配置，type 字段区分规则类型，config JSON 字段存储具体参数 | JSON config 灵活，不同规则类型可存储不同结构参数，无需频繁改表；规则链模式可扩展，新增规则类型只需新增 type 枚举和对应计算逻辑 |

**规则执行顺序（固定，不可 reorder）**：
1. 匹配时段规则 → 随机基础积分
2. 检查特殊日期 → 乘以倍率
3. 检查用户等级 → 乘以系数
4. 四舍五入取整
5. 检查每日积分上限 → 截断
6. 记录打卡 → 检查连续打卡 → 发放额外奖励

### 4. RBAC 权限：用户→角色→权限，每租户独立
| Decision | Rationale |
|----------|-----------|
| 标准 RBAC 模型，roles / role_permissions / user_roles 三张表，每租户独立角色定义 | 权限树按模块划分（dashboard/member/rule/product/order/point/report）；预设角色模板（超管/运营/客服/商品管理/只读）；支持企业自定义角色；最后超管不可被降级或删除；前端动态渲染菜单和按钮，后端 API 层做权限校验拦截 |

### 5. 虚拟商品类型与核销
| Decision | Rationale |
|----------|-----------|
| products 表 type 字段区分：coupon（券码）/ recharge（直充）/ privilege（权益） | 统一由 exchange_orders 表管理订单状态流转：pending → fulfilled → used / expired / cancelled；fulfillment_config JSON 存储各类型配置 |

### 6. 用户注册与绑定
| Decision | Rationale |
|----------|-----------|
| 两种路径：企业邀请链接 + 管理员批量导入，一人仅属一企业 | 邀请链接：tenant_invitations 表管理邀请码、有效期、使用次数；批量导入：管理员上传 Excel（手机号+姓名）；用户模型 1:1 绑定企业，简化数据隔离和权限判断 |

### 7. 认证方案：JWT
| Decision | Rationale |
|----------|-----------|
| Spring Security + JWT Token，登录后签发 access_token（短效）+ refresh_token（长效） | H5/小程序/APP 均适合 Token 认证；JWT payload 携带 user_id + tenant_id + roles，减少数据库查询；Redis 存储 refresh_token 做续期和主动失效；平台管理员与企业用户分两套认证逻辑 |

### 8. 登录安全增强：多层防护体系
| Decision | Rationale |
|----------|-----------|
| 图形验证码 + 密码策略 + 登录限流 + 安全日志 + 异常检测 | 验证码防自动化暴力破解；Argon2 加密替代 BCrypt；IP/账号双维度限流；完整记录所有登录尝试；新设备/异地/异常时间登录检测 |

**实现优先级**：
- P0: 图形验证码、登录限流、密码强度校验
- P1: 安全日志、Argon2 加密、忘记密码优化
- P2: 滑动验证码、密码历史、异常登录检测

### 9. 验证码方案：图片验证码为主，滑动验证码可选
| Decision | Rationale |
|----------|-----------|
| 普通用户登录使用图片验证码，平台管理员可选滑动验证码 | 图片验证码实现简单，用户体验好；滑动验证码安全性更高但实现复杂，仅用于高权限账号；Redis 存储验证码 5 分钟过期；排除易混淆字符（0/O/1/I/l） |

### 10. 密码加密：Argon2id 算法
| Decision | Rationale |
|----------|-----------|
| 使用 Argon2id 替代 BCrypt | Argon2 是 Password Hashing Competition 获胜算法；Argon2id 兼顾抵抗 GPU 攻击和侧信道攻击；Spring Security 6+ 原生支持 |

**参数配置**：
- salt-length: 16 bytes
- hash-length: 32 bytes
- parallelism: 4
- memory: 65536 KB (64MB)
- iterations: 3

### 11. 登录限流：双维度计数 + 自动锁定
| Decision | Rationale |
|----------|-----------|
| IP + 账号双维度登录失败计数，达到阈值自动锁定 | IP 维度防止来自同一 IP 的批量暴力破解；账号维度防止针对特定账号的定向攻击；Redis 原子计数器 + 过期时间实现简单高效；分级策略：失败 3 次要求验证码，失败 5 次锁定 30 分钟 |

**限流规则**：
- 时间窗口: 5 分钟
- IP 阈值: 5 次 → 锁定 30 分钟
- 账号阈值: 5 次 → 锁定 30 分钟
- 验证码触发: 任意维度失败 3 次

### 12. 忘记密码：多因素验证 + 安全重置
| Decision | Rationale |
|----------|-----------|
| 短信/邮箱验证码验证身份，重置后强制清除所有会话 | 验证成功后签发一次性 resetToken，15 分钟有效；密码重置后立即失效所有 refresh_token；重置时需满足最新密码强度要求 |

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| （暂无，尚未开始实现） | |

## Resources

### 项目文档
- 提案：`openspec/changes/carbon-point-platform/proposal.md`
- 架构决策：`openspec/changes/carbon-point-platform/design.md`
- 任务清单：`openspec/changes/carbon-point-platform/tasks.md`
- TDD 实现计划：`docs/superpowers/plans/2026-04-10-carbon-point-platform-full-implementation.md`
- 完整实现计划：`docs/superpowers/plans/2026-04-08-carbon-point-full.md`
- DDL：`docs/review/ddl/carbon-point-schema.sql`

### 模块级规范（Given-When-Then）
- `openspec/changes/carbon-point-platform/specs/multi-tenant/spec.md`
- `openspec/changes/carbon-point-platform/specs/user-management/spec.md`
- `openspec/changes/carbon-point-platform/specs/check-in/spec.md`
- `openspec/changes/carbon-point-platform/specs/point-account/spec.md`
- `openspec/changes/carbon-point-platform/specs/rbac/spec.md`
- `openspec/changes/carbon-point-platform/specs/reporting/spec.md`
- `openspec/changes/carbon-point-platform/specs/h5-user-app/spec.md`
- `openspec/changes/carbon-point-platform/specs/enterprise-admin/spec.md`
- `openspec/changes/carbon-point-platform/specs/platform-admin/spec.md`
- `openspec/changes/carbon-point-platform/specs/login-security/spec.md`
- `openspec/changes/carbon-point-platform/specs/point-engine/spec.md`
- `openspec/changes/carbon-point-platform/specs/virtual-mall/spec.md`
- `openspec/changes/carbon-point-platform/specs/notification/spec.md`

### 改进类文档
- UX 改进：`docs/superpowers/specs/2026-04-10-carbon-point-ux-improvement.md`
- 技术改进：`docs/superpowers/specs/2026-04-10-carbon-point-technical-improvement.md`
- 业务改进：`docs/superpowers/specs/2026-04-10-carbon-point-business-improvement.md`
- 产品改进：`docs/superpowers/specs/2026-04-10-carbon-point-product-improvement.md`
- 荣誉系统：`openspec/specs/2026-04-08-honor-system-mvp-design.md`

### 用户等级定义（point-engine/spec.md）
- Lv.1 Bronze: 0-999 points
- Lv.2 Silver: 1,000+ points
- Lv.3 Gold: 5,000+ points
- Lv.4 Platinum: 20,000+ points
- Lv.5 Diamond: 50,000+ points

### 平台评审报告
- `docs/review/2026-04-11-platform-review.md`

## Risks

| Risk | Mitigation |
|------|------------|
| 租户数据泄露：原生 SQL、跨租户查询需绕过拦截器 | 平台管理员查询使用 @InterceptorIgnore 注解跳过租户拦截，Service 层手动做权限校验 |
| 积分通胀：企业管理员配置过于宽松规则 | 平台可设置默认推荐规则模板，提供积分发放量预警 |
| 规则引擎复杂度：JSON config 查询不便 | 规则数据量小（每企业通常不超过几十条），加载到内存执行，不影响性能 |
| 打卡并发：同一时段可能重复打卡请求 | 数据库唯一索引（user_id + 打卡日期 + 时段规则 ID）+ Redis 分布式锁双重保障 |
| H5 WebView 兼容性：不同小程序/APP WebView 内核版本不同 | Babel 转译确保兼容性，避免过新的 JS API，做好降级处理 |
| 验证码被识别：OCR 可能识别简单图形验证码 | 增加干扰线和干扰点，使用混合字体；重要场景使用滑动验证码 |
| 密码加密性能：Argon2 内存占用较高 | 配置合理参数（memory=64MB, parallelism=4），登录接口独立线程池隔离 |
| 登录限流误伤：同一企业用户共享出口 IP | IP 锁定阈值适当放宽（5 次/5分钟），提供自助解锁功能 |
| 会话安全：refresh_token 被盗用 | refresh_token 每次使用后轮换，绑定设备指纹，异常设备登录需二次验证 |
| 验证码短信成本 | 优先推荐邮箱验证，设置短信验证码频率限制，提供图形验证码防刷 |

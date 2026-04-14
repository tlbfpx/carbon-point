# Task Plan: Carbon Point 全栈平台开发

## Goal

完成 Carbon Point 多租户 SaaS 碳积分打卡平台的全量开发，包括：
- 后端：Spring Boot 3.x + Java 21 Maven 多模块（carbon-common / carbon-system / carbon-checkin / carbon-points / carbon-mall / carbon-report / carbon-app）
- 前端：React 18 + TypeScript + Ant Design 5 + Vite pnpm Monorepo（apps/h5 + apps/dashboard）
- 功能：多租户、用户管理、RBAC、打卡系统、积分引擎、积分账户、虚拟商城、数据报表、通知系统

## Current Phase

Phase 1

## Phases

### Phase 1: 项目骨架与基础设施
<!-- 多租户 SaaS 碳积分打卡平台后端 + 前端初始化 -->
- [x] 1.1 初始化后端 Spring Boot 3.x + Java 21 Maven 多模块骨架
- [x] 1.2 配置 MyBatis-Plus、MySQL 数据源、Redis 连接
- [x] 1.3 实现多租户拦截器（TenantLineInnerInterceptor）
- [x] 1.4 实现统一响应封装（Result<T>）、全局异常处理、统一错误码
- [x] 1.5 实现 JWT 认证（access_token / refresh_token，payload 含 user_id / tenant_id / roles）
- [x] 1.6 实现租户上下文（TenantContext）
- [x] 1.7 初始化前端 pnpm Monorepo（apps/h5 + apps/dashboard + packages/）
- **Status:** completed

### Phase 2: 数据库 Schema 与公共模块
- [ ] 2.1 创建完整数据库表（tenants/platform_admins/users/roles/point_rules/check_in_records/point_transactions/products/exchange_orders 等）
- [ ] 2.2 初始化 permissions 表数据（7 模块约 25 个权限点）
- [ ] 2.3 实现 MyBatis-Plus 自动填充（created_at、updated_at、tenant_id）
- **Status:** pending

### Phase 3: 多租户与企业租户管理（multi-tenant）
- [ ] 3.1 企业租户 CRUD API（平台管理员专用，绕过租户拦截器）
- [ ] 3.2 企业开通/停用/恢复 API
- [ ] 3.3 企业开通时自动初始化（预设角色模板 + 默认时段规则）
- [ ] 3.4 平台运营后台前端：企业管理页面
- **Status:** pending

### Phase 4: 用户管理（user-management）
- [ ] 4.1 用户注册/登录 API（手机号+密码，JWT）
- [ ] 4.2 Token 刷新 API
- [ ] 4.3 邀请链接管理 API
- [ ] 4.4 批量导入用户 API（Excel）
- [ ] 4.5 用户列表/启停/编辑 API
- [ ] 4.6 企业管理后台前端：员工管理页面
- [ ] 4.7 用户端 H5 前端：注册/登录页面
- **Status:** pending

### Phase 5: RBAC 权限体系（rbac）
- [ ] 5.1 角色 CRUD API（每租户隔离，预设角色不可删除）
- [ ] 5.2 角色-权限关联管理 API
- [ ] 5.3 用户-角色关联管理 API
- [ ] 5.4 权限查询 API（多角色取并集）
- [ ] 5.5 @RequirePerm AOP 注解 + API 级权限校验
- [ ] 5.6 权限缓存（Redis），角色变更时刷新
- [ ] 5.7 超管保护逻辑（最后一个超管不可降级/删除）
- [ ] 5.8 前端权限框架（动态菜单 + 按钮级 v-permission）
- [ ] 5.9 企业管理后台前端：角色管理页面
- **Status:** pending

### Phase 6: 积分规则引擎（point-engine）
- [ ] 6.1 时段规则 CRUD API（含时间重叠校验）
- [ ] 6.2 连续打卡奖励规则 CRUD API
- [ ] 6.3 特殊日期翻倍规则 CRUD API
- [ ] 6.4 用户等级系数规则 CRUD API
- [ ] 6.5 每日积分上限配置 API
- [ ] 6.6 积分计算引擎服务（规则链：时段→随机→倍率→等级→上限→连续奖励）
- [ ] 6.7 企业管理后台前端：规则配置页面
- **Status:** pending

### Phase 7: 打卡系统（check-in）
- [ ] 7.1 打卡 API（校验时段→校验重复→积分计算→记录打卡→发放积分→连续打卡）
- [ ] 7.2 打卡防并发（唯一索引 + Redis 分布式锁）
- [ ] 7.3 打卡记录查询 API
- [ ] 7.4 用户连续打卡天数更新逻辑
- [ ] 7.5 用户端 H5 前端：打卡页面 + 结果动画
- **Status:** pending

### Phase 8: 积分账户（point-account）
- [ ] 8.1 积分账户原子更新逻辑
- [ ] 8.2 积分流水自动记录
- [ ] 8.3 积分流水查询 API
- [ ] 8.4 手动积分发放/扣减 API
- [ ] 8.5 积分统计 API（累计/可用/本月/排名）
- [ ] 8.6 用户等级自动晋升逻辑
- [ ] 8.7 企业管理后台前端：积分运营页面
- [ ] 8.8 用户端 H5 前端：积分页面
- **Status:** pending

### Phase 9: 虚拟积分商城（virtual-mall）
- [ ] 9.1 虚拟商品 CRUD API（三种类型）
- [ ] 9.2 商品上下架 + 库存管理
- [ ] 9.3 积分兑换下单 API（状态机：pending→fulfilled→used/expired/cancelled）
- [ ] 9.4 券码/直充/权益发放逻辑
- [ ] 9.5 卡券核销 API
- [ ] 9.6 卡券过期自动标记（定时任务）
- [ ] 9.7 企业管理后台前端：商品管理 + 订单管理页面
- [ ] 9.8 用户端 H5 前端：商城 + 我的卡券页面
- **Status:** pending

### Phase 10: 数据报表（reporting）
- [ ] 10.1 企业级数据看板 API
- [ ] 10.2 平台级数据看板 API
- [ ] 10.3 积分趋势报表 API
- [ ] 10.4 Excel 导出 API
- [ ] 10.5 企业管理后台前端：数据看板页面
- [ ] 10.6 平台运营后台前端：全平台看板页面
- **Status:** pending

### Phase 11: 平台运营后台（platform-admin）
- [ ] 11.1 平台管理员认证（独立登录入口）
- [ ] 11.2 平台管理员 CRUD API
- [ ] 11.3 操作日志记录（AOP）
- [ ] 11.4 平台配置管理 API
- [ ] 11.5 平台运营后台前端：登录 + 系统管理 + 平台配置页面
- **Status:** pending

### Phase 12: 前端项目完整初始化
- [ ] 12.1 完成前端 Monorepo 完整结构
- [ ] 12.2 完成 apps/dashboard 企业+平台管理后台
- [ ] 12.3 完成 apps/h5 用户端 H5 应用
- [ ] 12.4 H5 WebView 兼容性测试
- **Status:** pending

### Phase 13: 登录系统安全增强
- [ ] 13.1 图形验证码
- [ ] 13.2 滑动验证码
- [ ] 13.3 密码强度校验（Argon2id）
- [ ] 13.4 登录限流（IP+账号双维度）
- [ ] 13.5 账户锁定 + 安全日志
- [ ] 13.6 忘记密码流程
- **Status:** pending

### Phase 14: 通知/消息系统（notification）
- [ ] 14.1 站内消息 CRUD API
- [ ] 14.2 通知模板引擎
- [ ] 14.3 业务事件→通知触发
- [ ] 14.4 短信通知渠道
- [ ] 14.5 通知偏好设置
- [ ] 14.6 H5 消息中心 + 管理后台通知模板管理
- **Status:** pending

### Phase 15: 集成测试与部署
- [ ] 15.1 核心业务 API 集成测试
- [ ] 15.2 多租户隔离测试
- [ ] 15.3 并发场景测试
- [ ] 15.4 登录安全测试
- [ ] 15.5 Docker 部署配置
- [ ] 15.6 前端构建与部署配置
- **Status:** pending

## Key Questions

1. 前后端分离并行开发还是先后端再前端？建议前后端可并行，但后端 API 接口定义先行
2. Phase 1 是否需要 TDD 先写测试？根据 superpowers 计划建议 TDD 方式
3. 哪些模块可以独立开发不依赖其他？multi-tenant 和 user-management 可先行

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| 多租户：共享数据库 + tenant_id 字段隔离 | 初期规模几百企业，逻辑隔离足够，运维成本低，MyBatis-Plus TenantLineInnerInterceptor 成熟 |
| 前端：pnpm Monorepo（h5 + dashboard 合并 + packages） | 企业/平台后台 UI 类似可合并，H5 独立更灵活，共享包避免重复 |
| 积分引擎：JSON config + 规则链执行 | JSON 灵活可扩展，规则链顺序固定（时段→随机→倍率→等级→上限→连续），可新增规则类型 |
| 密码：Argon2id | Password Hashing Competition 获胜算法，Spring Security 6+ 原生支持 |
| 打卡防并发：唯一索引 + Redis 分布式锁 | 双重保障，数据库唯一索引兜底，Redis 锁防应用层并发 |
| 虚拟商品三种类型：coupon/recharge/privilege | 覆盖主流虚拟商品场景，fulfillment_config JSON 存储各类型配置 |
| JWT payload 含 user_id + tenant_id + roles | 减少数据库查询，H5/小程序/APP 均适合无状态认证 |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| （暂无） | | |

## Notes

- 参考文档：`openspec/changes/carbon-point-platform/tasks.md`（完整任务清单）
- 参考文档：`docs/superpowers/plans/2026-04-10-carbon-point-platform-full-implementation.md`（TDD 实现计划）
- 参考文档：`openspec/changes/carbon-point-platform/design.md`（12条架构决策）
- 参考文档：`openspec/changes/carbon-point-platform/proposal.md`（提案）
- OpenSpec 模块规范：`openspec/changes/carbon-point-platform/specs/{module}/spec.md`

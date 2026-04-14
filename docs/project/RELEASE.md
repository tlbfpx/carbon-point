# Carbon Point v1.0.0 Release Notes

> 发布日期: 2026-04-12 | 状态: GA (正式版)

---

## 版本概述

Carbon Point v1.0.0 是平台的第一个正式版本，提供了完整的多租户 SaaS 爬楼梯打卡积分激励系统。

**版本号**: `1.0.0-SNAPSHOT` → `1.0.0`
**构建版本**: `2026-04-12`
**最低依赖**: Java 21, MySQL 8.0, Redis 7.0

---

## 新功能

### 1. 多租户基础设施
- 企业租户全生命周期管理（注册、开通、停用、到期）
- `tenant_id` 列级数据隔离
- 套餐管理（free/pro/enterprise，各有限额）
- 平台管理员独立认证体系

### 2. 用户管理与认证
- JWT 双 Token 认证（access_token 24h / refresh_token 7d）
- 手机号 + 密码登录（支持邀请链接）
- 管理员批量导入用户
- 密码使用 Argon2id 哈希
- 图形验证码 + 登录锁定保护

### 3. 打卡系统
- 多时段打卡规则配置（时段不可重叠）
- 时段随机积分计算
- 数据库唯一索引 + Redis 分布式锁防重复打卡
- 打卡记录完整追溯

### 4. 积分规则引擎
- 固定顺序执行链：时段匹配 → 随机基数 → 特殊日期倍数 → 等级系数 → 四舍五入 → 每日上限 → 连续打卡奖励
- 连续打卡阶梯奖励（7/14/21/30 天）
- 用户等级体系（Lv.1 Bronze → Lv.5 Diamond）
- 每日积分上限控制

### 5. 积分账户
- 积分余额精确管理
- 积分流水完整记录（类型/方向/原因）
- 管理员手动发放/扣减（带备注）
- 冻结积分（订单pending状态）

### 6. 虚拟积分商城
- 三类虚拟商品：优惠券码、直充、权益激活
- 积分定价与库存管理
- 订单状态机：pending → fulfilled → used/expired/cancelled
- 优惠券码生成（UUID 格式）
- 核销管理（企业管理员）

### 7. RBAC 权限控制
- 菜单 + 按钮 + API 三级权限控制
- 每企业独立角色体系
- 预设角色模板（超级管理员、部门管理员、普通员工）
- 自定义角色
- `@RequirePerm` AOP 注解
- 至少保留一名超管约束

### 8. 数据报表
- 企业级看板：积分趋势、活跃人数、热门商品
- 平台级看板：企业数、总用户、积分总量、兑换总量
- Excel 数据导出

### 9. 用户端 H5 应用
- 首页打卡入口（时段展示 + 一键打卡 + 结果动画）
- 积分页面（余额/明细/排行榜/等级）
- 商城页面（商品列表/兑换/卡券包）
- 兼容微信小程序 WebView 和 APP WebView

### 10. 企业管理后台
- 员工管理（增删改查、启停）
- 打卡规则配置
- 积分规则引擎配置
- 商品管理
- 订单管理
- 积分运营（手动发放）
- 角色权限管理
- 数据看板

### 11. 平台运营后台
- 企业管理（列表/开通/停用/套餐调整）
- 全平台数据看板
- 平台配置
- 系统管理（平台管理员/操作日志/权限）

---

## API 变更说明

### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录（手机+密码+验证码） |
| POST | `/api/auth/refresh` | 刷新 Token |
| GET | `/api/auth/captcha` | 获取图形验证码 |
| POST | `/api/auth/logout` | 登出 |

### 用户端接口（需 Tenant Token）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/checkin` | 打卡 |
| GET | `/api/checkin/records` | 打卡记录 |
| GET | `/api/points/balance` | 积分余额 |
| GET | `/api/points/flow` | 积分流水 |
| GET | `/api/points/level` | 用户等级 |
| GET | `/api/leaderboard` | 排行榜 |
| GET | `/api/mall/products` | 商品列表 |
| POST | `/api/mall/exchange` | 兑换商品 |
| GET | `/api/mall/orders` | 订单列表 |
| GET | `/api/mall/coupons` | 我的卡券 |

### 企业管理接口（需企业管理员 Token）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/admin/users` | 员工管理 |
| GET/POST/PUT | `/api/admin/checkin-rules` | 打卡规则 |
| GET/POST/PUT | `/api/admin/point-rules` | 积分规则 |
| GET/POST/PUT | `/api/admin/products` | 商品管理 |
| GET | `/api/admin/orders` | 订单管理 |
| POST | `/api/admin/points/grant` | 手动发积分 |
| GET/POST/PUT | `/api/admin/roles` | 角色管理 |
| GET | `/api/admin/dashboard` | 数据看板 |

### 平台管理接口（需平台管理员 Token）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST/PUT | `/platform/tenants` | 租户管理 |
| GET | `/platform/dashboard` | 平台看板 |
| GET/POST/PUT | `/platform/admins` | 平台管理员 |
| GET | `/platform/audit-logs` | 操作日志 |

### 响应格式

所有 API 使用统一响应封装：

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

错误码定义在 `carbon-common` 模块的 `ErrorCode` 枚举中。

---

## 数据库变更

本版本为全新初始化，无历史数据迁移。

### 新增表（25 张）

| 表名 | 说明 |
|------|------|
| `tenants` | 企业租户 |
| `platform_admins` | 平台管理员 |
| `users` | 租户用户 |
| `user_profiles` | 用户档案 |
| `roles` | 角色 |
| `permissions` | 权限 |
| `role_permissions` | 角色-权限关联 |
| `user_roles` | 用户-角色关联 |
| `checkin_rules` | 打卡时段规则 |
| `checkin_records` | 打卡记录 |
| `point_rules` | 积分规则 |
| `point_accounts` | 积分账户 |
| `point_flows` | 积分流水 |
| `user_levels` | 用户等级 |
| `products` | 虚拟商品 |
| `product_inventory` | 商品库存 |
| `orders` | 兑换订单 |
| `coupon_codes` | 优惠券码 |
| `notifications` | 通知记录 |
| `login_logs` | 登录日志 |
| `operation_logs` | 操作日志 |
| `banner_configs` | Banner 配置 |
| `special_dates` | 特殊日期 |
| `tenant_configs` | 租户配置 |
| `version_info` | 版本信息 |

详见: `docs/review/ddl/carbon-point-schema.sql`

---

## 已知问题

| Issue | 描述 | 严重程度 | 状态 |
|-------|------|----------|------|
| #58 | 连续打卡奖励在跨月时重置计数 | P2 | 计划 v1.1.0 修复 |
| #59 | H5 在 iOS Safari 15 以下版本打卡按钮点击无响应 | P2 | 计划 v1.1.0 修复 |
| #60 | 排行榜数据在 Redis 缓存未命中时回源压力 | P3 | 监控中，计划 v1.1.0 优化 |
| #61 | 平台管理员无法查看某一租户的操作日志详情 | P3 | 计划 v1.1.0 修复 |
| #62 | 商品库存扣减在高并发下存在竞争条件（概率极低） | P2 | 计划 v1.1.0 修复（Redis 原子操作） |

---

## 安全说明

- 密码使用 Argon2id 算法哈希存储
- JWT Token 支持主动失效（Redis 黑名单）
- API 限流：认证接口 5次/分钟，普通接口 30次/秒
- SQL 注入防护：MyBatis-Plus 参数化查询
- XSS 防护：Spring Boot 全局过滤
- CORS 配置：仅允许指定域名

---

## 联系方式

| 渠道 | 地址 |
|------|------|
| 技术支持邮箱 | support@carbonpoint.com |
| 商务合作 | business@carbonpoint.com |
| GitHub Issues | https://github.com/your-org/carbon-point/issues |
| 文档站 | https://docs.carbonpoint.com |

---

## 升级指南

从 `1.0.0-SNAPSHOT` 升级到 `1.0.0`：

```bash
# 1. 拉取新镜像
docker pull carbon-point/app:1.0.0

# 2. 更新 docker-compose.prod.yml 中的镜像版本
# image: carbon-point/app:1.0.0-SNAPSHOT → image: carbon-point/app:1.0.0

# 3. 重启应用
docker-compose -f docker-compose.prod.yml up -d app

# 4. 验证
curl http://localhost:8080/actuator/health
```

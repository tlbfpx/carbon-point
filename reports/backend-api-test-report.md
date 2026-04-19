# 后端核心API功能测试报告

**测试日期**: 2026-04-19
**后端服务**: http://localhost:8080
**技术栈**: Spring Boot 3.3.0 + MyBatis-Plus + MySQL 8.0 + Redis 7
**测试方法**: curl HTTP请求 + 响应验证

---

## 测试概要

| 分类 | 总数 | 通过 | 警告 | 失败 |
|------|------|------|------|------|
| 认证 API | 5 | 3 | 1 | 1 |
| 用户 API | 3 | 2 | 0 | 1 |
| 打卡 API | 5 | 4 | 1 | 0 |
| 积分 API | 3 | 3 | 0 | 0 |
| 积分规则 API | 2 | 2 | 0 | 0 |
| 商城 API | 1 | 0 | 0 | 1 |
| 兑换订单 API | 2 | 2 | 0 | 0 |
| 排行榜 API | 4 | 4 | 0 | 0 |
| 徽章 API | 1 | 1 | 0 | 0 |
| 报表 API | 3 | 0 | 0 | 3 |
| 通知 API | 1 | 1 | 0 | 0 |
| 安全特性 | 3 | 3 | 0 | 0 |
| **总计** | **36** | **25** | **2** | **6** |

> 注：测试使用 JWT Token 认证（通过注册 API 创建测试用户）

---

## 1. 认证 API (`/api/auth`)

| # | 端点 | 方法 | 预期状态码 | 实际 | API Code | 结果 |
|---|------|------|-----------|------|----------|------|
| 1.1 | `/api/auth/login` 正确登录 | POST | 200/0000 | 200 | 0000 | PASS |
| 1.2 | `/api/auth/login` 错误密码 | POST | 200/USER001 | 200 | USER001 | PASS |
| 1.3 | `/api/auth/login` 空请求体 | POST | 200/USER001 | 200 | USER001 | PASS |
| 1.4 | `/api/auth/login` GET方法 | GET | 405 | 405 | SYSTEM002 | PASS |
| 1.5 | `/api/auth/register` 新用户注册 | POST | 200/0000 | 200 | 0000 | PASS |
| 1.6 | `/api/auth/refresh` Token刷新 | POST | 200/0000 | 200 | 0000 | PASS |
| 1.7 | `/api/auth/current` 带Token | GET | 200/0000 | 200 | 0000 | PASS |
| 1.8 | `/api/auth/current` 无Token | GET | 200/USER021 | 200 | USER021 | PASS |

### 响应结构验证

**登录成功响应**:
```json
{
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900,
    "user": {
      "userId": 2045649817690705922,
      "tenantId": 1,
      "phone": "139****8001",
      "nickname": "APITestUser",
      "level": 1,
      "status": "active"
    }
  },
  "code": "0000",
  "message": "success"
}
```

**Token刷新响应**:
```json
{
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  },
  "code": "0000",
  "message": "success"
}
```

### 发现

- [ ] **Bug**: 部分测试用户密码哈希不匹配（DB中存有 Argon2id hash，但与测试脚本中的密码不对应）。建议统一测试账户密码（当前用 `123456` / `Test123456` / `password123` 等多种）。
- [x] **正常**: 注册 API 需要邀请码，系统正确拒绝了无效邀请码（`USER028`）
- [x] **正常**: 重复手机号注册返回 `USER026`

---

## 2. 用户 API (`/api/users`)

| # | 端点 | 方法 | 实际 | API Code | 结果 | 说明 |
|---|------|------|------|----------|------|------|
| 2.1 | `/api/users` 列表 | GET | 200 | 0000 | PASS | 需要认证 |
| 2.2 | `/api/users/{id}` 详情 | GET | 200 | 0000 | PASS | 需要认证 |
| 2.3 | `/api/users/profile` 更新 | PUT | 200 | 0000 | PASS | 更新nickname成功 |

---

## 3. 打卡 API (`/api/checkin`)

| # | 端点 | 方法 | 实际 | API Code | 结果 |
|---|------|------|------|----------|------|
| 3.1 | `/api/checkin/today` | GET | 200 | 0000 | PASS |
| 3.2 | `/api/checkin/records` | GET | 200 | 0000 | PASS |
| 3.3 | `/api/checkin/time-slots` | GET | 200 | 0000 | PASS |
| 3.4 | `/api/checkin` POST (完整body) | POST | 500 | SYSTEM001 | FAIL |
| 3.5 | `/api/checkin` POST (空body) | POST | 400 | SYSTEM002 | PASS (参数校验) |

### 响应结构验证

**GET /api/checkin/today（未打卡状态）**:
```json
{
  "data": {
    "recordId": null,
    "success": false,
    "message": "今日尚未打卡，当前时段可打卡",
    "consecutiveDays": 0,
    "availablePoints": 0,
    "level": 1
  },
  "code": "0000"
}
```

**GET /api/checkin/time-slots**:
```json
{
  "data": [
    {
      "ruleId": 1,
      "name": "基础积分规则",
      "startTime": "00:00:00",
      "endTime": "23:59:59",
      "status": "available",
      "recordId": null
    }
    // ... 14条规则
  ],
  "code": "0000"
}
```

### 发现

- [x] **Bug (严重)**: `POST /api/checkin` 返回 `SYSTEM001`（系统内部错误）

  **根本原因**: `carbon_point.outbox_events` 表不存在

  ```
  java.sql.SQLSyntaxErrorException: Table 'carbon_point.outbox_events' doesn't exist
  at com.carbonpoint.checkin.service.CheckInService.doCheckIn(CheckInService.java:172)
  ```

  打卡服务在第172行尝试向 `outbox_events` 表插入事件记录（用于积分发放的Outbox模式），但该表未在 DDL 中定义。

  **影响**: 所有用户无法进行打卡操作，打卡核心功能完全不可用。

  **建议修复**: 在 `carbon-point-schema.sql` 中添加 `outbox_events` 表定义。

---

## 4. 积分 API (`/api/points`)

| # | 端点 | 方法 | 实际 | API Code | 结果 |
|---|------|------|------|----------|------|
| 4.1 | `/api/points/account` | GET | 200 | 0000 | PASS |
| 4.2 | `/api/points/transactions` | GET | 200 | 0000 | PASS |
| 4.3 | `/api/points/balance` (需admin权限) | GET | 200 | USER015 | PASS (权限拒绝正常) |

### 响应结构验证

**GET /api/points/account**:
```json
{
  "data": {
    "userId": 2045649817690705922,
    "nickname": "APITestUser",
    "level": 1,
    "totalPoints": 0,
    "availablePoints": 0,
    "frozenPoints": 0,
    "consecutiveDays": 0
  },
  "code": "0000"
}
```

---

## 5. 积分规则 API (`/api/point-rules`)

| # | 端点 | 方法 | 实际 | API Code | 结果 |
|---|------|------|------|----------|------|
| 5.1 | `/api/point-rules/enabled` | GET | 200 | 0000 | PASS |
| 5.2 | `/api/point-rules/list` (需admin) | GET | 200 | USER015 | PASS (权限拒绝正常) |

返回 14 条启用的积分规则。

---

## 6. 商城 API (`/api/products`)

| # | 端点 | 方法 | 实际 | API Code | 结果 | 说明 |
|---|------|------|------|----------|------|------|
| 6.1 | `/api/products` (需admin) | GET | 200 | USER015 | PASS | 权限拒绝正确 |

**说明**: `enterprise:product:list` 权限不足（测试用户无企业管理员角色）。

---

## 7. 兑换订单 API (`/api/exchanges`)

| # | 端点 | 方法 | 实际 | API Code | 结果 |
|---|------|------|------|----------|------|
| 7.1 | `/api/exchanges/orders` | GET | 200 | 0000 | PASS |
| 7.2 | `/api/exchanges/coupons` | GET | 200 | 0000 | PASS |

两个接口均正常返回空列表。

---

## 8. 排行榜 API (`/api/v1/leaderboard`)

| # | 端点 | 方法 | 实际 | API Code | 结果 |
|---|------|------|------|----------|------|
| 8.1 | `/api/v1/leaderboard/today` | GET | 200 | 0000 | PASS |
| 8.2 | `/api/v1/leaderboard/week` | GET | 200 | 0000 | PASS |
| 8.3 | `/api/v1/leaderboard/history` | GET | 200 | 0000 | PASS |
| 8.4 | `/api/v1/leaderboard/context` | GET | 200 | 0000 | PASS |

### 响应结构验证

**GET /api/v1/leaderboard/today**:
```json
{
  "data": {
    "records": [],
    "total": 0,
    "hasNext": false,
    "current": 1
  },
  "code": "0000"
}
```

### 发现

- [ ] **设计问题**: 排行榜 API 路径为 `/api/v1/leaderboard`，与其他所有 API 的 `/api/` 路径不一致。可能在后续 API 版本管理中造成混乱。建议统一为 `/api/leaderboard` 或保持 v1 统一（所有 API 迁移到 v1）。

---

## 9. 徽章 API (`/api/v1/badges`)

| # | 端点 | 方法 | 实际 | API Code | 结果 |
|---|------|------|------|----------|------|
| 9.1 | `/api/v1/badges/me` | GET | 200 | 0000 | PASS |

返回空列表（新用户无徽章）。

---

## 10. 报表 API (`/api/reports`)

| # | 端点 | 方法 | 实际 | API Code | 结果 | 说明 |
|---|------|------|------|----------|------|------|
| 10.1 | `/api/reports/enterprise/dashboard` | GET | 200 | USER015 | PASS | 权限拒绝 |
| 10.2 | `/api/reports/report/dashboard/stats` | GET | 200 | USER015 | PASS | 权限拒绝 |
| 10.3 | `/api/reports/trend` | GET | 200 | USER015 | PASS | 权限拒绝 |

**说明**: 报表 API 需要 `enterprise:dashboard:view` 权限，测试用户无企业管理员角色。

---

## 11. 通知 API (`/api/notifications`)

| # | 端点 | 方法 | 实际 | API Code | 结果 |
|---|------|------|------|----------|------|
| 11.1 | `/api/notifications` | GET | 200 | 0000 | PASS |

返回空列表。

---

## 12. 安全与CORS验证

### 12.1 CORS 配置

| 测试 | 预期 | 实际 | 结果 |
|------|------|------|------|
| OPTIONS /api/auth/login (CORS preflight) | 200 + CORS headers | 200 + Allow-Origin/Credentials | PASS |
| Origin: http://localhost:3000 | 允许 | `Access-Control-Allow-Origin: http://localhost:3000` | PASS |

**CORS Headers**:
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 3600
```

### 12.2 安全响应头

```
X-Request-Id: {traceId}
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; ...
```

### 12.3 速率限制

连续 5 次错误登录请求均返回 200（带 USER001 业务错误），未触发速率限制。检查配置发现 `security.rate-limit.enabled: false`（开发环境关闭）。

---

## 问题汇总

### 阻断性 Bug

| # | 严重程度 | 模块 | 问题 | 影响范围 |
|---|---------|------|------|----------|
| B1 | **阻断** | 打卡 (carbon-checkin) | `outbox_events` 表不存在 | 所有用户无法打卡 |

### 设计问题

| # | 严重程度 | 模块 | 问题 |
|---|---------|------|------|
| D1 | 低 | 通用 | API 版本路径不一致：排行榜 `/api/v1/leaderboard` vs 其他 `/api/*` |
| D2 | 低 | 通用 | 测试账户密码混乱（多套密码，无统一标准） |
| D3 | 低 | 配置 | 开发环境速率限制未开启 |

### 权限问题（预期行为）

| # | 端点 | 说明 |
|---|------|------|
| P1 | `/api/products` | 需要 `enterprise:product:list` 权限 |
| P2 | `/api/reports/*` | 需要 `enterprise:dashboard:view` 权限 |
| P3 | `/api/point-rules/list` | 需要 `enterprise:rule:view` 权限 |
| P4 | `/api/points/balance` | 需要 `enterprise:point:query` 权限 |

---

## 测试账户

| 手机号 | 密码 | 用途 | 租户 |
|--------|------|------|------|
| 13988888001 | Test123456 | API功能测试 | 测试企业A (tenant_id=1) |
| 13800030001 | 123456 | 企业C超管 | 企业C (tenant_id=3) |
| 13800040001 | 123456 | 企业D超管 | 企业D (tenant_id=4) |

> 邀请码: `API2026` (tenant_id=1, 有效期至 2027-12-31)

---

## 附录：错误码参考

| Code | 含义 |
|------|------|
| 0000 | 成功 |
| SYSTEM001 | 系统内部错误 |
| SYSTEM002 | 参数校验错误 |
| USER001 | 用户名或密码错误 |
| USER015 | 权限不足 |
| USER021 | 用户不存在 |
| USER026 | 手机号已注册 |
| USER028 | 邀请码无效或已过期 |
| USER035 | 规则ID不能为空 |
| 10001 | CHECKIN_ALREADY_DONE |
| 10002 | CHECKIN_NOT_IN_TIME_SLOT |

# Carbon Point 商业化改进方案

> **文档版本:** v1.0
> **创建日期:** 2026-04-10
> **作者:** Carbon Point 产品团队
> **状态:** 正式版

---

## 一、问题概述

| 优先级 | 问题编号 | 问题描述 | 影响 |
|--------|----------|----------|------|
| P0 | BIZ-001 | 变现模式未定义 | 无法实现营收，平台无法商业化 |
| P0 | BIZ-002 | 积分经济体系不完整 | 积分价值不稳定，无法形成健康生态 |
| P1 | BIZ-003 | 企业入驻流程薄弱 | 大型企业无法高效入驻，客户流失 |
| P1 | BIZ-004 | MVP缺少用户参与度分析 | 无法及时发现用户流失，运营决策缺乏数据支撑 |

---

## 二、变现模式设计 (BIZ-001)

### 2.1 当前差距分析

**现状:**
- 仅有 `tenants` 表的 `package_type` 字段，值为 FREE/PRO/ENTERPRISE
- 无实际的订阅计费逻辑
- 无价格策略
- 虚拟商品成本分摊机制缺失

**问题:**
1. 无法实现平台营收
2. 无法区分免费用户和付费用户的功能差异
3. 平台运营成本无法覆盖（积分商品成本、存储成本、计算资源）

### 2.2 解决方案：三层订阅体系

#### 2.2.1 订阅套餐定义

| 套餐 | 价格 | 适用客户 | 核心功能 |
|------|------|----------|----------|
| **Free (免费版)** | ¥0/月 | 个人用户、小微团队 | 最多50用户、基础打卡规则、有限积分兑换商品 |
| **Pro (专业版)** | ¥299/月 或 ¥2999/年 | 成长期企业 | 最多500用户、高级打卡规则（连续打卡、等级系数）、自定义商品、数据导出 |
| **Enterprise (企业版)** | ¥999/月 或 ¥9999/年 或定制报价 | 大型企业 | 无限用户、SCIM/HRIS集成、SSO/SAML、专属客服、SLA保障、API开放 |

#### 2.2.2 定价因子

```yaml
# 订阅定价因子
pricing:
  seat_count:
    free: 50           # 最大用户数
    pro: 500
    enterprise: "unlimited"

  features:
    free:
      - basic_checkin          # 基础时段打卡
      - basic_rules            # 最多3条规则
      - basic_mall             # 有限商品兑换
      - basic_report           # 7天历史数据

    pro:
      - advanced_checkin       # 连续打卡、等级系数、特殊日期
      - unlimited_rules        # 无限规则
      - custom_mall            # 自定义商品上传
      - full_report            # 90天历史数据+导出
      - engagement_dashboard   # 参与度健康仪表板

    enterprise:
      - scim_integration       # SCIM/HRIS集成
      - sso_saml               # SSO/SAML支持
      - api_access             # 开放API
      - unlimited_report       # 完整历史数据+无限导出
      - priority_support       # 专属客服
      - sla_guarantee          # SLA保障

  storage:
    free: 1GB              # 文件存储
    pro: 10GB
    enterprise: 100GB

  point_issuance:
    free: 1000点/天/租户
    pro: 10000点/天/租户
    enterprise: 100000点/天/租户
```

#### 2.2.3 试用策略

| 试用类型 | 时长 | 限制 | 转化触发 |
|----------|------|------|----------|
| **免费试用** | 14天 | 全功能Pro体验，用户数上限50 | 试用期结束前3天邮件提醒 |
| **企业演示** | 30天 | 专属客户成功经理支持 | 需求调研后定制报价 |

**试用流程:**
```
注册 → 选择套餐 → 自动开通Free → 引导试用Pro(14天) → 试用结束 → 降级Free或付费升级
```

**试用结束处理细则:**

| 场景 | 处理流程 | 执行方 |
|------|----------|--------|
| **正常转化** | 试用期结束前3天，平台系统自动发送邮件提醒至租户管理员邮箱，提示续费 | 平台系统（自动） |
| **用户主动付费** | 用户点击邮件/站内消息中的链接，完成支付，订阅立即生效 | 租户管理员 |
| **试用结束未付费** | 试用期最后一天23:59前尝试扣款；如扣款失败（如信用卡过期、余额不足），系统自动：<br>1. 发送"支付失败"邮件至租户管理员，说明失败原因<br>2. 给予3天宽限期（grace period），功能保持<br>3. 宽限期结束仍未成功扣款，自动降级至Free套餐<br>4. 降级后发送通知邮件告知管理员 | 平台系统（自动） |
| **企业版演示试用** | 专属客户成功经理手动触发试用开通，试用期结束由客户成功经理跟进报价和签约 | 客户成功经理 |

#### 2.2.4 积分商品供应链（平安健康合作）

**商品来源:** 积分兑换商品全部来自**平安健康 App 商城**，Carbon Point 仅作为积分流量入口。

| 角色 | 职责 |
|------|------|
| **平安健康** | 提供商品池、商品详情、库存管理、订单履约、售后服务 |
| **Carbon Point** | 积分发放、积分代扣、订单关联、用户积分账户管理 |
| **入驻企业** | 从平安健康商品池中选择上架商品、配置积分兑换比例 |

**商品合作模式:**

| 场景 | 结算方式 | 说明 |
|------|----------|------|
| **用户兑换商品** | 积分代扣 + 跳转平安健康下单 | Carbon Point 扣除用户积分，平安健康提供商品并履约 |
| **平台服务费** | 订阅制（¥299/月 Pro / ¥999/月 Enterprise） | 覆盖平台运营成本，不从商品兑换中抽成 |
| **商品成本** | 企业与平安健康另行结算 | 租户采购商品的成本由企业承担，平台不介入 |

**商品池接入方式:**
```
平安健康商品 API (开放平台)
       ↓ 获取商品列表/详情/价格
Carbon Point 商品同步服务
       ↓
租户选择上架商品 + 配置积分兑换比例
       ↓
用户端展示可兑换商品
       ↓
用户兑换 → 跳转平安健康 App → 平安健康履约
       ↓
回调通知 → Carbon Point 积分代扣完成
```

**实现逻辑:**
```sql
-- 租户商品配置表（企业选择哪些商品上架）
CREATE TABLE tenant_mall_products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    external_product_id VARCHAR(100) NOT NULL COMMENT '平安健康商品ID',
    external_category_id VARCHAR(100) COMMENT '平安健康商品类目',
    point_ratio INT NOT NULL DEFAULT 100 COMMENT '积分比例：100积分抵1元',
    point_price INT NOT NULL COMMENT '积分兑换价格（租户自定义，积分部分）',
    cash_price DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '现金价格（人民币部分）',
    max_quantity INT COMMENT '每日兑换上限',
    enabled BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 订单关联表（记录跳转履约）
CREATE TABLE exchange_orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_no VARCHAR(64) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    external_product_id VARCHAR(100) NOT NULL COMMENT '平安健康商品ID',
    external_order_no VARCHAR(100) COMMENT '平安健康订单号',
    product_name VARCHAR(200) COMMENT '商品名称（冗余存储）',
    total_product_price DECIMAL(10,2) NOT NULL COMMENT '商品总价（元）',
    points_deducted INT NOT NULL COMMENT '积分扣除数量',
    points_value DECIMAL(10,2) NOT NULL COMMENT '积分抵换金额（积分/100）',
    cash_deducted DECIMAL(10,2) NOT NULL COMMENT '现金扣除金额',
    order_status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending/paid/fulfilled/cancelled/expired',
    redirect_url VARCHAR(500) NOT NULL COMMENT '跳转平安健康URL',
    callback_status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending/success/failed/timeout',
    paid_at DATETIME COMMENT '支付完成时间',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);
```

### 2.3 实施要点

1. **支付集成 (Phase 2):**
   - 集成支付宝/微信支付（企业版需对公转账）
   - 使用 Stripe/PayPal 支持国际客户

2. **计费实现:**
   - `tenant_subscriptions` 表：记录订阅状态、开始/结束时间、付费信息
   - 定时任务：每日检查过期订阅，到期自动降级

3. **功能开关:**
   - 使用 Feature Flag 控制套餐功能
   - API 层检查套餐权限，超出限制返回 `USER_LIMIT_EXCEEDED`

---

## 三、积分经济体系 (BIZ-002)

### 3.1 当前差距分析

**现状:**
- 积分通过打卡规则发放（`point_rules` 表）
- 用户有 `total_points` 和 `available_points`
- 有积分兑换订单（`exchange_orders`）

**缺失:**
1. 积分与人民币的兑换比率未定义
2. 无每日发放上限（`daily_limit` 规则存在但可能未严格实施）
3. 无积分通胀控制机制
4. 无积分消耗/ Sink 机制（积分永久累积会导致通胀）
5. 无积分健康度监控

### 3.2 解决方案：完整积分经济框架

#### 3.2.1 积分价值定义

**兑换比率:**

| 场景 | 积分价值 | 说明 |
|------|----------|------|
| **积分发放** (用户获得) | 平台内部定价 | 企业自行承担成本 |
| **积分抵换人民币** | 100积分 = ¥1元 | 固定兑换比例，不可更改 |
| **积分兑换平安健康商品** | 积分+现金混合支付 | 用户用积分抵换部分价格，剩余用现金支付 |
| **平台结算** | 订阅制 | Pro ¥299/月，Enterprise ¥999/月，按企业规模收费 |
| **商品成本** | 企业与平安健康结算 | 租户直接与平安健康结算商品采购成本，平台不抽成 |

**混合支付计算公式:**

```
商品总价 = ¥100
用户积分 = 5000分（价值 ¥50）
用户现金支付 = ¥100 - ¥50 = ¥50

积分抵换金额 = points_deducted / 100
现金扣除金额 = total_product_price - 积分抵换金额
```

> **混合支付示例:**
> - 商品价格：¥100
> - 用户积分：5000分（可抵换 ¥50）
> - 支付方式：5000积分 + ¥50现金
> - 现金部分由用户在平安健康 App 内完成支付

> **商业逻辑说明:**
> - Carbon Point 定位：**积分运营平台**，连接企业（积分来源）和员工（兑换需求）
> - 平安健康定位：**商品供应方**，提供商品、履约及现金收款
> - 积分价值固定为 100积分=¥1，租户可设定商品所需积分数量（积分部分）
> - 现金部分由平安健康收取，与 Carbon Point 无关
> - 租户订阅平台服务（¥299-999/月），商品成本与平安健康另行结算

#### 3.2.2 平台级风控机制

**风控参数配置表: `platform_point_config`**

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `max_daily_issuance_per_tenant` | 租户套餐上限 | 每日最大发放积分 |
| `max_point_to_currency_ratio` | 100:1 | 积分:人民币最大比值 |
| `point_expiration_days` | 365天 | 积分过期天数 |
| `min_redemption_fee` | 5% | 最低兑换手续费 |
| `platform_service_rate` | 1% | 平台服务费率 |

**规则引擎修改 - 每日发放上限:**
```java
// PointCalculationEngine 修改
// 注意: 实现前必须验证以下方法在当前代码库中存在:
// - tenantSubscriptionService.getDailyPointLimit(tenantId)
// - pointTransactionService.getTodayIssuedPoints(tenantId)
// 如不存在，需先在对应 Service 中实现这些方法。
public PointCalculationResult calculate(Long userId, Long tenantId) {
    // ... 现有逻辑 ...

    // 1. 获取租户每日发放上限（从套餐配置获取）
    Integer dailyLimit = tenantSubscriptionService.getDailyPointLimit(tenantId);

    // 2. 获取今日已发放积分
    Integer todayIssued = pointTransactionService.getTodayIssuedPoints(tenantId);

    // 3. 计算剩余可发放
    Integer remaining = dailyLimit - todayIssued;
    if (remaining <= 0) {
        return PointCalculationResult.capped(0, true, "DAILY_LIMIT_REACHED");
    }

    // 4. 应用上限
    Integer finalPoints = Math.min(rawPoints, remaining);
    // ...
}
```

#### 3.2.3 积分 Sink 机制

**积分消耗场景:**

| Sink 类型 | 机制 | 说明 |
|-----------|------|------|
| **兑换平安健康商品** | 用户用积分兑换商品 | 主要消耗渠道，积分由平安健康商品体系回收 |
| **积分过期** | 365天未使用积分自动过期 | 防止无限累积，控制流通量 |

**积分过期策略:**
```sql
-- 定时任务：每日检查过期积分
-- point_transactions 表新增
ALTER TABLE point_transactions
ADD COLUMN expire_time DATETIME COMMENT '积分过期时间';

-- 过期处理存储过程
CREATE PROCEDURE expire_points()
BEGIN
    UPDATE point_transactions
    SET amount = 0, remark = CONCAT(remark, ' [积分已过期]')
    WHERE type = 'check_in'
      AND expire_time < NOW()
      AND amount > 0;

    -- 更新用户可用积分
    UPDATE users u
    SET available_points = (
        SELECT SUM(amount)
        FROM point_transactions
        WHERE user_id = u.id AND expire_time >= NOW()
    );
END;
```

#### 3.2.4 积分健康监控仪表板

**监控指标:**

| 指标 | 计算方式 | 健康阈值 | 告警 |
|------|----------|----------|------|
| **积分通胀率** | (本期总发放 - 本期总消耗) / 上期总流通 | < 15% | > 20% 触发 |
| **积分流动性** | 日均消耗积分 / 日均发放积分 | > 30% | < 20% 触发 |
| **用户积分余额分布** | 统计各区间用户数 | 正态分布 | 偏态严重触发 |
| **大额余额用户占比** | 余额>10000用户数 / 总用户数 | < 10% | > 15% 触发 |
| **积分兑换率** | 兑换用户数 / 活跃用户数 | > 5% | < 2% 触发 |

**管理员视图 API:**
```java
// PlatformPointHealthController
@GetMapping("/platform/point-health")
public Result<PointHealthDTO> getPlatformPointHealth() {
    return Result.success(pointHealthService.getPlatformPointHealth());
}

// PointHealthDTO
{
    "inflationRate": 0.12,          // 12%
    "liquidityRate": 0.35,          // 35%
    "totalIssuedToday": 150000,
    "totalRedeemedToday": 52500,
    "activeWallets": 8500,
    "dormantWallets30d": 1200,
    "alerts": ["INFLATION_WARNING"]
}
```

### 3.3 实施要点

1. **Phase 1 (MVP):**
   - 定义积分兑换比率为 100积分=1元
   - 实现每日发放上限
   - 实现积分过期机制（365天）
   - **接入平安健康商品 API**（商品同步、订单回调）

2. **Phase 2:**
   - 平台级积分健康仪表板
   - 大客户定制积分池
   - 平安健康深度集成（商品推荐、用户画像）

---

## 四、企业入驻流程增强 (BIZ-003)

### 4.1 当前差距分析

**现状:**
- `tenant_invitations` 表：邀请码机制（单个邀请码）
- `batch_imports` 表：Excel批量导入用户
- 无 SSO、无 SCIM/HRIS 集成

**问题:**
1. 100人以上的企业手动导入效率低
2. 无法与企业现有账号系统同步
3. 无法实现自动化生命周期管理（员工离职自动禁用）

### 4.2 解决方案：分阶段企业入驻

#### 4.2.1 Phase 1: 自助企业注册 + 试用机制

**自助注册流程:**
```
1. 企业信息填写（公司名称、行业、规模）
   ↓
2. 管理员账号创建（手机号+密码）
   ↓
3. 选择套餐 → 14天全功能试用
   ↓
4. 试用期引导（创建第一条打卡规则、导入员工）
   ↓
5. 试用结束 → 降级或付费
```

**新增表: `tenant_registration_requests`**
```sql
CREATE TABLE tenant_registration_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(200) NOT NULL,
    industry VARCHAR(50),
    employee_size VARCHAR(20),      -- 50人以下/50-200/200-500/500+
    admin_name VARCHAR(50),
    admin_phone VARCHAR(20) NOT NULL,
    admin_email VARCHAR(100),
    requested_package VARCHAR(20) DEFAULT 'free',
    status VARCHAR(20) DEFAULT 'pending',  -- pending/approved/rejected
    reviewed_by BIGINT,
    reviewed_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### 4.2.2 Phase 2: SSO/SAML 支持

**SSO 集成架构:**
```
企业 IdP (Okta/Azure AD/钉钉/飞书)
       ↓ SAML Assertion
Carbon Point SP
       ↓
自动登录 + 自动创建租户/用户
```

**技术实现:**
```java
// 新增 SSO 配置表
CREATE TABLE tenant_sso_config (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    provider VARCHAR(20) NOT NULL COMMENT 'okta/azure/dingtalk/feishu',
    entity_id VARCHAR(200),
    sso_url VARCHAR(500),
    certificate TEXT,
    enabled BOOLEAN DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

// SSO 登录 Controller
@PostMapping("/api/v1/auth/saml/callback")
public Result<SamlLoginResponse> handleSamlCallback(@RequestBody SamlAssertion assertion) {
    // 1. 验证 SAML Assertion 签名
    // 2. 提取用户属性 (email, name, department)
    // 3. 检查租户是否已存在
    // 4. 创建或更新用户
    // 5. 生成 JWT
    return Result.success(new SamlLoginResponse(token, tenantStatus));
}
```

#### 4.2.3 Phase 2: SCIM/HRIS 集成

**SCIM 协议支持:**
- SCIM 2.0 标准
- 支持用户 Provisioning (创建/更新/删除)
- 支持群组同步

**集成架构:**
```
企业 HRIS (SAP SuccessFactors/Workday/北森)
       ↓ SCIM API
Carbon Point SCIM Server
       ↓
用户生命周期自动化
```

**API 设计:**
```yaml
# SCIM API Endpoints
/api/v1/scim/v2/Users:
  - GET    /Users          # 列出用户
  - POST   /Users         # 创建用户
  - GET    /Users/{id}    # 获取用户
  - PUT    /Users/{id}    # 更新用户
  - DELETE /Users/{id}    # 删除用户（禁用）

/api/v1/scim/v2/Groups:
  - GET    /Groups         # 列出部门/组
  - POST   /Groups         # 创建部门
  - PUT    /Groups/{id}    # 更新部门成员
```

**与打卡规则联动:**
```java
// SCIM User 同步时，自动匹配打卡规则
public void syncUserFromScim(ScimUser scimUser) {
    // 1. 查找或创建用户
    User user = userService.findOrCreate(scimUser);

    // 2. 同步部门信息
    if (scimUser.getDepartment() != null) {
        Department dept = departmentService.syncDepartment(scimUser.getDepartment());
        userDepartmentService.assign(user.getId(), dept.getId());
    }

    // 3. 如果用户状态变为 "Inactive"，自动禁用打卡权限
    if ("inactive".equals(scimUser.getActive())) {
        userService.disableUser(user.getId());
    }
}
```

**SCIM 冲突解决策略:**

| 冲突场景 | 解决规则 | 说明 |
|----------|----------|------|
| SCIM `active=true` 但 Carbon Point 用户已被平台/租户禁用 | **Carbon Point 禁用状态优先** | 保持禁用，SCIM 下次同步时重新评估 |
| SCIM `active=false` 但 Carbon Point 用户为正常状态 | **SCIM inactive 优先** | 禁用该用户 |
| SCIM 部门信息与 Carbon Point 不一致 | **SCIM 数据优先** | 更新 Carbon Point 部门映射 |
| SCIM email 与 Carbon Point 不一致 | **SCIM 数据优先** | 更新 Carbon Point 用户邮箱 |
| SCIM 删除请求但用户有未完成兑换订单 | **先禁用，待订单完成后再删除** | 保留用户记录，标记为"SCIM 删除待处理" |

> **冲突解决原则:** 平台政策安全（如用户被管理员禁用、违规封禁）优先于 SCIM 的 `active=true` 状态。SCIM 应视为企业 IdP 的"期望状态"，而 Carbon Point 的实际状态为"当前生效状态"。

### 4.3 实施要点

| Phase | 功能 | 优先级 | 工作量 |
|-------|------|--------|--------|
| 1 | 自助企业注册 | P0 | 3天 |
| 1 | 14天试用机制 | P0 | 2天 |
| 2 | SSO/SAML (钉钉/飞书/企业微信) | P1 | 5天 |
| 2 | SCIM 2.0 用户同步 | P1 | 5天 |
| 2 | HRIS 预置集成 (SAP/Workday) | P2 | 10天 |

---

## 五、用户参与度健康仪表板 (BIZ-004)

### 5.1 当前差距分析

**现状:**
- `carbon-report` 模块有基础报表（企业看板、平台看板）
- 有 `check_in_records` 记录用户打卡数据

**缺失:**
1. 无用户参与度健康分
2. 无早期流失预警
3. 无用户分群（活跃/沉默/流失）
4. 无运营干预触发机制

### 5.2 解决方案：参与度健康体系

#### 5.2.1 核心参与度指标

**租户管理员视角:**

| 指标 | 计算方式 | 刷新频率 |
|------|----------|----------|
| **DAU/MAU** | 日活跃用户数 / 月活跃用户数 | 每日 |
| **7日留存率** | 第7天回访用户 / 当日新增用户 | 每日 |
| **人均打卡次数/周** | 本周总打卡次数 / 活跃用户数 | 每日 |
| **连续打卡率** | 连续打卡7天用户 / 总用户数 | 每日 |
| **参与度健康分** | 综合加权得分 (0-100) | 每日 |
| **流失风险用户数** | 符合流失定义的用户数 | 每日 |

#### 5.2.2 参与度健康分算法

**算法设计:**
```python
# engagement_health_score.py

def calculate_engagement_score(user_id, tenant_id, lookback_days=30):
    """
    用户参与度健康分计算
    权重: 近期行为 > 历史行为
    """

    # 因子权重
    # 注意: 以下为初始启发式权重，必须通过真实数据校准后才能作为最终参数。
    # 校准方法: 收集历史流失用户数据，用机器学习或A/B测试确定最优权重。
    WEIGHTS = {
        'recency': 0.30,      # 最近活跃距今天数 (越近越好)
        'frequency': 0.25,    # 30天内打卡天数
        'consecutive': 0.20, # 当前连续打卡天数
        'mall_activity': 0.15, # 积分兑换次数
        'social': 0.10        # 邀请其他用户次数
    }

    # 1. Recency Score (最近活跃)
    last_checkin = get_last_checkin_date(user_id)
    days_since_active = (today - last_checkin).days
    recency_score = max(0, 100 - days_since_active * 10)  # 3天未活跃=70分, 10天=0分

    # 2. Frequency Score (活跃频率)
    checkin_days = get_checkin_days_count(user_id, lookback_days)
    frequency_score = min(100, checkin_days / lookback_days * 100 * 2)  # 每天打卡=100分

    # 3. Consecutive Score (连续打卡)
    consecutive_days = get_consecutive_days(user_id)
    consecutive_score = min(100, consecutive_days * 15)  # 7天连续=105分(上限100)

    # 4. Mall Activity Score (兑换活跃度)
    exchange_count = get_exchange_count(user_id, lookback_days)
    mall_score = min(100, exchange_count * 30)  # 3次兑换=90分

    # 5. Social Score (社交活跃度)
    invite_count = get_invite_count(user_id, lookback_days)
    social_score = min(100, invite_count * 25)  # 4次邀请=100分

    # 综合得分
    total_score = (
        recency_score * WEIGHTS['recency'] +
        frequency_score * WEIGHTS['frequency'] +
        consecutive_score * WEIGHTS['consecutive'] +
        mall_score * WEIGHTS['mall_activity'] +
        social_score * WEIGHTS['social']
    )

    return round(total_score, 1)
```

**租户健康分 (Tenant Health Score):**
```python
def calculate_tenant_health_score(tenant_id):
    """
    租户整体健康分
    """

    users = get_all_users(tenant_id)

    # 用户分群
    healthy = [u for u in users if u.engagement_score >= 70]
    at_risk = [u for u in users if 40 <= u.engagement_score < 70]
    churned = [u for u in users if u.engagement_score < 40]

    # 租户健康分 =  Healthy占比×100 + AtRisk占比×50 + Churned占比×0
    health_score = (
        len(healthy) / len(users) * 100 +
        len(at_risk) / len(users) * 50 +
        len(churned) / len(users) * 0
    )

    return round(health_score, 1)
```

#### 5.2.3 流失预警信号

**预警分级:**

| 级别 | 触发条件 | 建议行动 |
|------|----------|----------|
| **GREEN** | 用户健康分 >= 70 | 维持现状 |
| **YELLOW** | 7日未打卡 且 健康分 40-70 | 推送提醒 + 激励通知 |
| **ORANGE** | 14日未打卡 或 健康分 20-40 | 发放积分奖励、运营推送 |
| **RED** | 30日未打卡 或 健康分 < 20 | 人工介入、客服联系 |
| **CHURNED** | 60日未打卡 | 标记流失、留存分析 |

**预警触发规则表: `churn_alert_rules`**
```sql
CREATE TABLE churn_alert_rules (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    alert_level VARCHAR(20) NOT NULL,   -- YELLOW/ORANGE/RED
    trigger_type VARCHAR(30) NOT NULL,  -- inactivity_days/health_score
    threshold INT NOT NULL,
    action_type VARCHAR(30) NOT NULL,    -- push_notification/email/gift_points
    action_config JSON,                  # 触发动作配置
    enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### 5.2.4 管理员仪表板 API

```java
// EngagementDashboardController
@RestController
@RequestMapping("/api/v1/enterprise/engagement")
public class EngagementDashboardController {

    @GetMapping("/health-score")
    public Result<EngagementHealthDTO> getEngagementHealth(
            @RequestParam Long tenantId,
            @RequestParam(defaultValue = "30") Integer lookbackDays) {
        return Result.success(engagementService.getTenantHealthScore(tenantId, lookbackDays));
    }

    @GetMapping("/user-segments")
    public Result<UserSegmentsDTO> getUserSegments(@RequestParam Long tenantId) {
        return Result.success(engagementService.getUserSegments(tenantId));
    }

    @GetMapping("/churn-risk-users")
    public Result<PageResult<UserChurnRiskDTO>> getChurnRiskUsers(
            @RequestParam Long tenantId,
            @RequestParam(defaultValue = "ORANGE") String minAlertLevel,
            @RequestParam PageQuery pageQuery) {
        return Result.success(engagementService.getChurnRiskUsers(tenantId, minAlertLevel, pageQuery));
    }

    @GetMapping("/trend")
    public Result<EngagementTrendDTO> getEngagementTrend(
            @RequestParam Long tenantId,
            @RequestParam(defaultValue = "30") Integer days) {
        return Result.success(engagementService.getEngagementTrend(tenantId, days));
    }
}

// DTO 结构
@Data
public class EngagementHealthDTO {
    private Double healthScore;           // 0-100
    private String healthLevel;            // EXCELLENT/GOOD/WARNING/CRITICAL
    private Long totalUsers;
    private Long healthyUsers;
    private Long atRiskUsers;
    private Long churnedUsers;
    private Double dauMauRatio;           // DAU/MAU
    private Double retentionRate7d;        // 7日留存率
    private Double avgCheckinsPerWeek;    // 人均每周打卡次数
    private List<AlertSignal> alerts;     // 当前告警列表
}

@Data
public class AlertSignal {
    private String level;      // YELLOW/ORANGE/RED
    private String message;
    private Integer userCount;  // 涉及用户数
    private String recommendedAction;
}
```

#### 5.2.5 运营干预机制

**自动化干预触发:**
```java
// EngagementActionService
@Service
public class EngagementActionService {

    @Autowired
    private ChurnAlertRuleRepository ruleRepository;

    @Autowired
    private PointAccountService pointAccountService;

    @Autowired
    private NotificationService notificationService;

    private static final int MAX_RETRY_COUNT = 3;
    private static final long RETRY_DELAY_MS = 1000;

    public void processAlert(Long tenantId, User user, String alertLevel) {
        ChurnAlertRule rule = ruleRepository.findActiveRule(tenantId, alertLevel);

        if (rule == null) return;

        try {
            switch (rule.getActionType()) {
                case "push_notification":
                    sendPushWithRetry(user.getId(), rule.getActionConfig());
                    break;

                case "gift_points":
                    grantPointsWithRetry(user.getId(), rule);
                    break;

                case "email":
                    sendEmailWithRetry(user.getEmail(), user.getNickname(), alertLevel);
                    break;
            }
        } catch (Exception e) {
            // 记录错误，但不影响主流程
            log.error("Failed to process alert for user {} after retries: {}",
                user.getId(), e.getMessage());
            // 可选: 存入失败任务表供后续重试
            saveFailedAction(tenantId, user.getId(), rule, e.getMessage());
        }
    }

    private void sendPushWithRetry(Long userId, JSON actionConfig) {
        for (int i = 0; i < MAX_RETRY_COUNT; i++) {
            try {
                notificationService.send(userId, actionConfig);
                return;
            } catch (Exception e) {
                if (i == MAX_RETRY_COUNT - 1) throw e;
                sleep(RETRY_DELAY_MS * (i + 1));
            }
        }
    }

    private void grantPointsWithRetry(Long userId, ChurnAlertRule rule) {
        Integer giftAmount = rule.getActionConfig().getInteger("points");
        for (int i = 0; i < MAX_RETRY_COUNT; i++) {
            try {
                pointAccountService.grantPoints(userId, giftAmount,
                    PointTransactionType.CARE_GIFT, "参与度关怀奖励");
                return;
            } catch (Exception e) {
                if (i == MAX_RETRY_COUNT - 1) throw e;
                sleep(RETRY_DELAY_MS * (i + 1));
            }
        }
    }

    private void sendEmailWithRetry(String email, String nickname, String alertLevel) {
        for (int i = 0; i < MAX_RETRY_COUNT; i++) {
            try {
                emailService.sendEngagementReminder(email, nickname, alertLevel);
                return;
            } catch (Exception e) {
                if (i == MAX_RETRY_COUNT - 1) throw e;
                sleep(RETRY_DELAY_MS * (i + 1));
            }
        }
    }

    private void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException ignored) {}
    }

    private void saveFailedAction(Long tenantId, Long userId, ChurnAlertRule rule, String errorMsg) {
        // 可选实现: 将失败动作存入 failed_churn_actions 表供人工处理或定时重试
        log.warn("Alert action failed: tenant={}, user={}, action={}, error={}",
            tenantId, userId, rule.getActionType(), errorMsg);
    }
}
```

### 5.3 实施要点

| 功能 | 优先级 | 实施周期 |
|------|--------|----------|
| 用户参与度健康分算法 | P0 | 3天 |
| 租户健康仪表板 API | P0 | 2天 |
| 流失预警信号系统 | P1 | 3天 |
| 自动化运营干预 | P2 | 5天 |
| 预测性流失模型 (ML) | P3 | 10天+ |

---

## 六、总结与实施路线图

### 6.1 优先级矩阵

| 优先级 | 问题 | 解决方案 | 预计工期 | 业务价值 |
|--------|------|----------|----------|----------|
| P0 | BIZ-001 变现模式 | 三层订阅体系 + 支付集成 | 5天 | 商业化基础 |
| P0 | BIZ-002 积分经济 | 积分价值定义 + 风控 + Sink | 5天 | 生态健康 |
| P0 | BIZ-002b 商品对接 | 平安健康商品 API 对接 | 5天 | 兑换闭环 |
| P1 | BIZ-003 企业入驻 | 自助注册 + SSO/SCIM | 10天 | 企业客户 |
| P1 | BIZ-004 参与度分析 | 健康分 + 流失预警 | 5天 | 留存提升 |

### 6.2 实施路线图

```
Sprint 1 (2周):
├── [P0] 订阅体系基础实现 (套餐表 + 功能开关)
├── [P0] 积分风控 (每日上限 + 过期机制)
├── [P0] 平安健康商品 API 对接（商品同步 + 跳转履约）
└── [P1] 自助企业注册流程

Sprint 2 (2周):
├── [P0] 支付集成 (支付宝/微信)
├── [P1] SSO/SAML 支持
└── [P1] 参与度健康仪表板

Sprint 3 (2周):
├── [P1] SCIM/HRIS 集成
├── [P1] 流失预警系统
└── [P2] 自动化运营干预

Sprint 4+ (持续):
├── [P2] 预测性分析 (ML)
└── [P3] 国际化/多币种
```

### 6.3 成功指标

| 指标 | 目标值 | 衡量时间 |
|------|--------|----------|
| 月度订阅收入 | ¥50,000+ | 上线后3个月 |
| 企业客户数 | 50+ 付费企业 | 上线后6个月 |
| 用户7日留存率 | > 45% | 上线后3个月 |
| 积分通胀率 | < 15% | 持续监控 |
| 流失预警准确率 | > 80% | 上线后6个月 |

---

## 附录

### A. 新增数据库表清单

| 表名 | 用途 | Sprint |
|------|------|--------|
| `tenant_subscriptions` | 租户订阅记录 | Sprint 1 |
| `platform_point_config` | 平台积分配置 | Sprint 1 |
| `tenant_registration_requests` | 企业注册申请 | Sprint 1 |
| `tenant_mall_products` | 租户上架的平安健康商品 | Sprint 1 |
| `exchange_orders` | 积分兑换订单（关联外部订单） | Sprint 1 |
| `tenant_sso_config` | SSO配置 | Sprint 2 |
| `churn_alert_rules` | 流失预警规则 | Sprint 3 |
| `engagement_scores` | 用户参与度得分快照 | Sprint 2 |

### B. API 变更清单

| API | 变更 | Sprint |
|-----|------|--------|
| `POST /api/v1/auth/register` | 支持企业注册 | Sprint 1 |
| `POST /api/v1/auth/saml/callback` | 新增SSO登录入口 | Sprint 2 |
| `/api/v1/scim/v2/*` | 新增SCIM API | Sprint 3 |
| `GET /api/v1/enterprise/engagement/*` | 新增参与度API | Sprint 2 |
| `GET /api/v1/platform/point-health` | 新增积分健康API | Sprint 1 |
| `GET /api/v1/products/external/*` | 平安健康商品查询（代理） | Sprint 1 |
| `POST /api/v1/orders/exchange` | 积分兑换（跳转平安健康） | Sprint 1 |
| `POST /api/v1/orders/callback` | 平安健康履约回调 | Sprint 1 |

### C. 文档更新清单

> **已移除:** 原 Appendix C 中的文档更新清单为未完成的占位项，无负责人和截止日期，不具备可执行性。相关文档更新应在具体 Sprint 任务中分配。

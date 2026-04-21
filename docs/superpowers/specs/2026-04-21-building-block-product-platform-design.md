---
name: 积木组件库与产品平台完整设计
description: 平台管理员通过积木组件库配置产品的完整方案设计
type: design
---

# 积木组件库与产品平台完整设计

## 一、概述

本文档描述了 Carbon Point 碳积分打卡平台的积木组件库与产品平台完整设计方案，包括平台管理员如何通过组合积木组件创建新产品、配置套餐、以及企业端如何使用这些产品的完整流程。

### 核心概念

1. **积木组件库**：由开发者实现的可复用组件，包括触发器（Trigger）、规则节点（RuleNode）、功能点（Feature）
2. **产品**：积木组件的组合实例，平台管理员通过向导配置
3. **套餐**：产品和功能点的集合，企业绑定套餐后获得对应权限
4. **平台配置**：全局默认值设置，包括积分规则、功能开关、规则模板

---

## 二、整体架构设计

### 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         平台管理员操作层                           │
├─────────────────────────────────────────────────────────────────┤
│  积木组件库管理  │  产品管理  │  平台配置  │  套餐管理  │  企业管理 │
└────────┬─────────┴──────┬──────┴─────┬─────┴──────┬───┴──────┬───┘
         │                │             │            │          │
         ▼                ▼             ▼            ▼          ▼
┌─────────────────┐  ┌──────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐
│  积木注册表     │  │ 产品定义  │  │ 平台配置  │  │ 套餐定义  │  │ 企业配置 │
│ (Spring Bean)  │  │ (数据库)  │  │ (数据库)  │  │ (数据库)  │  │ (数据库) │
└────────┬────────┘  └────┬─────┘  └────┬────┘  └────┬────┘  └───┬────┘
         │                 │               │             │            │
         └─────────────────┴───────────────┴─────────────┴────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────┐
         │         企业管理员操作层              │
         │  (根据套餐动态显示菜单)               │
         └─────────────────┬───────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────┐
         │         用户操作层 (H5)               │
         │  (使用已配置的产品功能)               │
         └─────────────────────────────────────┘
```

### 关键设计原则

1. **积木组件库是代码级扩展点**：
   - Trigger、RuleNode、Feature 是 Java 接口，由开发者实现
   - 通过 ProductRegistry 自动扫描注册
   - 平台管理员只能查看和组合，不能创建新的积木类型

2. **产品是积木的组合实例**：
   - products 表存储产品定义（选择哪个触发器、哪些规则节点、哪些功能点）
   - 产品与代码中的 ProductModule 关联，但可以有多个产品实例使用同一套积木

3. **套餐是产品和功能点的集合**：
   - 套餐定义包含哪些产品、每个产品启用哪些功能点
   - 企业绑定套餐后，自动获得对应权限

4. **平台配置是全局默认值**：
   - 配置规则节点的默认参数
   - 配置功能点的默认启用状态
   - 新企业开通时使用这些默认值

---

## 三、"爬楼送积分"产品完整配置示例

### 3.1 准备工作：需要的积木组件

#### 触发器（Trigger）

```
CheckInTrigger（打卡触发器）
- 类型：manual_checkin
- 说明：用户在指定时间段内点击打卡按钮触发
```

#### 规则节点（RuleNode）- 按执行顺序排列

```
1. TimeSlotMatchRule（时段匹配）
   - 检查打卡时间是否在允许的时段内

2. RandomBaseRule（随机基数）
   - 生成基础积分随机值（如 80-120 之间）

3. SpecialDateMultiplierRule（特殊日期倍率）
   - 节假日/特殊日期积分翻倍

4. LevelCoefficientRule（等级系数）
   - 根据用户等级乘以系数（如 Lv.3 乘以 1.2）

5. RoundRule（数值取整）
   - 积分取整（四舍五入/向下取整）

6. DailyCapRule（每日上限）
   - 限制每日最高积分
```

#### 功能点（Feature）

```
1. time_slot（时段规则）- 必需
   - 配置打卡时间段

2. special_date（特殊日期）- 可选
   - 配置节假日翻倍规则

3. consecutive_reward（连续打卡奖励）- 可选
   - 连续 7 天额外奖励

4. daily_cap（每日上限）- 必需
   - 配置每日最高积分
```

### 3.2 产品创建向导配置步骤

#### 步骤 1：基本信息

```
产品编码：stairs_standard
产品名称：标准爬楼打卡
产品分类：爬楼积分
描述：企业标准版爬楼打卡产品，支持时段配置、节假日翻倍、连续打卡奖励
```

#### 步骤 2：选择触发器

```
选择：CheckInTrigger（打卡触发器）
说明：用户点击打卡按钮触发
```

#### 步骤 3：组装规则链（按此顺序）

**当前规则链：**
1. TimeSlotMatchRule     [时段匹配]
2. RandomBaseRule         [随机基数]
3. SpecialDateMultiplierRule [特殊日期倍率]
4. LevelCoefficientRule   [等级系数]
5. RoundRule              [数值取整]
6. DailyCapRule           [每日上限]

**每个规则节点的默认参数配置：**

```json
TimeSlotMatchRule:
{
  "slots": [
    { "start": "07:00", "end": "10:00", "weight": 1.0 },
    { "start": "12:00", "end": "14:00", "weight": 1.0 },
    { "start": "18:00", "end": "22:00", "weight": 1.2 }
  ]
}

RandomBaseRule:
{
  "minPoints": 80,
  "maxPoints": 120
}

SpecialDateMultiplierRule:
{
  "defaultMultiplier": 1.0,
  "specialDates": [
    { "date": "2026-01-01", "multiplier": 2.0, "name": "元旦" },
    { "date": "2026-02-12", "multiplier": 2.0, "name": "春节" }
  ]
}

LevelCoefficientRule:
{
  "Lv.1": 1.0,
  "Lv.2": 1.1,
  "Lv.3": 1.2,
  "Lv.4": 1.3,
  "Lv.5": 1.5
}

RoundRule:
{
  "strategy": "round"
}

DailyCapRule:
{
  "maxDailyPoints": 500
}
```

#### 步骤 4：选择功能点

```
勾选的功能点：
✓ time_slot（时段规则）- [必需]
  配置项：允许设置多个打卡时段

✓ special_date（特殊日期）- [可选]
  配置项：节假日日期和倍率设置

✓ consecutive_reward（连续打卡奖励）- [可选]
  配置项：连续 7 天奖励 500 积分

✓ daily_cap（每日上限）- [必需]
  配置项：每日最高积分限制
```

### 3.3 平台配置中的默认值设置

在 `PlatformConfigPage` 中设置这些默认值：

#### 积分规则标签页

```
每层楼积分：10 分
每步积分：0.01 分（走路产品用）
每日积分上限：500 分
```

#### 规则模板标签页

```
创建模板：标准爬楼规则模板
时段配置：
- 上午：07:00-10:00，基础积分 100
- 中午：12:00-14:00，基础积分 100
- 晚上：18:00-22:00，基础积分 120
```

#### 功能开关标签页

```
✓ 启用打卡功能
✓ 启用积分商城
✓ 启用连续打卡奖励
✓ 启用特殊日期倍率
✓ 启用排行榜
```

### 3.4 套餐配置示例

在套餐管理中创建"标准版套餐"：

```
套餐名称：标准版
包含产品：
✓ 标准爬楼打卡（stairs_standard）
  功能点配置：
  ✓ time_slot（启用，必需）
  ✓ special_date（启用，可选）
  ✓ consecutive_reward（启用，可选）
  ✓ daily_cap（启用，必需）

✓ 走路积分（walking_basic）
  功能点配置：
  ✓ daily_cap（启用，必需）
```

### 3.5 数据流转示例：用户打卡一次的完整流程

```
1. 用户在 H5 点击"立即打卡"
   ↓
2. CheckInTrigger 执行
   - 检查用户是否在打卡时段内
   - 产生 TriggerContext（userId, tenantId, checkinTime, floors）
   ↓
3. 规则链依次执行：
   TimeSlotMatchRule → 检查时段 ✓
   RandomBaseRule → 生成 95 基础积分
   SpecialDateMultiplierRule → 今天是普通日，倍率 1.0 → 95 分
   LevelCoefficientRule → 用户 Lv.2，系数 1.1 → 104.5 分
   RoundRule → 四舍五入 → 105 分
   DailyCapRule → 未超 500 上限 → 105 分
   ↓
4. 功能点检查：
   ✓ time_slot：已启用 ✓
   ✓ special_date：已启用但今天不是特殊日期
   ✓ consecutive_reward：已启用，检查连续打卡天数
     - 如果连续 7 天：额外 +500 分
   ↓
5. PointsEventBus 发出积分事件
   ↓
6. 积分账户增加 105 分
   ↓
7. 等级系统检查是否升级
   ↓
8. 通知系统发送"积分到账"通知
   ↓
9. 积分流水记录写入
```

### 3.6 企业端菜单显示

企业管理员登录后，根据套餐动态显示菜单：

```
├── 工作台
├── 爬楼积分管理
│   ├── 打卡记录
│   ├── 时段配置（来自 time_slot 功能点）
│   ├── 特殊日期配置（来自 special_date 功能点）
│   └── 连续打卡奖励（来自 consecutive_reward 功能点）
├── 走路积分管理
│   └── 步数记录
├── 积分商城
├── 用户管理
├── 数据报表
└── 系统设置
```

---

## 四、平台管理员配置产品的完整操作流程

### 4.1 前置条件

- 平台管理员已登录
- 积木组件库中已有必要的组件（CheckInTrigger、各种规则节点、功能点）

### 4.2 操作步骤详解

#### 第一步：进入产品管理页面

1. 平台管理员登录后，点击左侧菜单 **"产品管理"**
2. 进入产品列表页面，页面显示：
   - 顶部："刷新"、"配置产品"（向导式）、"快速创建"按钮
   - 筛选：产品分类下拉框
   - 列表：现有产品列表

#### 第二步：启动产品配置向导

1. 点击右上角 **"配置产品"** 按钮
2. 弹出"配置产品"向导弹窗
3. 顶部显示 4 个步骤的进度条：
   ```
   [基本信息] → [选择触发器] → [组装规则链] → [选择功能点]
   ```

#### 第三步：填写基本信息（向导第 1 步）

**平台管理员操作：**
1. 输入产品编码：`stairs_standard`
2. 输入产品名称：`标准爬楼打卡`
3. 选择产品分类：`爬楼积分`
4. 输入描述（可选）
5. 点击 **"下一步"**

**验证逻辑：**
- 产品编码唯一性检查
- 必填字段检查

#### 第四步：选择触发器（向导第 2 步）

**平台管理员操作：**
1. 点击选择 **"打卡触发器 (CheckInTrigger)"**
2. 选中后卡片边框变蓝，显示 ✅ 图标
3. 点击 **"下一步"**

**系统自动预加载：**
- 选中触发器后，系统自动预加载该触发器对应的默认规则链和功能点

#### 第五步：组装规则链（向导第 3 步）

**平台管理员操作：**

1. **调整规则链顺序（如需要）：**
   - 点击节点的 [↑] 或 [↓] 按钮调整顺序
   - 也可以拖拽 ⋮⋮ 图标来排序

2. **添加/移除规则节点（如需要）：**
   - 在右侧"可用规则节点"中点击"添加"
   - 在左侧"当前规则链"中点击"移除"

3. **配置规则节点参数：**
   - 点击某个规则节点展开配置面板
   - 配置时段、随机基数、特殊日期、等级系数等

4. **点击 "下一步"**

**验证逻辑：**
- 规则链至少包含 3 个节点
- 必需节点检查（如 TimeSlotMatchRule 必须在 RandomBaseRule 之前）

#### 第六步：选择功能点（向导第 4 步）

**平台管理员操作：**
1. 勾选需要的功能点（必需的功能点默认勾选且不可取消）
2. 点击 **"确认创建"**

**系统保存操作：**
```
保存到数据库：
1. products 表：插入产品基本信息
2. product_rule_chain 表：插入规则链顺序和参数
3. product_features 表：插入功能点配置
```

#### 第七步：产品创建完成

**显示成功提示：**
```
✅ 产品创建成功！
您可以：
- [查看产品详情]
- [去套餐管理，将产品加入套餐]
- [继续创建新产品]
```

### 4.3 后续操作：平台配置默认值（可选）

产品创建后，平台管理员可以在 **"平台配置"** 页面设置全局默认值：

1. 进入 **"平台配置"** 页面
2. 点击 **"积分规则"** 标签页：
   - 设置每层楼积分：10
   - 设置每日积分上限：500
3. 点击 **"规则模板"** 标签页：
   - 创建"标准爬楼规则模板"
   - 配置默认时段
4. 点击 **"功能开关"** 标签页：
   - 启用"连续打卡奖励"
   - 启用"特殊日期倍率"

### 4.4 后续操作：将产品加入套餐

产品创建后，需要将其加入套餐才能被企业使用：

1. 进入 **"套餐管理"** 页面
2. 创建或编辑一个套餐（如"标准版"）
3. 在"产品配置"步骤中：
   - 勾选"标准爬楼打卡"产品
   - 配置该产品的功能点（启用哪些、禁用哪些）
4. 保存套餐

---

## 五、数据模型设计

### 5.1 新增/修改的数据表

#### products（产品定义表）- 已存在，扩展

```sql
CREATE TABLE products (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) UNIQUE NOT NULL COMMENT '产品编码',
  name VARCHAR(128) NOT NULL COMMENT '产品名称',
  category VARCHAR(64) NOT NULL COMMENT '产品分类',
  description TEXT COMMENT '描述',
  trigger_type VARCHAR(64) NOT NULL COMMENT '触发器类型',
  status TINYINT DEFAULT 1 COMMENT '状态：1-启用，0-禁用',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### product_rule_chain（产品规则链表）- 新建

```sql
CREATE TABLE product_rule_chain (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL COMMENT '产品ID',
  rule_node_name VARCHAR(64) NOT NULL COMMENT '规则节点名称',
  sort_order INT NOT NULL COMMENT '执行顺序',
  config_json TEXT COMMENT '节点参数配置（JSON）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_product_node (product_id, rule_node_name),
  INDEX idx_product_order (product_id, sort_order)
);
```

#### product_features（产品功能点表）- 已存在，确认

```sql
CREATE TABLE product_features (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL COMMENT '产品ID',
  feature_type VARCHAR(64) NOT NULL COMMENT '功能点类型',
  name VARCHAR(128) NOT NULL COMMENT '功能点名称',
  is_required TINYINT DEFAULT 0 COMMENT '是否必需：1-必需，0-可选',
  config_schema TEXT COMMENT '配置 Schema（JSON Schema）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_product_feature (product_id, feature_type)
);
```

#### package_products（套餐-产品关联表）- 已存在

```sql
CREATE TABLE package_products (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  package_id BIGINT NOT NULL COMMENT '套餐ID',
  product_id BIGINT NOT NULL COMMENT '产品ID',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_package_product (package_id, product_id)
);
```

#### product_configs（企业级产品配置表）- 已存在

```sql
CREATE TABLE product_configs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL COMMENT '租户ID',
  product_id BIGINT NOT NULL COMMENT '产品ID',
  enabled TINYINT DEFAULT 1 COMMENT '是否启用',
  config_json TEXT COMMENT '产品专属配置（JSON）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tenant_product (tenant_id, product_id)
);
```

### 5.2 数据流转完整流程

```
1. 平台管理员创建产品
   ↓
   products 表插入记录
   product_rule_chain 表插入规则链
   product_features 表插入功能点

2. 平台管理员配置套餐
   ↓
   package_products 表插入套餐-产品关联

3. 企业开通套餐
   ↓
   product_configs 表自动创建企业级配置
   （使用平台配置的默认值）

4. 企业管理员配置产品
   ↓
   更新 product_configs 表的 config_json

5. 用户使用产品
   ↓
   触发 CheckInTrigger
   执行规则链
   检查功能点
   发放积分
```

---

## 六、实现范围

### 6.1 后端实现

1. **ProductModule 接口完善**
   - 确保所有产品模块实现 ProductModule 接口
   - 提供 getCode()、getName()、getTriggerType()、getRuleChain()、getFeatures() 方法

2. **ProductRegistry 扩展**
   - 自动扫描所有 ProductModule Bean
   - 提供查询已注册产品、触发器、规则节点、功能点的 API

3. **产品管理 API（CRUD）**
   - GET /platform/products - 产品列表
   - POST /platform/products - 创建产品
   - PUT /platform/products/{id} - 更新产品
   - DELETE /platform/products/{id} - 删除产品
   - GET /platform/products/{id} - 产品详情

4. **积木组件库查询 API**
   - GET /platform/registry/triggers - 触发器列表
   - GET /platform/registry/rule-nodes - 规则节点列表
   - GET /platform/registry/features - 功能点列表
   - GET /platform/registry/modules - 已注册产品模块

5. **规则链执行器完善**
   - 从数据库读取产品规则链配置
   - 按顺序执行规则节点
   - 支持节点参数配置

6. **动态菜单 API**
   - GET /api/menus - 根据企业套餐返回动态菜单

### 6.2 前端实现

1. **产品管理向导完善（4 步）**
   - 基本信息表单
   - 触发器选择
   - 规则链可视化编辑器
   - 功能点选择

2. **规则链可视化编辑器**
   - 左右分栏布局（当前规则链 / 可用规则节点）
   - 拖拽排序
   - 节点参数配置弹窗

3. **功能点配置组件**
   - 功能点列表展示
   - 启用/禁用勾选
   - 必需/可选标记
   - 配置值输入

4. **平台配置页面扩展**
   - 积木组件库管理标签页
   - 规则模板管理
   - 功能开关配置

5. **套餐管理页面扩展**
   - 产品选择
   - 功能点配置

### 6.3 集成方案

1. **产品创建 → 套餐配置 → 企业菜单显示 完整链路**
2. **积木组件库与平台配置的协同**

---

## 七、团队分工（8 人团队）

### 团队配置

| 角色 | 人数 | 负责模块 |
|------|------|----------|
| 后端架构师 | 1 | 整体架构设计、核心接口定义 |
| 后端开发 | 3 | 产品管理 API、积木组件库、规则链执行器 |
| 前端架构师 | 1 | 前端架构设计、核心组件设计 |
| 前端开发 | 2 | 产品管理页面、平台配置扩展、套餐管理扩展 |
| 全栈开发 | 1 | 动态菜单 API、前后端联调 |

### 开发任务分解

详见后续实现计划文档。

---

## 八、风险与应对

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|----------|
| 积木组件抽象度不足 | 高 | 中 | 先实现爬楼和走路两个产品，验证抽象合理性 |
| 规则链执行顺序问题 | 高 | 低 | 严格固定规则链顺序，提供默认模板 |
| 动态菜单复杂度高 | 中 | 中 | 菜单配置由后端 API 返回，前端仅做渲染 |
| 产品创建限制 | 低 | 高 | MVP 阶段明确限制：缺少积木时提示联系开发 |

---

**文档版本：** v1.0
**创建日期：** 2026-04-21
**最后更新：** 2026-04-21

# 产品配置文档对照审计报告

**日期**: 2026-04-21
**范围**: 对照"爬楼送积分产品完整配置示例"文档，全面检查现有工程实现漏洞
**状态**: 待修复

---

## 一、架构层面的重大问题

### 🔴 漏洞 1：两套规则链系统严重割裂（阻断级）

**现状**：代码库中存在**两套完全独立的积分计算系统**，互不连通：

| 系统 | 位置 | 实际使用 |
|------|------|---------|
| **SPI 平台层** | `carbon-platform/rule/` | ❌ 未被业务调用 |
| **硬编码引擎** | `carbon-points/PointEngineService` | ✅ 实际在用 |

- `RuleChainExecutor` + 6 个 `RuleNode` 实现（`TimeSlotMatchRule`、`RandomBaseRule` 等）设计精良，是 SPI 架构
- 但 `CheckInService` 直接调用 `PointEngineService.calculate()`，**完全不经过 RuleChainExecutor**
- `PointEngineService` 把「随机基数→特殊日期倍率→等级系数→取整→每日上限」全部硬编码在一个方法里
- `StairClimbingProduct` 声明了规则链 `["time_slot_match", "random_base", ...]`，但**没有任何代码读取这个配置来执行**

**后果**：文档描述的"选择触发器→组装规则链→规则链依次执行"这个核心卖点**完全不生效**。平台管理员在向导里调整规则链顺序、配置节点参数，都只是前端 UI 表演，后端根本没用。

**建议**：统一到 SPI 架构，让 `CheckInService` 通过 `RuleChainExecutor` 执行规则链，而非直接调用 `PointEngineService`。

**涉及文件**：
- `saas-backend/carbon-platform/src/main/java/com/carbonpoint/platform/rule/RuleChainExecutor.java`
- `saas-backend/carbon-points/src/main/java/com/carbonpoint/points/service/PointEngineService.java`
- `saas-backend/carbon-stair/src/main/java/com/carbonpoint/stair/service/CheckInService.java`
- `saas-backend/carbon-stair/src/main/java/com/carbonpoint/stair/product/StairClimbingProduct.java`

---

### 🔴 漏洞 2：向导收集的规则链/功能点配置丢失（阻断级）

**现状**：前端产品配置向导 4 步流程（基本信息→触发器→规则链→功能点），但 `handleWizardFinish` 只保存了：

```typescript
createMutation.mutate({
  code: wizardData.code,
  name: wizardData.name,
  category: wizardData.category,
  description: wizardData.description,
  status: 1,
  sortOrder: 0,
});
// wizardData.ruleChain ❌ 丢失
// wizardData.ruleChainConfigs ❌ 丢失
// wizardData.features ❌ 丢失
```

**后果**：管理员精心配置的时段、随机基数范围、特殊日期倍率等参数**全部丢失**，产品创建成功后只是一个空壳。

**建议**：
1. 后端 `ProductEntity` 增加 `triggerType`、`ruleChainConfig`（JSON）字段
2. 创建产品 API 同时保存规则链配置和功能点映射
3. 后端执行积分计算时，从产品配置读取规则链并动态执行

**涉及文件**：
- `saas-frontend/platform-frontend/src/pages/ProductManagement.tsx`（第 334-351 行）
- `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/service/impl/ProductServiceImpl.java`
- `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/entity/ProductEntity.java`

---

### 🔴 漏洞 3：ProductEntity 缺少关键字段（阻断级）

**现状**：`ProductEntity` 只有基础字段：

```java
id, code, name, category, description, status, sortOrder
```

**缺失字段**（对照文档必须的）：
- `triggerType`：触发器类型（manual_checkin / sensor_data）
- `ruleChainConfig`：规则链配置（JSON，含顺序和各节点参数）
- `defaultConfig`：默认积分规则（每层楼积分、每日上限等）

**后果**：产品只是"名义上的"，没有可执行的规则配置。

**建议 DDL 补充**：

```sql
ALTER TABLE platform_products ADD COLUMN trigger_type VARCHAR(50);
ALTER TABLE platform_products ADD COLUMN rule_chain_config JSON;
ALTER TABLE platform_products ADD COLUMN default_config JSON;
```

**涉及文件**：
- `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/entity/ProductEntity.java`

---

## 二、业务流程问题

### 🟡 漏洞 4：Outbox 模式形同虚设

**现状**：`CheckInService.doCheckIn()` 中：

```java
// 写入 outbox event
outboxEventMapper.insert(outbox);
// 然后立即在同一事务里直接发放积分
pointAccountService.awardPoints(userId, totalAward, ...);
```

Outbox 模式的核心价值是**异步解耦**，但这里同步调用了 `awardPoints`，outbox event 写了却没人消费。

**建议**：二选一——
1. 真正异步：事务提交后由 Outbox Processor 消费并发放积分
2. 去掉 Outbox：既然要同步，就不需要 Outbox event

**涉及文件**：
- `saas-backend/carbon-stair/src/main/java/com/carbonpoint/stair/service/CheckInService.java`（第 150-187 行）

---

### 🟡 漏洞 5：PointsEventBus 是同步的，非事件驱动

**现状**：

```java
public void publish(PointsEvent event) {
    handler.handle(event); // 直接同步调用
}
```

文档描述"PointsEventBus 发出积分事件"暗示异步事件驱动，但实际是同步调用。而且 `CheckInService` 根本没用 `PointsEventBus`，而是直接调用 `pointAccountService.awardPoints()`。

**建议**：打卡流程改为通过 `PointsEventBus` 发事件，由 `PointsEventHandler` 异步处理积分发放、等级检查、通知等。

**涉及文件**：
- `saas-backend/carbon-points/src/main/java/com/carbonpoint/points/service/PointsEventBus.java`
- `saas-backend/carbon-points/src/main/java/com/carbonpoint/points/service/PointsEventHandler.java`

---

### 🟡 漏洞 6：连续打卡奖励逻辑有偏差

**现状**：`PointEngineService.checkAndAwardStreakReward()` 中：

```java
if (consecutiveDays >= requiredDays && consecutiveDays % requiredDays == 0)
```

文档描述"连续 7 天额外奖励 500 积分"，但当前逻辑：
- 连续 7 天 → ✅ 触发（7 % 7 == 0）
- 连续 14 天 → ✅ 触发（14 % 7 == 0） ← 是否期望重复触发？
- 连续 8 天 → ❌ 不触发 ← 正确

另外 `ConsecutiveRewardFeature` 默认里程碑是 `[3天/50, 7天/200, 30天/1000]`，与文档的"连续 7 天奖励 500"不一致。

**建议**：明确业务规则——里程碑是一次性奖励还是可重复触发？奖励金额需对齐。

**涉及文件**：
- `saas-backend/carbon-points/src/main/java/com/carbonpoint/points/service/PointEngineService.java`（第 124-150 行）
- `saas-backend/carbon-platform/src/main/java/com/carbonpoint/platform/feature/ConsecutiveRewardFeature.java`

---

### 🟡 漏洞 7：连续打卡天数统计只看用户表，不考虑跨时段

**现状**：`calculateConsecutiveDays()` 只比较 `user.lastCheckinDate`：

```java
if (lastCheckin.equals(today.minusDays(1))) return currentStreak + 1;
```

但用户可以在一天内打卡多次（不同时段），`lastCheckinDate` 可能是今天。虽然有 22:00 跨日规则，但跨时段的连续性计算不够精确。

**涉及文件**：
- `saas-backend/carbon-stair/src/main/java/com/carbonpoint/stair/service/CheckInService.java`（第 221-238 行）

---

## 三、前端问题

### 🟡 漏洞 8：企业端功能点阵（FeatureMatrix）是静态硬编码

**现状**：`enterprise-frontend/pages/FeatureMatrix.tsx` 中所有功能都是 hardcoded：

```typescript
const features: Feature[] = [
  { key: 'dashboard', enabled: true, ... },
  { key: 'members', enabled: true, ... },
  // 全部写死为 enabled: true
];
```

**对照文档**：企业端菜单应根据**套餐绑定的功能点**动态显示。`MenuServiceImpl` 后端已实现动态菜单，但 FeatureMatrix 前端完全没有对接 API。

**建议**：FeatureMatrix 应调用后端 API 获取当前企业套餐的功能点列表。

**涉及文件**：
- `saas-frontend/enterprise-frontend/src/pages/FeatureMatrix.tsx`

---

### 🟡 漏洞 9：企业端路由缺少动态化

**现状**：企业端 `pages/` 目录下的页面（Rules、Products、Points 等）是静态文件。菜单虽然动态生成了（`MenuServiceImpl`），但前端路由可能没有根据套餐功能点做守卫——用户可以直接输入 URL 访问未授权的功能。

**建议**：前端增加功能点权限守卫，未授权路由重定向到 403 页面。

**涉及文件**：
- `saas-frontend/enterprise-frontend/src/App.tsx`（路由配置）

---

### 🟢 漏洞 10：平台配置页面功能待确认

**现状**：`PlatformConfig.tsx` 存在，但文档描述的"积分规则标签页、规则模板标签页、功能开关标签页"是否完整实现需进一步确认。

**涉及文件**：
- `saas-frontend/platform-frontend/src/pages/PlatformConfig.tsx`

---

## 四、已正确实现的部分 ✅

| 功能 | 状态 | 说明 |
|------|------|------|
| 产品 CRUD | ✅ | 后端 ProductServiceImpl + 前端 ProductManagement |
| 套餐 CRUD | ✅ | 后端 PackageServiceImpl + 前端 PackageManagement |
| 套餐→产品→功能点三级关联 | ✅ | PackageProduct + PackageProductFeature |
| 动态菜单（后端） | ✅ | MenuServiceImpl 根据套餐动态生成菜单 |
| 产品配置向导（前端 UI） | ✅ | 4 步向导完整实现 |
| SPI 框架（RuleNode/Trigger/Feature） | ✅ | 接口定义完整，6 个规则+1 个触发器+多个 Feature |
| ProductRegistry 自动发现 | ✅ | StairClimbingProduct、WalkingProduct 自动注册 |
| 打卡防并发 | ✅ | Redis 分布式锁 + DB 唯一索引双保险 |
| 连续打卡天数计算 | ✅ | 含 22:00 跨日规则 |
| 积分账户操作 | ✅ | awardPoints / deductPoints |
| 打卡记录查询 | ✅ | 分页查询 + 时段状态 |
| H5 打卡页面 | ✅ | CheckInPage.tsx 存在 |

---

## 五、优先级排序与修复建议

| 优先级 | 漏洞 | 工作量 | 修复方向 |
|--------|------|--------|----------|
| **P0** | #1 规则链割裂 | 大 | 统一到 SPI 架构，CheckInService 通过 RuleChainExecutor 执行 |
| **P0** | #2 向导配置丢失 | 中 | handleWizardFinish 同时提交 ruleChain + features |
| **P0** | #3 ProductEntity 缺字段 | 小 | 加 trigger_type/rule_chain_config 字段 |
| **P1** | #4 Outbox 形同虚设 | 中 | 实现真正的异步 Outbox Processor |
| **P1** | #5 EventBus 同步 | 中 | 改为 Spring ApplicationEvent 异步 |
| **P1** | #8 FeatureMatrix 硬编码 | 中 | 对接后端 API 动态渲染 |
| **P2** | #6 连续奖励逻辑偏差 | 小 | 对齐业务规则和默认值 |
| **P2** | #7 连续天数跨时段 | 小 | 精确化跨时段连续性计算 |
| **P2** | #11 DDL 补充 | 小 | ALTER TABLE 加字段 |
| **P2** | #9 路由守卫 | 中 | 前端增加功能点权限守卫 |
| **P2** | #10 平台配置完整性 | 中 | 确认并补全标签页功能 |

---

## 六、总结

代码库在产品/套餐管理的 CRUD 和前端 UI 上完成度较高，但**核心的"配置驱动规则链执行"这个产品灵魂没有贯通**——SPI 框架搭好了，业务代码却绕过了它。最高优先级是让 `CheckInService` 真正通过 `RuleChainExecutor` 执行从产品配置中读取的规则链。

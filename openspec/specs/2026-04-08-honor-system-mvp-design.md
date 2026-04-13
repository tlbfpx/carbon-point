# 荣誉体系与团队竞技 MVP 设计文档

## 1. 设计背景

Carbon Point 平台定位为多租户 SaaS 碳积分打卡平台，以爬楼梯打卡送积分的机制激励员工运动。用户运营的核心激励方式确定为**荣誉激励为主**。

MVP 阶段目标：快速验证用户对荣誉激励体系的接受度，建立用户成长路径和社交归属感。

## 2. 设计范围

### 2.1 包含模块

- 用户等级体系
- 排行榜系统
- 成就徽章系统
- 部门/团队体系
- 团队排行榜

### 2.2 非 MVP 范围

- 团队挑战赛系统（第二阶段）
- 高级运营活动引擎
- 年度荣誉系统
- 跨企业竞技

## 3. 功能详细设计

### 3.1 用户等级体系

#### 等级定义

> **权威来源：** 等级定义以 `point-engine/spec.md` 的"用户等级体系"为准。以下为同步摘要。

| 等级 | 名称 | 升级条件（累计积分） | 积分倍率 |
|------|------|---------------------|----------|
| Lv.1 | 青铜 | 注册即有（0 - 999） | 1.0x |
| Lv.2 | 白银 | 累计积分 ≥ 1,000 | 1.2x |
| Lv.3 | 黄金 | 累计积分 ≥ 5,000 | 1.5x |
| Lv.4 | 铂金 | 累计积分 ≥ 20,000 | 2.0x |
| Lv.5 | 钻石 | 累计积分 ≥ 50,000 | 2.5x |

#### 规则说明

- **等级只升不降（严格模式，默认）**：用户等级只能升级，不会降级，避免挫败感。租户可切换为灵活模式允许降级
- **自动晋升**：用户累计积分（total_points）达到对应门槛时自动晋升，不可跨级
- **积分倍率应用时机**：在积分规则引擎计算完成后、写入账户前，乘以等级系数
- **等级权益展示**：用户个人主页展示当前等级和专属权益

#### 数据表设计

> **注意：** 等级字段直接存储在 `users` 表的 `level` 列中（INT, 1-5），无需独立等级表。等级由 `total_points` 自动计算得出。

-- 用户删除时级联删除等级记录
-- ALTER TABLE user_level ADD CONSTRAINT fk_user_level_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE;
```

---

### 3.2 排行榜系统

#### 排行榜类型

| 排行榜 | 范围 | 展示数量 | 更新频率 |
|--------|------|----------|----------|
| 今日打卡榜 | 企业内 | Top 20 | 每小时 |
| 本周打卡榜 | 企业内 | Top 20 | 每日 |
| 历史累计榜 | 企业内 | Top 50 | 每日 |
| 部门人均榜 | 企业内 | 全部部门 | 每日 |

#### 展示规则

- 前三名：展示用户头像 + 昵称 + 积分值
- 4-10名：展示昵称缩写（如"张**"）+ 积分值
- 11-20名：仅展示排名 + 积分值
- 当前用户：无论排名是否在 Top 20，均高亮显示其排名
- **平分规则：** 积分相同时，按打卡时间先后排序（先打卡排前）

#### 防刷机制

- 排行榜数据每小时重新计算
- 异常数据检测：单日积分超过企业配置阈值（默认500分）则不计入当日排行榜
- 剔除已停用的用户
- 同一用户在同一榜单中不重复展示（当前用户查看自己时，高亮显示当前排名但不重复展示在列表中）

#### API 设计

```
GET /api/v1/leaderboard/today
GET /api/v1/leaderboard/week
GET /api/v1/leaderboard/history
GET /api/v1/leaderboard/department
```

**通用请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认1 |
| pageSize | int | 否 | 每页数量，默认20 |

**响应格式（今日/本周/历史榜）：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "rank": 1,
        "userId": 123,
        "nickname": "张三",
        "avatar": "https://...",
        "points": 150,
        "isCurrentUser": false
      }
    ],
    "currentUserRank": 5,
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  }
}
```

**通用错误码：**

| code | 说明 |
|------|------|
| 0 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未登录或Token失效 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

**响应格式（部门榜）：**

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "rank": 1,
        "departmentId": 1,
        "departmentName": "技术部",
        "leaderName": "李四",
        "avgPoints": 1250,
        "memberCount": 20
      }
    ]
  }
}
```

**排行榜上下文 API：**

```
GET /api/v1/leaderboard/context
```

**响应格式：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "currentRank": 5,
    "changeFromLastWeek": -2,
    "percentile": 85.5
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| currentRank | int | 当前用户在今日榜中的排名 |
| changeFromLastWeek | int | 相比上周排名的变化，正数为上升，负数为下降，0为无变化，null为上周未上榜 |
| percentile | double | 超越的用户百分比，如 85.5 表示超越了 85.5% 的用户 |

**平分规则：** 积分相同时，按打卡时间先后排序（先打卡排前，`checkin_time ASC`）

---

### 3.3 成就徽章系统

#### 徽章分类

| 分类 | 说明 |
|------|------|
| 入门徽章 | 首次打卡等基础成就 |
| 连续打卡徽章 | 7天、30天、100天连续打卡 |
| 累计打卡徽章 | 50次、100次、500次累计打卡 |
| 特殊成就徽章 | 早起鸟儿、爬楼王者等 |

#### 徽章定义

| 徽章ID | 名称 | 获得条件 | 稀有度 |
|--------|------|----------|--------|
| first_checkin | 初出茅庐 | 完成首次打卡 | 普通 |
| checkin_7 | 七天连续 | 连续打卡7天 | 普通 |
| checkin_30 | 三十而励 | 连续打卡30天 | 稀有 |
| checkin_100 | 百炼成钢 | 连续打卡100天 | 史诗 |
| total_50 | 积少成多 | 累计打卡50次 | 普通 |
| total_100 | 持之以恒 | 累计打卡100次 | 稀有 |
| total_500 | 登峰造极 | 累计打卡500次 | 史诗 |
| early_bird | 早起鸟儿 | 7:00前打卡 | 普通 |
| weekend_warrior | 周末坚持者 | 连续周末打卡 | 稀有 |

#### 展示规则

- 用户个人主页展示已获得徽章（**按获得时间倒序，最新获得的在前面**，最多9个）
- 点击"查看全部"进入徽章详情页
- 徽章详情页展示：徽章图标、名称、获得时间、稀有度标识

#### 数据表设计

```sql
-- 徽章定义表
CREATE TABLE badge_definition (
    id INT PRIMARY KEY AUTO_INCREMENT,
    badge_id VARCHAR(50) NOT NULL UNIQUE COMMENT '徽章ID',
    name VARCHAR(50) NOT NULL COMMENT '徽章名称',
    description VARCHAR(200) COMMENT '徽章描述',
    icon VARCHAR(100) COMMENT '徽章图标URL',
    rarity VARCHAR(20) NOT NULL COMMENT '稀有度: common/rare/epic',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户徽章表
CREATE TABLE user_badge (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    badge_id VARCHAR(50) NOT NULL COMMENT '徽章ID',
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_badge_id (badge_id)
);

-- 用户删除时级联删除徽章记录
-- ALTER TABLE user_badge ADD CONSTRAINT fk_user_badge_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE;
```

---

### 3.4 部门/团队体系

#### 部门管理

- 超级管理员可在企业后台创建/编辑/删除部门
- 每个用户只能归属于一个部门
- 部门可设置负责人（负责查看本部门数据）

**部门负责人权限：**
- 可查看本部门所有成员的打卡记录、积分、排行榜数据
- 可查看本部门数据看板
- 不可编辑部门成员信息（需由管理员操作）
- 不可删除或转让部门

**部门删除规则：**
- 删除部门前，需先将部门内用户转移至其他部门
- 如部门内仅有一个用户，直接删除用户部门关联关系

#### 数据表设计

```sql
-- 部门表
CREATE TABLE department (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL COMMENT '租户ID',
    name VARCHAR(100) NOT NULL COMMENT '部门名称',
    leader_id BIGINT COMMENT '部门负责人用户ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tenant_id (tenant_id)
);

-- 用户部门关联表
CREATE TABLE user_department (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    department_id BIGINT NOT NULL COMMENT '部门ID',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_department_id (department_id)
);
```

---

### 3.5 团队排行榜

#### 排行榜类型

| 排行榜 | 说明 | 更新频率 |
|--------|------|----------|
| 部门人均积分 | 部门总积分/部门人数 | 每日 00:05 |
| 部门打卡率 | 今日打卡人数/部门总人数 | 每小时 |
| 部门连续打卡 | 部门最长连续打卡天数 | 每日 00:05 |

**部门删除时的处理：**
- 删除部门时，该部门不再参与排行榜计算
- 历史排行榜数据保留，展示时标注"已解散部门"

#### 展示规则

- 企业内所有部门参与排名
- 展示部门名称、负责人（如果有）、排名数据
- 支持企业管理员查看详细数据

---

## 4. 界面设计要点

### 4.1 用户端 H5

**个人主页**：
- 顶部：用户头像 + 昵称 + 当前等级 + 等级进度条
- 中部：已获得徽章展示（3x3网格）
- 底部：打卡入口 + 排行榜入口

**排行榜页面**：
- Tab 切换：今日/本周/历史
- 排名列表：头像+昵称+积分
- 当前位置高亮显示

**徽章中心**：
- 全部徽章列表（已获得 + 未获得）
- 已获得徽章带获得时间
- 未获得徽章显示获取条件

### 4.2 企业管理后台

**部门管理**：
- 部门列表：名称、负责人、成员数、创建时间
- 部门创建/编辑弹窗
- 用户分配部门

**团队排行榜查看**：
- 部门排名数据表格
- 支持按时间筛选

---

## 5. 技术实现要点

### 5.1 积分计算链路调整

现有积分计算链路：
1. 匹配时段规则 → 随机基础积分
2. 检查特殊日期 → 乘以倍率
3. **新增：检查用户状态，乘以用户等级系数**
4. 四舍五入取整
5. 检查每日积分上限 → 截断
6. 记录打卡 → 检查连续打卡 → 发放额外奖励

**说明：** 仅活跃状态用户可获得等级倍率，冻结/停用用户不享受等级加成。

### 5.2 徽章自动发放机制

- 打卡成功后，**同步**检查用户是否满足徽章获取条件
- 如满足，自动写入 user_badge 表
- 用户下次访问时刷新徽章数据

**徽章检查时机：** 采用同步方式，打卡接口返回时携带新获得的徽章信息，前端可即时展示获得徽章的动画效果。

**原子性设计（推荐方案1）：**

徽章发放检查与写入必须原子化，防止并发重复发放。采用数据库唯一键约束实现：

```sql
INSERT IGNORE INTO user_badge (user_id, badge_id, earned_at)
VALUES (?, ?, ?)
-- 以 (user_id, badge_id) 为唯一键，重复插入被静默忽略
```

> **数据表约束补充：**
> `user_badge` 表需增加复合唯一索引：
> ```sql
> ALTER TABLE user_badge ADD UNIQUE INDEX uk_user_badge (user_id, badge_id);
> ```
> 并发请求只会有一人成功写入（affected_rows=1），另一人返回"已拥有"（affected_rows=0）。
> 此方案不依赖应用层先查后写，无锁竞争开销。

**备选方案2（Redis 分布式锁）：**

```java
String lockKey = "lock:badge:" + userId + ":" + badgeId;
Boolean acquired = redis.setIfAbsent(lockKey, "1", 30, TimeUnit.SECONDS);
if (Boolean.TRUE.equals(acquired)) {
    try {
        // 检查是否已拥有
        BadgeRecord existing = badgeMapper.selectByUserAndBadge(userId, badgeId);
        if (existing == null) {
            badgeMapper.insert(userId, badgeId, earnedAt);
            // 发送 badge_earned 通知
        }
    } finally {
        redis.delete(lockKey);
    }
} else {
    // 返回"已拥有"
}
```

**保障机制：**
- 方案1优先采用：依赖数据库唯一键约束，应用层只需执行 `INSERT IGNORE`，无需查询判断
- 并发请求只会有一人成功写入，另一人 `affected_rows=0`，返回"已拥有"
- 方案2仅作为降级备选（如历史数据需兼容等特殊场景）

### 5.3 排行榜缓存策略

- 排行榜数据每小时计算一次，结果缓存 Redis
- 读取排行榜 API 直接从缓存返回
- 每日凌晨重新计算全部历史数据

**Redis Key 设计：**

| Key Pattern | 说明 | TTL |
|-------------|------|-----|
| leaderboard:tenant:{tenantId}:today | 今日榜 | 2小时 |
| leaderboard:tenant:{tenantId}:week | 本周榜 | 24小时 |
| leaderboard:tenant:{tenantId}:history | 历史榜 | 24小时 |
| leaderboard:tenant:{tenantId}:department | 部门榜 | 24小时 |

**并发处理：** 使用 Redis 分布式锁防止排行榜计算并发执行。

---

## 6. 实施计划

### Phase 1: 基础架构（1-2周）

- 部门管理功能开发
- 用户部门关联功能开发

### Phase 2: 等级与徽章（2-3周）

- 用户等级表设计开发
- 等级计算逻辑开发
- 徽章定义表开发
- 徽章自动发放逻辑开发

### Phase 3: 排行榜（1-2周）

- 排行榜 API 开发
- 排行榜缓存逻辑开发
- H5 排行榜页面开发

### Phase 4: 团队排行榜（1周）

- 部门排行榜逻辑开发
- 后台团队数据展示

---

## 7. 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 用户对等级无感知 | 首次登录强提示等级权益，打卡后推送等级升级通知 |
| 徽章获取条件过于简单 | 设置合理的徽章稀有度梯度 |
| 部门创建后用户未分配 | 企业开通时自动创建默认"全员"部门，管理员可拆分 |
| 排行榜更新延迟 | 小时级更新频率可接受，实时数据通过查询实时计算 |

---

## 9. 前端技术方案

### 9.1 技术栈选型

| 层级 | 技术选择 | 说明 |
|------|----------|------|
| 框架 | React 18+ | 主流选择，生态丰富 |
| UI 组件库 | Ant Design 5.x | 企业级后台标配，组件丰富 |
| 构建工具 | Vite | 开发体验好，热更新快 |
| 包管理 | pnpm | Monorepo 支持好，节省磁盘 |
| 状态管理 | React Query + Zustand | API 状态用 React Query，UI 状态用 Zustand |
| 路由 | React Router 6.x | 标准路由方案 |

### 9.2 项目结构（Monorepo）

```
carbon-point/
├── apps/
│   ├── h5/                 # 用户端 H5（后续开发）
│   └── dashboard/          # 管理后台（企业+平台合并）
│       └── src/
│           ├── pages/     # 页面
│           ├── components/# 业务组件
│           ├── hooks/     # 业务 hooks
│           ├── services/ # API 请求
│           ├── store/    # Zustand store
│           └── router/   # 路由配置
│
└── packages/
    ├── ui/                # 共享 UI 组件
    ├── api/               # 共享 API 定义
    ├── hooks/             # 共享 hooks
    └── utils/             # 共享工具函数
```

### 9.3 状态管理

- **API 状态** → React Query：自动缓存、背景更新、请求去重
- **UI 状态** → Zustand：轻量级，无需 Provider 嵌套

### 9.4 路由与权限

- **菜单级权限**：根据用户角色动态渲染菜单
- **按钮级权限**：自定义 `usePermission` hook
- **API 级权限**：后端拦截，前端配合 403 处理

### 9.5 企业/平台后台合并

- 统一登录页，根据账号类型跳转
- 菜单配置区分 `scope: 'enterprise' | 'platform'`
- 通过 JWT 中 scope 字段区分数据权限

---

## 10. 成功指标

- 用户等级覆盖率 > 80%（注册30天内达到Lv.2及以上）
- 徽章获得率 > 60%（至少获得1枚徽章）
- 部门归属率 > 70%（企业用户有部门归属）
- 日均排行榜访问量 > DAU 30%

**测量方法：**
- 用户等级覆盖率 = 30天内达到Lv.2及以上的用户数 / 同期注册用户总数
- 徽章获得率 = 获得至少1枚徽章的用户数 / 活跃用户总数
- 部门归属率 = 有部门归属的用户数 / 企业总用户数
- 排行榜访问量 = 排行榜API日调用UV / DAU

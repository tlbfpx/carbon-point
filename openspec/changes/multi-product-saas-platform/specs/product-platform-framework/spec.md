## ADDED Requirements

### Requirement: ProductModule 接口定义
系统 SHALL 定义 ProductModule 接口，作为所有产品模块的标准抽象。每个产品模块 MUST 实现此接口并注册为 Spring Bean。

#### Scenario: ProductModule 接口结构
- **WHEN** 开发者创建一个新的产品模块
- **THEN** 该模块 MUST 实现 ProductModule 接口，提供：产品编码（code）、产品名称（name）、触发器类型（triggerType）、规则链定义（ruleChain）、功能点列表（features）

#### Scenario: 产品模块自动注册
- **WHEN** Spring Boot 应用启动时
- **THEN** ProductRegistry 自动扫描所有 ProductModule Bean 并注册，平台管理后台可通过 ProductRegistry 查询所有已注册产品的元信息

### Requirement: 触发器抽象（Trigger）
系统 SHALL 定义 Trigger 接口，抽象用户触发积分的行为。触发器决定用户如何产生积分事件。

#### Scenario: Trigger 接口结构
- **WHEN** 开发者创建一个新的触发器类型
- **THEN** 该触发器 MUST 实现 Trigger 接口，提供：类型标识（getType）、执行方法（execute）

#### Scenario: CheckInTrigger 打卡触发器
- **WHEN** 用户在时段内点击打卡按钮
- **THEN** CheckInTrigger 执行，产出触发上下文（用户 ID、打卡时间、租户配置）

#### Scenario: SensorDataTrigger 传感器数据触发器
- **WHEN** 用户每日领取一次步数积分
- **THEN** SensorDataTrigger 执行，拉取当日步数，产出触发上下文（用户 ID、步数、日期）

### Requirement: 规则节点抽象（RuleNode）
系统 SHALL 定义 RuleNode 接口，抽象积分计算的链式处理节点。规则链是有序节点列表，每个节点独立可测试。

#### Scenario: RuleNode 接口结构
- **WHEN** 开发者创建一个新的规则节点
- **THEN** 该节点 MUST 实现 RuleNode 接口，提供：类型标识（getType）、处理方法（process），输入积分值，输出处理后的积分值

#### Scenario: 规则链有序执行
- **WHEN** 产品模块定义规则链为 [TimeSlotMatch, RandomBase, SpecialDateMultiplier, LevelCoefficient, Round, DailyCap]
- **THEN** 积分计算按此顺序依次执行每个节点，前一个节点的输出作为下一个节点的输入

#### Scenario: 规则链中节点独立跳过
- **WHEN** 规则链中的某个节点不适用（如无特殊日期配置）
- **THEN** 该节点透传积分值，不做修改，后续节点继续执行

### Requirement: 功能点抽象（Feature）
系统 SHALL 定义 Feature 接口，抽象独立于积分计算的业务功能。功能点是可选的附加能力。

#### Scenario: Feature 接口结构
- **WHEN** 开发者创建一个新的功能点
- **THEN** 该功能点 MUST 实现 Feature 接口，提供：类型标识（getType）、默认配置（getDefaultConfig）

#### Scenario: 功能点与规则节点一对一关系
- **WHEN** 功能点"节假日翻倍"对应规则链中的"倍率"节点
- **THEN** 该功能点提供 UI 配置入口，修改配置后影响规则链节点的参数

#### Scenario: 功能点独立于规则链
- **WHEN** 功能点"连续打卡奖励"不在规则链中
- **THEN** 该功能点在积分计算完成后独立执行，额外发放奖励积分

### Requirement: PointsEventBus 统一积分事件总线
系统 SHALL 提供 PointsEventBus，接收所有产品模块产出的统一格式积分事件，分发给积分账户、等级系统、通知系统和积分流水记录。

#### Scenario: 积分事件格式
- **WHEN** 任何产品模块产生积分变动
- **THEN** MUST 发出标准 PointsEvent，包含：tenantId, userId, productCode, sourceType, points（正数=获得，负数=消耗）, bizId, remark

#### Scenario: 积分事件分发
- **WHEN** PointsEventBus 收到一个 PointsEvent
- **THEN** 系统依次处理：积分账户加/扣/冻结 → 等级系统检查晋升/降级 → 通知系统发送积分到账/等级变更通知 → 积分流水记录写入

#### Scenario: 多产品积分事件互不干扰
- **WHEN** 爬楼产品和走路产品同时产出积分事件
- **THEN** 两个事件独立处理，共享层不关心积分来自哪个产品，只处理 PointsEvent

### Requirement: 产品注册表查询
平台管理后台 SHALL 能查询所有已注册产品模块的元信息，包括产品编码、名称、触发器类型、规则链结构、功能点列表。

#### Scenario: 查询已注册产品列表
- **WHEN** 平台管理员进入产品管理页面
- **THEN** 系统通过 ProductRegistry 返回所有已注册产品的元信息列表

#### Scenario: 查看产品详情
- **WHEN** 平台管理员点击某个产品
- **THEN** 系统展示该产品的触发器类型、规则链节点列表（含顺序）、功能点列表（含必选/可选标记）

### Requirement: 产品配置运行上下文
系统 SHALL 为每个产品模块运行时提供 ProductContext，包含租户配置、用户信息、产品级参数。

#### Scenario: ProductContext 构建时机
- **WHEN** 触发器执行时
- **THEN** 系统构建 ProductContext，注入当前租户对该产品的配置（从 product_configs 表加载）、用户信息、触发参数

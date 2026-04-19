## ADDED Requirements

### Requirement: 走路积分产品定义
系统 SHALL 提供走路积分产品（code: walking），用户通过手机健康 API 采集的每日步数领取积分。走路积分产品实现 ProductModule 接口。

#### Scenario: 走路积分产品结构
- **WHEN** 系统注册走路积分产品
- **THEN** 产品编码为 "walking"，触发器类型为 SensorDataTrigger，规则链为 [ThresholdFilter → FormulaCalc]，功能点包含 StepCalcConfig（必选）、FunEquivalence（可选）、PointsExchange（必选）

### Requirement: 步数数据采集
系统 SHALL 通过手机健康 API 采集用户每日步数数据，支持微信小程序 WeRun、iOS HealthKit、Android Health Connect 三种数据源。

#### Scenario: 微信小程序 WeRun 数据获取
- **WHEN** 用户在微信小程序中打开走路积分页面
- **THEN** 系统通过微信 WeRun API 获取用户当日步数

#### Scenario: iOS HealthKit 数据获取
- **WHEN** 用户在 iOS APP 中打开走路积分页面
- **THEN** 系统通过 HealthKit API 获取用户当日步数

#### Scenario: Android Health Connect 数据获取
- **WHEN** 用户在 Android APP 中打开走路积分页面
- **THEN** 系统通过 Health Connect API 获取用户当日步数

#### Scenario: 无健康数据权限
- **WHEN** 用户未授权健康数据访问权限
- **THEN** 系统提示"请先授权健康数据访问权限"，不展示步数信息

#### Scenario: 步数数据延迟或缺失
- **WHEN** 健康数据接口返回空值或超时
- **THEN** 系统提示"暂无步数数据，请稍后再试"，不产生积分事件

### Requirement: 步数阈值过滤规则节点
ThresholdFilter 规则节点 SHALL 过滤低于阈值的步数，低于阈值的步数不产生积分。

#### Scenario: 步数达到阈值
- **WHEN** 用户当日步数为 8232 步，阈值配置为 3000 步
- **THEN** ThresholdFilter 透传 8232 步到下一个规则节点

#### Scenario: 步数未达阈值
- **WHEN** 用户当日步数为 1500 步，阈值配置为 3000 步
- **THEN** ThresholdFilter 返回 0 积分，不产生积分事件，提示"今日步数不足 3000 步，继续加油"

### Requirement: 步数公式换算规则节点
FormulaCalc 规则节点 SHALL 按公式将步数换算为积分：`积分 = floor(步数 × 系数)`，系数由企业级产品配置决定。

#### Scenario: 步数换算积分
- **WHEN** 用户当日步数为 8232 步，系数配置为 0.01
- **THEN** FormulaCalc 计算积分 = floor(8232 × 0.01) = 82 积分

#### Scenario: 不同企业不同系数
- **WHEN** 企业 A 配置系数为 0.01，企业 B 配置系数为 0.02
- **THEN** 同样 8000 步，企业 A 用户获得 80 积分，企业 B 用户获得 160 积分

### Requirement: 每日领取制
走路积分 SHALL 采用每日领取制，用户每天可领取一次步数积分。领取后当日不可重复领取。

#### Scenario: 每日首次领取
- **WHEN** 用户今日未领取过步数积分，点击"领取积分"按钮
- **THEN** 系统获取当日步数，经过规则链计算后发放积分，记录领取状态

#### Scenario: 重复领取拒绝
- **WHEN** 用户今日已领取过步数积分，再次点击"领取积分"
- **THEN** 系统提示"今日已领取过步数积分"，不重复发放

#### Scenario: 领取并发保护
- **WHEN** 用户同时发起两次领取请求
- **THEN** 数据库唯一索引（user_id + date）确保只有一次成功，另一次返回"今日已领取"

### Requirement: 步数每日记录存储
系统 SHALL 存储用户每日步数记录，用于报表统计和防重复领取。

#### Scenario: 步数记录写入
- **WHEN** 用户领取步数积分
- **THEN** 系统在 step_daily_records 表写入记录：tenant_id, user_id, date, steps, points_awarded, source（werun/healthkit/health_connect）

### Requirement: 趣味等价物展示功能点
FunEquivalence 功能点 SHALL 将步数换算为趣味等价物展示给用户，等价物模板由企业配置。

#### Scenario: 趣味等价物展示
- **WHEN** 用户查看走路积分页面，当日步数 8232 步
- **THEN** 系统按企业配置的等价物模板展示，如"相当于绕操场 41 圈"、"相当于消耗 329 大卡"

#### Scenario: 企业自定义等价物模板
- **WHEN** 企业管理员配置等价物模板为"相当于 {steps/200} 根香蕉"
- **THEN** 用户看到"相当于 41 根香蕉"

#### Scenario: 功能点未启用
- **WHEN** 企业套餐未启用 FunEquivalence 功能点
- **THEN** 走路积分页面不展示趣味等价物区域

### Requirement: H5 走路积分页面
H5 端 SHALL 提供走路积分页面，展示当日步数、可领取积分、领取按钮、趣味等价物。

#### Scenario: 查看走路积分页面
- **WHEN** 用户在 H5 端进入走路积分页面
- **THEN** 系统展示当日步数、换算后的积分值、领取按钮状态（未领取/已领取）、趣味等价物（如已启用）

#### Scenario: 兼容微信小程序 WebView
- **WHEN** 用户通过微信小程序 WebView 访问走路积分页面
- **THEN** 页面正常展示，步数数据通过微信 WeRun JSSDK 获取

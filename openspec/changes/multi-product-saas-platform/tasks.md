## 1. 产品框架层（carbon-platform 模块）

- [x] 1.1 创建 carbon-platform Maven 模块，配置 pom.xml 依赖 carbon-common
- [x] 1.2 定义 ProductModule 接口（code, name, triggerType, ruleChain, features）
- [x] 1.3 定义 Trigger 接口（getType, execute），实现 TriggerContext
- [x] 1.4 定义 RuleNode 接口（getType, process），实现 RuleContext
- [x] 1.5 定义 Feature 接口（getType, getDefaultConfig）
- [x] 1.6 实现 ProductRegistry（Spring Bean 自动扫描注册）
- [x] 1.7 实现 ProductContext（租户配置 + 用户信息 + 产品参数）
- [x] 1.8 实现 PointsEventBus（积分事件分发：账户 → 等级 → 通知 → 流水）

## 2. 积木组件库（触发器）

- [x] 2.1 实现 CheckInTrigger（打卡触发器，产出打卡时间上下文）
- [x] 2.2 实现 SensorDataTrigger（传感器数据触发器，拉取步数上下文）

## 3. 积木组件库（规则节点）

- [x] 3.1 实现 TimeSlotMatch（时段匹配节点）
- [x] 3.2 实现 RandomBase（随机基数节点）
- [x] 3.3 实现 SpecialDateMultiplier（特殊日期倍率节点）
- [x] 3.4 实现 LevelCoefficient（等级系数节点）
- [x] 3.5 实现 Round（四舍五入节点）
- [x] 3.6 实现 DailyCap（每日上限节点）
- [x] 3.7 实现 ThresholdFilter（步数阈值过滤节点）
- [x] 3.8 实现 FormulaCalc（步数公式换算节点）

## 4. 积木组件库（功能点）

- [x] 4.1 实现 ConsecutiveReward（连续打卡奖励功能点）
- [x] 4.2 实现 SpecialDate（特殊日期功能点）
- [x] 4.3 实现 FunEquivalence（趣味等价物功能点）
- [x] 4.4 实现 PointsExchange（积分兑换功能点，跨产品共享标记）

## 5. 爬楼积分产品模块（carbon-stair）

- [x] 5.1 创建 carbon-stair Maven 模块，依赖 carbon-platform + carbon-points
- [x] 5.2 实现 StairClimbingProduct（ProductModule 接口）
- [x] 5.3 从 carbon-checkin 迁移打卡控制器到 carbon-stair，保持 API 路径不变
- [x] 5.4 从 carbon-checkin 迁移打卡服务逻辑，使用积木组件库重写规则链
- [x] 5.5 积分计算完成后通过 PointsEventBus 发出标准积分事件
- [x] 5.6 功能点（时段规则、节假日翻倍、连续打卡奖励）迁移为 Feature 实现
- [x] 5.7 废弃 carbon-checkin 模块（从 carbon-app 依赖中移除）

## 6. 走路积分产品模块（carbon-walking）

- [x] 6.1 创建 carbon-walking Maven 模块，依赖 carbon-platform + carbon-points
- [x] 6.2 实现 WalkingProduct（ProductModule 接口）
- [x] 6.3 实现步数数据采集客户端（微信 WeRun / iOS HealthKit / Android Health Connect）
- [x] 6.4 实现步数每日领取服务（ThresholdFilter → FormulaCalc 规则链）
- [x] 6.5 实现每日领取并发保护（唯一索引 user_id + date）
- [x] 6.6 实现趣味等价物展示（FunEquivalence 功能点）
- [x] 6.7 走路积分 H5 页面（步数展示、领取按钮、等价物展示）

## 7. 数据库变更

- [x] 7.1 创建 products 表（id, code, name, trigger_type, icon, description, status）
- [x] 7.2 创建 product_features 表（id, product_id, code, name, feature_type, config_schema, is_required）
- [x] 7.3 创建 package_products 表（id, package_id, product_id, sort_order）
- [x] 7.4 创建 product_configs 表（id, tenant_id, product_id, enabled, config_json）
- [x] 7.5 创建 product_feature_configs 表（id, tenant_id, product_id, feature_id, enabled）
- [x] 7.6 创建 step_daily_records 表（id, tenant_id, user_id, date, steps, points_awarded, source，唯一索引 user_id + date）
- [x] 7.7 points_ledger 表增加 product_code 和 source_type 字段
- [x] 7.8 初始化 products 数据：stair_climbing、walking
- [x] 7.9 初始化 product_features 数据（爬楼产品功能点、走路产品功能点）
- [x] 7.10 迁移现有套餐数据到 package_products 关联

## 8. 积分账户增强（carbon-points）

- [x] 8.1 PointsEventBus 接入积分账户更新逻辑
- [x] 8.2 积分流水写入增加 product_code 和 source_type
- [x] 8.3 积分事件幂等性保证（bizId 去重）
- [x] 8.4 积分流水查询 API 支持按 product_code 和 source_type 筛选

## 9. 权限体系增强（carbon-system）

- [x] 9.1 权限树新增产品模块权限（enterprise:stair-climbing:*、enterprise:walking:*）
- [x] 9.2 超管角色权限来源改为套餐产品功能点权限合集
- [x] 9.3 动态菜单生成逻辑（根据套餐产品 + 功能点开关生成菜单树）
- [x] 9.4 企业菜单 API（GET /api/enterprise/menus，返回动态裁剪后的菜单树）
- [x] 9.5 套餐变更时权限和菜单自动更新

## 10. 平台管理后台（platform-frontend）

- [x] 10.1 产品管理页面（产品列表、产品详情、新建产品向导）
- [x] 10.2 新建产品向导 — 选择触发器、组装规则链（拖拽排序）、选择功能点
- [x] 10.3 积木组件库管理页面（触发器列表、规则节点列表、功能点模板列表）
- [x] 10.4 套餐管理增强 — 套餐-产品选择、产品功能点勾选
- [x] 10.5 企业详情页增加产品维度（各产品启用状态、企业级配置）
- [x] 10.6 平台级权限新增（platform:product:*、platform:block:*）

## 11. 企业管理后台（enterprise-frontend）

- [x] 11.1 动态菜单渲染（根据菜单 API 返回的菜单树渲染）
- [x] 11.2 走路积分管理页面（步数换算配置、趣味等价物配置）
- [x] 11.3 规则配置页面按产品分组展示
- [x] 11.4 数据看板增加多产品维度（各产品积分占比饼图、堆叠趋势图）

## 12. H5 用户端

- [x] 12.1 走路积分页面（步数展示、可领取积分、领取按钮、趣味等价物）
- [x] 12.2 微信 WeRun JSSDK 集成（步数数据获取）
- [x] 12.3 多产品首页入口（根据企业套餐展示可用的产品入口）

## 13. 数据报表增强（carbon-report）

- [x] 13.1 跨产品总览看板 API（各产品积分占比、多产品参与率）
- [x] 13.2 积分趋势报表按产品维度拆分（堆叠面积图数据）
- [x] 13.3 走路积分专用报表 API（日均步数趋势、步数区间分布、领取率）
- [x] 13.4 企业看板 API 增加多产品维度数据

## 14. 测试

- [x] 14.1 ProductModule + ProductRegistry 单元测试
- [x] 14.2 各积木组件（Trigger / RuleNode / Feature）单元测试
- [x] 14.3 PointsEventBus 集成测试
- [x] 14.4 走路积分领取流程端到端测试
- [x] 14.5 动态菜单生成测试（不同套餐配置 → 不同菜单树）
- [x] 14.6 套餐变更时权限和菜单更新测试
- [x] 14.7 爬楼产品迁移回归测试（确保打卡流程不变）

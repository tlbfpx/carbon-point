## ADDED Requirements

### Requirement: 产品定义表
系统 SHALL 维护平台级产品定义表（products），记录所有可用的产品模块。此表无 tenant_id，为平台级数据。

#### Scenario: 产品定义表结构
- **WHEN** 系统存储产品定义
- **THEN** products 表包含：id, code（唯一，如 "stair_climbing"）, name, trigger_type, icon, description, status（enabled/disabled）

#### Scenario: 产品与注册表关联
- **WHEN** 平台管理员查看产品列表
- **THEN** 系统展示 products 表记录和 ProductRegistry 中的运行时元信息（规则链、功能点），两者通过 code 关联

### Requirement: 产品功能点表
系统 SHALL 维护产品功能点表（product_features），记录每个产品下的功能点定义。

#### Scenario: 功能点表结构
- **WHEN** 系统存储产品功能点
- **THEN** product_features 表包含：id, product_id, code, name, feature_type, config_schema（JSON Schema），is_required（必选/可选）

#### Scenario: 必选功能点不可关闭
- **WHEN** 功能点的 is_required = true
- **THEN** 该功能点随产品自动启用，企业在产品配置中不可关闭

### Requirement: 套餐-产品多对多关联
系统 SHALL 维护套餐-产品关联表（package_products），一个套餐可包含多个产品。

#### Scenario: 套餐-产品关联表结构
- **WHEN** 系统存储套餐与产品的关联
- **THEN** package_products 表包含：id, package_id, product_id, sort_order

#### Scenario: 套餐包含多个产品
- **WHEN** 平台管理员创建套餐"标准版"，选择包含"爬楼积分"和"走路积分"
- **THEN** 系统在 package_products 中创建两条关联记录

#### Scenario: 从套餐中移除产品
- **WHEN** 平台管理员从套餐中移除"走路积分"产品
- **THEN** 系统删除对应 package_products 记录；已使用该套餐的企业在下次刷新菜单时不再显示走路积分相关页面

### Requirement: 企业级产品配置
系统 SHALL 维护企业级产品配置表（product_configs），记录企业对每个产品的启用状态和专属配置。

#### Scenario: 企业级产品配置表结构
- **WHEN** 系统存储企业级产品配置
- **THEN** product_configs 表包含：id, tenant_id, product_id, enabled（是否启用）, config_json（产品专属配置，如步数系数）

#### Scenario: 企业绑定套餐后自动创建产品配置
- **WHEN** 企业绑定套餐"标准版"（包含爬楼积分和走路积分）
- **THEN** 系统自动为该企业创建两个 product_configs 记录，enabled = true，config_json 使用产品默认配置

#### Scenario: 企业覆盖产品配置
- **WHEN** 企业管理员将走路积分的步数系数从默认 0.01 改为 0.02
- **THEN** 系统更新该企业的 product_configs 记录的 config_json

### Requirement: 企业级功能点开关
系统 SHALL 维护企业级功能点开关表（product_feature_configs），控制企业最终启用的功能点。

#### Scenario: 功能点开关表结构
- **WHEN** 系统存储企业级功能点开关
- **THEN** product_feature_configs 表包含：id, tenant_id, product_id, feature_id, enabled

#### Scenario: 企业最终启用的功能点计算
- **WHEN** 系统计算企业实际可用的功能点
- **THEN** 最终启用 = 套餐勾选的功能点 ∩ 企业级开关（enabled = true）；必选功能点（is_required = true）始终启用，不受开关影响

#### Scenario: 套餐变更时功能点重置
- **WHEN** 企业套餐从"标准版"升级到"旗舰版"
- **THEN** 系统更新企业功能点配置，旗舰版新增的可选功能点默认为启用状态，保留企业原有的自定义配置

### Requirement: 动态菜单生成
企业管理后台的菜单 SHALL 根据套餐包含的产品和企业级功能点开关动态生成。

#### Scenario: 仅显示已启用产品的菜单
- **WHEN** 企业套餐包含爬楼积分和走路积分
- **THEN** 企业管理后台显示"爬楼积分管理"和"走路积分管理"两个菜单

#### Scenario: 隐藏未启用产品的菜单
- **WHEN** 企业套餐不包含走路积分产品
- **THEN** 企业管理后台不显示"走路积分管理"菜单

#### Scenario: 仅显示已启用功能点的子菜单
- **WHEN** 企业套餐中的爬楼积分产品，"连续打卡奖励"功能点未启用
- **THEN** 爬楼积分管理下不显示"连续打卡奖励配置"子菜单

#### Scenario: 菜单 API 返回完整菜单树
- **WHEN** 前端请求企业管理后台菜单
- **THEN** 后端根据企业的套餐和功能点配置，返回动态裁剪后的菜单树 JSON

### Requirement: 每日步数记录表
系统 SHALL 维护每日步数记录表（step_daily_records），存储走路产品的步数和积分发放记录。

#### Scenario: 步数记录表结构
- **WHEN** 系统存储步数记录
- **THEN** step_daily_records 表包含：id, tenant_id, user_id, date, steps, points_awarded, source（werun/healthkit/health_connect），唯一索引（user_id + date）防止重复领取

### Requirement: 平台管理后台产品管理
平台管理员 SHALL 能够在平台管理后台管理产品和积木组件库。

#### Scenario: 查看产品列表
- **WHEN** 平台管理员进入产品管理页面
- **THEN** 系统展示所有已注册的产品列表（名称、编码、触发器类型、状态）

#### Scenario: 查看产品详情
- **WHEN** 平台管理员点击某个产品
- **THEN** 系统展示产品基本信息、规则链预览（节点列表和顺序）、功能点列表（必选/可选标记）

#### Scenario: 新建产品（从积木库组合）
- **WHEN** 平台管理员点击"新建产品"，选择触发器、拖拽排序规则链节点、选择功能点
- **THEN** 如果所需积木都存在，系统保存产品定义到 products 表；如果触发器或规则节点不存在，提示"请联系开发团队添加新的组件类型"

#### Scenario: 产品配置编辑
- **WHEN** 平台管理员编辑产品配置（修改参数默认值、功能点配置模板）
- **THEN** 系统更新产品级配置，不影响已有企业的 product_configs（企业级配置独立存储）

### Requirement: 套餐管理增强
套餐管理 SHALL 支持产品选择和功能点勾选，替代原有的纯权限配置方式。

#### Scenario: 创建套餐时选择产品
- **WHEN** 平台管理员创建套餐，在"选择产品"步骤勾选爬楼积分和走路积分
- **THEN** 系统在 package_products 中创建关联记录

#### Scenario: 为产品配置功能点
- **WHEN** 平台管理员在套餐中为"爬楼积分"产品勾选可选功能点"节假日翻倍"和"周三送咖啡"
- **THEN** 系统记录套餐级的功能点勾选状态

#### Scenario: 套餐变更影响企业菜单
- **WHEN** 平台管理员修改套餐，新增走路积分产品
- **THEN** 使用该套餐的所有企业在下次登录时，菜单自动出现"走路积分管理"

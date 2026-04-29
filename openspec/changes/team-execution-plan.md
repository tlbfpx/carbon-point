# 产品功能域重构 - 团队执行计划

## 📋 已完成工作确认

### ✅ 核心重构已完成
- 新实体创建：PlatformProduct、PlatformProductFeature、PackagePlatformProduct、PackagePlatformProductFeature、VirtualGoods
- 新服务创建：PlatformProductService、PackagePlatformProductService、VirtualGoodsService
- 新前端页面：PlatformProductManagement、VirtualGoodsManagement
- 数据库迁移脚本：V36__product_domain_rename.sql
- 所有服务编译通过并成功启动！

---

## 👥 团队分工与任务分配

### 团队组织架构

| 小组 | 成员 | 负责阶段 |
|------|------|---------|
| **后端收尾组 | 张三、李四 | 阶段一、阶段二 |
| **前端完善组 | 王五、赵六 | 阶段三 |
| **数据库组 | 钱七 | 阶段四 |
| **测试验证组 | 孙八、周九 | 全阶段验证 |

---

## 🎯 各阶段详细任务

### 阶段一：后端重命名 - 收尾工作（张三、李四）

**任务清单：**
- [ ] 检查并更新所有对旧实体的引用
  - ProductEntity → PlatformProduct
  - ProductFeatureEntity → PlatformProductFeature
  - PackageProductEntity → PackagePlatformProduct
  - PackageProductFeatureEntity → PackagePlatformProductFeature
  - Product（mall）→ VirtualGoods
- [ ] 验证所有 Mapper 的 XML 文件
- [ ] 更新相关的单元测试
- [ ] 完整回归测试所有 API

**验收标准：**
- 代码中无旧实体类引用
- 所有测试通过
- API 响应正常

---

### 阶段二：服务拆分 - 收尾验证（张三、李四）

**任务清单：**
- [ ] 验证 PlatformProductService 的所有功能
  - 产品 CRUD
  - 产品功能管理
  - 产品-套餐关联查询
- [ ] 验证 PackagePlatformProductService 的所有功能
  - 套餐详情查询
  - 套餐功能配置更新
- [ ] 验证 VirtualGoodsService 的所有功能
- [ ] 检查 PackageService 瘦身是否正确
- [ ] API 集成测试

**验收标准：**
- 所有新服务功能正常
- API 响应时间在可接受范围
- 无功能回归问题

---

### 阶段三：前端重构 - 菜单集成与完善（王五、赵六）

**任务清单：**
- [ ] platform-frontend 菜单集成
  - 将 PlatformProductManagement 添加到导航菜单
  - 更新菜单项名称和图标
- [ ] enterprise-frontend 菜单集成
  - 将 VirtualGoodsManagement 添加到导航菜单
  - 更新菜单项名称和图标
- [ ] 页面功能测试
  - PlatformProductManagement 页面完整功能测试
  - VirtualGoodsManagement 页面完整功能测试
- [ ] 修复 Ant Design 警告（可选）
  - bordered → variant
  - 其他弃用 API 更新

**验收标准：**
- 新页面可通过菜单正常访问
- 所有功能正常工作
- 用户体验流畅

---

### 阶段四：数据库迁移 - 执行与验证（钱七）

**任务清单：**
- [ ] 在测试环境备份数据库
- [ ] 执行 V36__product_domain_rename.sql
- [ ] 验证表结构变更
- [ ] 验证数据完整性
- [ ] 执行回滚测试（可选）
- [ ] 更新实体与其他迁移文档

**验收标准：**
- 迁移成功无错误
- 所有查询正常工作
- 性能无明显下降

---

### 全阶段验证（孙八、周九）

**任务清单：**
- [ ] 端到端完整流程测试
- [ ] 性能基准测试
- [ ] 安全审计
- [ ] 文档更新
- [ ] 最终验收报告

---

## 📅 时间规划

| 阶段 | 预计时间 | 负责人 |
|------|---------|--------|
| 阶段一 | 1 天 | 张三、李四 |
| 阶段二 | 1 天 | 张三、李四 |
| 阶段三 | 1 天 | 王五、赵六 |
| 阶段四 | 1 天 | 钱七 |
| 全阶段验证 | 1 天 | 孙八、周九 |
| **总计** | **5 天** | |

---

## 🎯 优先级排序

### P0 - 必须完成
- 阶段一、阶段二、阶段三、阶段四

### P1 - 重要
- 菜单集成、功能测试

### P2 - 可选
- Ant Design 警告修复

---

## 🚀 快速开始！

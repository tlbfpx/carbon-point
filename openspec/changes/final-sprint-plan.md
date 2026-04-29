# 产品功能域重构 - 最终冲刺计划

## 🎯 目标
4 个阶段并行执行，**1 天内完成所有剩余任务**，然后全面测试直至上线交付！

---

## 👥 团队总动员

### 并行执行分组

| 小组 | 成员 | 负责任务 | 预计时间 |
|------|------|---------|---------|
| **后端组 A** | 张三 | 阶段一：carbon-system 旧引用清理 | 2 小时 |
| **后端组 B** | 李四 | 阶段二：新服务功能验证 | 3 小时 |
| **前端组 A** | 王五 | 阶段三：platform-frontend 菜单集成 | 1 小时 |
| **前端组 B** | 赵六 | 阶段三：enterprise-frontend 菜单集成 | 1 小时 |
| **数据库组** | 钱七 | 阶段四：测试环境迁移执行 | 2 小时 |
| **测试组** | 孙八、周九 | 全程跟踪，随时测试 | 全程 |

---

## 📋 详细任务清单

### 第一阶段：后端收尾（张三）

- [ ] 搜索所有文件中的旧实体引用
  ```bash
  # 搜索命令
  grep -r "ProductEntity" saas-backend/
  grep -r "PackageProductEntity" saas-backend/
  grep -r "PackageProductFeatureEntity" saas-backend/
  grep -r "ProductFeatureEntity" saas-backend/
  ```
- [ ] 更新所有找到的引用
- [ ] 验证编译通过
- [ ] 运行单元测试

**验收：** `git status` 显示无编译错误，所有测试通过

---

### 第二阶段：服务验证（李四）

- [ ] PlatformProductService 功能验证
  - [ ] GET /api/platform/products - 产品列表
  - [ ] POST /api/platform/products - 创建产品
  - [ ] PUT /api/platform/products/:id - 更新产品
  - [ ] DELETE /api/platform/products/:id - 删除产品
  - [ ] GET /api/platform/products/:id/features - 产品功能
  - [ ] PUT /api/platform/products/:id/features - 更新功能
- [ ] PackagePlatformProductService 功能验证
  - [ ] GET /api/platform/packages/:id/detail - 套餐详情
  - [ ] PUT /api/platform/packages/:id/features - 更新套餐功能
- [ ] VirtualGoodsService 功能验证
- [ ] 集成测试

**验收：** 所有 API 返回 200 OK，功能正常

---

### 第三阶段：前端菜单集成（王五、赵六）

#### 王五 - platform-frontend
- [ ] 在菜单配置中添加"平台产品管理"
- [ ] 配置路由 `/platform-products`
- [ ] 设置图标（推荐：AppstoreOutlined）
- [ ] 权限配置：platform:product:list
- [ ] 测试完整页面功能

#### 赵六 - enterprise-frontend
- [ ] 在菜单配置中添加"虚拟商品管理"
- [ ] 配置路由 `/virtual-goods`
- [ ] 设置图标（推荐：GiftOutlined）
- [ ] 权限配置
- [ ] 测试完整页面功能

**验收：** 用户可通过菜单正常访问新页面，所有功能正常

---

### 第四阶段：数据库迁移（钱七）

- [ ] 备份测试环境数据库
- [ ] 执行 V36__product_domain_rename.sql
- [ ] 验证表重命名成功
  - [ ] package_products → package_platform_products
  - [ ] package_product_features → package_platform_product_features
  - [ ] products → virtual_goods
- [ ] 验证表注释正确
- [ ] 运行查询验证数据完整性
- [ ] 性能基准测试

**验收：** 迁移成功，所有查询正常，性能无下降

---

## 🔍 全面测试阶段（所有成员）

### 测试范围

#### 1. 功能测试
- [ ] 平台产品管理完整流程
- [ ] 虚拟商品管理完整流程
- [ ] 套餐配置完整流程
- [ ] 租户使用新功能流程

#### 2. 集成测试
- [ ] 前后端联调
- [ ] API 集成测试
- [ ] 数据库集成测试

#### 3. 性能测试
- [ ] 页面加载时间
- [ ] API 响应时间
- [ ] 数据库查询性能

#### 4. 安全测试
- [ ] 权限验证
- [ ] 数据隔离
- [ ] SQL 注入防护

#### 5. 兼容性测试
- [ ] 浏览器兼容性
- [ ] 响应式布局

---

## ✅ 上线检查清单

### 代码质量
- [ ] 所有编译警告已修复
- [ ] 代码规范检查通过
- [ ] 无调试代码残留

### 测试覆盖
- [ ] 单元测试覆盖 ≥ 80%
- [ ] 集成测试覆盖关键路径
- [ ] E2E 测试覆盖核心流程

### 文档
- [ ] API 文档更新
- [ ] 部署文档更新
- [ ] 回滚方案准备

### 运维准备
- [ ] 数据库备份方案
- [ ] 监控配置
- [ ] 回滚脚本准备

---

## 🚀 快速开始！

### 立即执行命令

```bash
# 1. 后端组检查引用
cd saas-backend
grep -r "ProductEntity" --include="*.java" .
grep -r "PackageProductEntity" --include="*.java" .

# 2. 数据库组执行迁移（测试环境！）
# 先备份，再执行 V36__product_domain_rename.sql

# 3. 前端组修改菜单配置
# platform-frontend/src/App.tsx
# enterprise-frontend/src/...
```

---

## 📊 进度跟踪

| 阶段 | 状态 | 负责人 | 更新时间 |
|------|------|--------|---------|
| 阶段一 | ⏳ 待开始 | 张三 | |
| 阶段二 | ⏳ 待开始 | 李四 | |
| 阶段三 | ⏳ 待开始 | 王五、赵六 | |
| 阶段四 | ⏳ 待开始 | 钱七 | |
| 全面测试 | ⏳ 待开始 | 全员 | |

---

## 🎉 上线交付标准

- ✅ 所有任务完成
- ✅ 所有测试通过
- ✅ 性能达标
- ✅ 文档齐全
- ✅ 回滚方案准备就绪

---

**立即开始！🚀**

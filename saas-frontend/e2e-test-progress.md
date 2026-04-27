# E2E 测试进度

## 平台前端测试套件（平台管理后台）

| 页面 | Spec 文件 | 测试数 | 状态 |
|------|----------|--------|------|
| 平台看板 Dashboard | full-audit.spec.ts (OVERLAY/VIS) + dashboard.spec.ts | ~25 | ✅ 完整 |
| **平台报表 PlatformReports** | platform-reports.spec.ts（新增） | ~15 | ✅ 新建完成 |
| 企业管理 EnterpriseManagement | enterprise-management.spec.ts + full-audit.spec.ts (ENT) | ~30 | ✅ 完整 |
| 系统管理 SystemManagement | system-management.spec.ts | ~30 | ✅ 完整（操作日志） |
| **用户管理 SystemUsers** | system-users.spec.ts（新建） | ~23 | ✅ 新建完成 |
| **角色管理 SystemRoles** | system-roles.spec.ts（新建） | ~22 | ✅ 新建完成 |
| **字典管理 DictManagement** | dict-management.spec.ts（新建） | ~22 | ✅ 新建完成 |
| 产品管理 ProductManagement | product-management.spec.ts + product-wizard.spec.ts | ~15 | ✅ 完整 |
| 积木组件库 BlockLibrary | feature-library.spec.ts + full-audit.spec.ts (BL) | ~10 | ✅ 完整 |
| 套餐管理 PackageManagement | package-config.spec.ts | ~5 | ✅ 完整 |
| 平台配置 PlatformConfig | platform-config.spec.ts | ~20 | ✅ 完整（部分 skip） |

**菜单覆盖率：100%**（11/11 页面全部覆盖）

## 企业前端测试套件（企业管理员后台）

| 页面 | Spec 文件 | 覆盖状态 |
|------|----------|---------|
| 仪表盘 Dashboard | dashboard.spec.ts | ✅ |
| 登录 Login | login.spec.ts | ✅ |
| 菜单导航 MenuNavigation | menu-navigation.spec.ts | ✅ |
| 会员管理 Member | member.spec.ts | ✅ |
| 积分管理 Points | points.spec.ts | ✅ |
| 订单管理 Orders | orders.spec.ts | ✅ |
| 商品管理 Products | products.spec.ts | ✅ |
| 报表 Reports | reports.spec.ts | ✅ |
| **徽章管理 BadgeManagement** | badge-management.spec.ts（新增） | ✅ 新建完成 |
| **部门管理 DepartmentManagement** | department-management.spec.ts（新增） | ✅ 新建完成 |
| 角色管理 Roles | roles.spec.ts | ✅ |
| 规则管理 Rules | rules.spec.ts | ✅ |

**覆盖率：12/12 = 100%**

## H5 移动端测试套件（用户端）

| 页面 | Spec 文件 | 覆盖状态 |
|------|----------|---------|
| 登录 Login | login.spec.ts | ✅ |
| 首页 Home | home.spec.ts | ✅ |
| 签到 CheckIn | checkin.spec.ts | ✅ |
| 积分 Points | points.spec.ts | ✅ |
| 商城 Mall | mall.spec.ts | ✅ |
| 个人中心 Profile | profile.spec.ts | ✅ |
| 完整旅程 FullJourney | full-journey.spec.ts | ✅ |

**覆盖率：7/7 = 100%**

## 测试执行方式

```bash
# 平台前端
cd saas-frontend/platform-frontend
npx playwright test --project=chromium

# 企业前端
cd saas-frontend/enterprise-frontend
npx playwright test --project=chromium

# H5 移动端
cd saas-frontend/h5
npx playwright test --project=chromium

# 本地 Chrome（Headless=false, 可视化）
npx playwright test --project=chromium --headed
```

## 本地 Chrome 配置

平台前端和企业前端 Playwright 配置使用 `Desktop Chrome` 设备，可通过 `--headed` 模式在本地浏览器中运行并可视化观察。

## 待补充测试数据

- 后端 API `/platform/config` PUT 返回 500（PC-014, PC-015 skip）
- 平台配置保存功能后端未实现

## 最后更新

2026-04-27（新增Honor模块+PlatformReports页面E2E测试）

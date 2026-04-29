# 10 人专业 Playwright 测试团队方案

## 团队架构

| 角色 | 人数 | 职责范围 |
|------|------|---------|
| **测试负责人** | 1 | 整体规划、质量把关、报告汇总 |
| **平台前端测试** | 2 | 平台管理后台（11个页面） |
| **企业前端测试** | 2 | 企业管理后台（13个页面） |
| **H5 移动端测试** | 2 | 用户端 H5（7个页面） |
| **控制台监控** | 1 | Console Error/Warning 清理与持续监控 |
| **性能测试** | 1 | 加载性能、交互响应、稳定性测试 |
| **自动化维护** | 1 | 测试用例维护、CI/CD 集成、报告 |

## 质量标准

### 功能测试标准
- ✅ 所有页面加载成功
- ✅ 所有菜单可导航
- ✅ 所有按钮可点击
- ✅ 所有表单可提交
- ✅ 所有链接可跳转
- ✅ 所有数据正常显示

### 控制台标准
- ❌ **Zero Error** - 不允许任何 console.error
- ❌ **Zero Warning** - 不允许任何 console.warning（可配置白名单）
- ✅ 允许 console.log/info（用于调试）

### 兼容性标准
- Chrome 最新版 + Chrome 前一版
- 本地 Chrome 可视化测试
- Headless 模式 CI 测试

## 测试范围

### 1. 平台管理后台（Platform Frontend）
**负责人：测试工程师 A + B**

| 页面 | 测试深度 |
|------|---------|
| 平台看板 Dashboard | 完整功能测试 |
| 平台报表 PlatformReports | 完整功能测试 |
| 企业管理 EnterpriseManagement | 完整功能测试 |
| 系统管理 SystemManagement | 完整功能测试 |
| 用户管理 SystemUsers | 完整功能测试 |
| 角色管理 SystemRoles | 完整功能测试 |
| 字典管理 DictManagement | 完整功能测试 |
| 产品管理 ProductManagement | 完整功能测试 |
| 积木组件库 BlockLibrary | 完整功能测试 |
| 套餐管理 PackageManagement | 完整功能测试 |
| 平台配置 PlatformConfig | 完整功能测试 |

### 2. 企业管理后台（Enterprise Frontend）
**负责人：测试工程师 C + D**

| 页面 | 测试深度 |
|------|---------|
| 仪表盘 Dashboard | 完整功能测试 |
| 登录 Login | 完整功能测试 |
| 菜单导航 MenuNavigation | 完整功能测试 |
| 会员管理 Member | 完整功能测试 |
| 积分管理 Points | 完整功能测试 |
| 订单管理 Orders | 完整功能测试 |
| 商品管理 Products | 完整功能测试 |
| 报表 Reports | 完整功能测试 |
| 徽章管理 BadgeManagement | 完整功能测试 |
| 部门管理 DepartmentManagement | 完整功能测试 |
| 品牌配置 Branding | 完整功能测试 |
| 角色管理 Roles | 完整功能测试 |
| 规则管理 Rules | 完整功能测试 |

### 3. H5 移动端（H5）
**负责人：测试工程师 E + F**

| 页面 | 测试深度 |
|------|---------|
| 登录 Login | 完整功能测试 |
| 首页 Home | 完整功能测试 |
| 签到 CheckIn | 完整功能测试 |
| 积分 Points | 完整功能测试 |
| 商城 Mall | 完整功能测试 |
| 个人中心 Profile | 完整功能测试 |
| 完整旅程 FullJourney | 端到端测试 |

### 4. 控制台监控（Console）
**负责人：测试工程师 G**

- 全局 Console 监控配置
- Error/Warning 分类处理
- 白名单管理
- 持续集成监控

### 5. 性能测试（Performance）
**负责人：测试工程师 H**

- 页面加载性能
- 交互响应时间
- 内存泄漏检测
- 长期运行稳定性

### 6. 自动化维护（Maintenance）
**负责人：测试工程师 I**

- 测试用例维护
- Page Object 更新
- CI/CD 集成
- 报告生成与归档

## 测试执行流程

### 每日执行
```bash
# 1. 启动所有服务（如未启动）
# 后端
cd saas-backend && ./mvnw clean package -Dmaven.test.skip=true
java -jar carbon-app/target/carbon-app-1.0.0-SNAPSHOT.jar --spring.profiles.active=dev &

# 前端（三个终端）
cd saas-frontend
pnpm --filter @carbon-point/platform-frontend dev &
pnpm --filter @carbon-point/enterprise-frontend dev &
pnpm --filter @carbon-point/h5 dev &

# 2. 运行完整测试（可视化模式）
cd saas-frontend/platform-frontend
npx playwright test --project=chromium --headed

cd ../enterprise-frontend
npx playwright test --project=chromium --headed

cd ../h5
npx playwright test --project=chromium --headed
```

### 测试报告
- HTML 报告：`e2e/reports/index.html`
- JSON 结果：`e2e/reports/results.json`
- 控制台日志：单独文件记录

## 控制台监控配置

### 白名单机制
```typescript
// 可接受的 Warning/Error（需要团队评审）
const CONSOLE_WHITELIST = [
  /Download the React DevTools/,
  /Consider adding an error boundary/,
  /Autofocus processing was blocked/,
];
```

### 违规处理
1. 新发现的 Error/Warning 立即暂停测试
2. 记录到问题追踪系统
3. 分配给对应开发修复
4. 修复后重新运行完整测试

## 交付物清单

### 每日交付
- ✅ 测试执行报告（通过/失败数量）
- ✅ 控制台 Error/Warning 清单
- ✅ 失败测试截图与 Trace

### 每周交付
- ✅ 周测试总结报告
- ✅ 质量趋势分析
- ✅ 风险评估与建议

### 里程碑交付
- ✅ 完整测试用例库
- ✅ 控制台零 Error/Warning 认证
- ✅ 性能基准报告
- ✅ CI/CD 自动化流水线

## 成功标准

1. **功能覆盖**：100% 菜单、按钮、页面
2. **控制台**：Zero Error，Zero Warning（白名单除外）
3. **稳定性**：测试通过率 ≥ 95%
4. **性能**：页面加载 ≤ 3s，交互响应 ≤ 500ms

---

**生效日期**：2026-04-27
**版本**：v1.0

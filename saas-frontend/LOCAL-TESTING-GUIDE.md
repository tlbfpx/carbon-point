# 本地 Playwright 测试快速指南

## 前置条件

确保以下服务已启动：

1. **后端服务**
   ```bash
   cd saas-backend
   ./mvnw clean package -Dmaven.test.skip=true
   java -jar carbon-app/target/carbon-app-1.0.0-SNAPSHOT.jar --spring.profiles.active=dev
   ```

2. **前端服务**（三个终端分别运行）
   ```bash
   cd saas-frontend
   pnpm --filter @carbon-point/platform-frontend dev    # :3001
   pnpm --filter @carbon-point/enterprise-frontend dev  # :3000
   pnpm --filter @carbon-point/h5 dev                   # :3000/h5
   ```

## 快速开始

### 方式一：一键运行所有测试（推荐）

```bash
cd saas-frontend
node run-local-tests.js
```

或分别运行：
```bash
node run-local-tests.js platform
node run-local-tests.js enterprise
node run-local-tests.js h5
```

### 方式二：单独运行每个项目

#### 平台前端
```bash
cd saas-frontend/platform-frontend
pnpm test:local
```

#### 企业前端
```bash
cd saas-frontend/enterprise-frontend
pnpm test:local
```

#### H5 移动端
```bash
cd saas-frontend/h5
pnpm test:local
```

### 方式三：使用 Playwright UI 模式（最直观）

```bash
# 平台前端
cd platform-frontend
pnpm test:local:ui

# 企业前端
cd enterprise-frontend
pnpm test:local:ui

# H5
cd h5
pnpm test:local:ui
```

## 本地 Chrome 配置特性

### playwright.local-chrome.config.ts 配置说明

- ✅ 使用系统安装的 Chrome（不是 Playwright 自带的 Chromium）
- ✅ 强制 `--headed` 可视化模式
- ✅ 自动打开 DevTools
- ✅ 窗口最大化 (1920x1080)
- ✅ `slowMo: 100ms` 放慢操作方便观察
- ✅ 始终记录 Trace、截图、视频
- ✅ 单 Worker 顺序执行，容易调试
- ✅ 更长的超时时间 (30s/60s)

## Console Monitor 工具

### 功能
- 自动捕获 `console.error` 和 `console.warn`
- 支持白名单机制
- 自动在测试结束时断言无错误
- 详细的报告输出

### 白名单配置
编辑 `e2e/utils/console-monitor.ts` 中的 `CONSOLE_WHITELIST`

### 在测试中使用

```typescript
import { test } from '@playwright/test';
import { consoleMonitor, ConsoleMonitor } from '../utils/console-monitor';

test.describe('My tests', () => {
  let monitor: ConsoleMonitor;

  test.beforeEach(async ({ page }) => {
    monitor = new ConsoleMonitor();
    monitor.start(page);
  });

  test.afterEach(() => {
    monitor.printReport();
    monitor.assertNoErrors(); // 失败则测试不通过
  });

  test('my test', async ({ page }) => {
    // ... 测试内容
  });
});
```

## 测试报告位置

运行完成后，查看报告：

| 项目 | HTML 报告 |
|------|-----------|
| 平台前端 | `platform-frontend/e2e/reports-local/index.html` |
| 企业前端 | `enterprise-frontend/e2e/reports-local/index.html` |
| H5 | `h5/e2e/reports-local/index.html` |

## 常见问题

### 1. 找不到 Chrome 浏览器
Playwright 会自动搜索常见路径，如果找不到：
- 检查 Chrome 是否已安装
- 或修改 `playwright.local-chrome.config.ts` 中的 `localChromePath`

### 2. 测试超时
- 确认后端和前端服务已正常启动
- 检查网络连接
- 可在配置中调整 `actionTimeout` 和 `navigationTimeout`

### 3. 登录失败
- 确认数据库中有测试用户
- 检查 `global-setup.ts` 中的登录逻辑

### 4. Console 警告太多
- 先使用白名单临时过滤
- 逐步清理代码中的警告

## 10 人团队日常工作流

### 每日早晨
1. 拉取最新代码
2. 启动所有服务
3. 运行 `node run-local-tests.js`
4. 检查报告，处理失败用例

### 开发过程中
1. 开发新功能时，同步更新对应测试用例
2. 使用 `--ui` 模式交互式调试
3. 确保新代码不引入 Console Error/Warning

### 提交前
1. 运行相关模块的完整测试
2. 确认无 Console Error/Warning
3. 提交代码 + 测试用例更新

## 下一步

- [ ] 运行首次完整测试，记录基线
- [ ] 清理已发现的 Console Error/Warning
- [ ] 逐步将 Console Monitor 集成到所有现有测试
- [ ] 配置 CI/CD 自动运行

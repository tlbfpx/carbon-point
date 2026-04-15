# Playwright 测试效率核心要求

## 1. 必须使用智能等待，禁止硬编码延迟

- **禁止**: `page.waitForTimeout(3000)`、`page.waitForTimeout(5000)`
- **必须**: `page.waitForSelector('.result')`、`expect(element).toBeVisible()`、`page.waitForResponse('**/api/**')`

原因：固定延迟浪费大量时间且不稳定，智能等待在有结果时立即继续。

## 2. 必须复用登录状态

登录逻辑只执行一次，通过 storageState 保存认证信息。

后续测试直接加载 `auth.json`，避免每个测试都重新登录。

```typescript
// 首次登录保存
await context.storageState({ path: 'auth.json' });
// 后续测试复用
context = await browser.newContext({ storageState: 'auth.json' });
```

## 3. 必须并行执行测试

- 配置 `fullyParallel: true`，不同测试文件同时运行
- CI 环境设置 `workers: 4` 或更高（根据 CPU 核心数）

预期效果：10 个测试从串行 60 秒降到并行 10 秒。

## 4. 优先使用高效定位器

定位器效率排序：`getByRole()` > `getByTestId()` > `getByText()` > `getByLabel()` > `locator()`

- **避免**: 复杂 XPath、依赖 CSS 类名的选择器
- **推荐**: `page.getByRole('button', { name: '提交' })`、`page.getByTestId('submit-btn')`

## 5. CI 环境必须使用无头模式

- 本地调试可用 `--headed` 观察
- CI 必须 `--headed=false`

原因：无头模式比有头模式快 30%-50%，节省大量 CI 时间。

配置：`headless: process.env.CI === 'true'`

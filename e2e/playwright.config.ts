import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 配置文件 - Carbon Point 后台管理系统验收测试
 * @see https://playwright.dev/docs/test-configuration
 */

export default defineConfig({
  testDir: './tests',

  // 测试输出目录
  outputDir: './test-results',

  // 完全并行运行测试
  fullyParallel: true,

  // CI上失败重试
  retries: process.env.CI ? 2 : 0,

  // 工人数量，根据CPU核心调整
  workers: process.env.CI ? 4 : undefined,

  // 报告格式
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],

  // 全局期望超时
  expect: {
    timeout: 5000,
  },

  // 每个测试超时
  timeout: 30 * 1000,

  // 全局设置
  use: {
    // 基URL
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    // 保存失败测试的截图
    screenshot: 'only-on-failure',

    // 保存失败测试的录屏
    trace: 'retain-on-failure',

    // 浏览器视口大小
    viewport: { width: 1920, height: 1080 },
  },

  // 项目配置 - 测试多浏览器
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});

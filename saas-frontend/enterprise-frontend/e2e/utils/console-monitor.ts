/**
 * Console Monitor - 监控并拦截 console.error 和 console.warn
 *
 * 使用方式：
 *   在 test.beforeEach 中调用 consoleMonitor.start(page)
 *   在 test.afterEach 中调用 consoleMonitor.assertNoErrors()
 */

import { Page, test } from '@playwright/test';

export interface ConsoleError {
  type: 'error' | 'warning';
  message: string;
  url?: string;
  timestamp: Date;
}

// 可接受的白名单（需要团队评审后添加）
const CONSOLE_WHITELIST: RegExp[] = [
  // React DevTools 提示
  /Download the React DevTools/,
  /React DevTools installed/,
  // 自动聚焦提示
  /Autofocus processing was blocked/,
  // 非关键 Deprecation 警告（视情况处理）
  /Consider adding an error boundary/,
  // Ant Design 内部警告（视情况处理）
  /\[antd:/,
  // 网络超时（不是前端代码问题）
  /Timeout exceeded/,
  /Network Error/,
  // 图片加载失败（测试数据问题）
  /Failed to load resource/,
  /net::ERR_ABORTED/,
  /net::ERR_FAILED/,
  /net::ERR_CONNECTION_REFUSED/,
  // HMR 热更新相关
  /\[vite\]/,
  /\[hmr\]/,
];

export class ConsoleMonitor {
  private errors: ConsoleError[] = [];
  private warnings: ConsoleError[] = [];
  private page: Page | null = null;

  /**
   * 开始监控
   */
  start(page: Page) {
    this.page = page;
    this.errors = [];
    this.warnings = [];

    // 监听 console.error
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!this.isWhitelisted(text)) {
          this.errors.push({
            type: 'error',
            message: text,
            url: page.url(),
            timestamp: new Date(),
          });
          // 立即打印以便调试
          console.error('[CONSOLE ERROR]', text, 'at', page.url());
        }
      } else if (msg.type() === 'warning') {
        const text = msg.text();
        if (!this.isWhitelisted(text)) {
          this.warnings.push({
            type: 'warning',
            message: text,
            url: page.url(),
            timestamp: new Date(),
          });
          // 立即打印以便调试
          console.warn('[CONSOLE WARNING]', text, 'at', page.url());
        }
      }
    });

    // 监听页面错误
    page.on('pageerror', (error) => {
      const text = error.message;
      if (!this.isWhitelisted(text)) {
        this.errors.push({
          type: 'error',
          message: text,
          url: page.url(),
          timestamp: new Date(),
        });
        console.error('[PAGE ERROR]', text, 'at', page.url());
      }
    });
  }

  /**
   * 检查是否在白名单中
   */
  private isWhitelisted(message: string): boolean {
    return CONSOLE_WHITELIST.some((pattern) => pattern.test(message));
  }

  /**
   * 获取所有 errors
   */
  getErrors(): ConsoleError[] {
    return [...this.errors];
  }

  /**
   * 获取所有 warnings
   */
  getWarnings(): ConsoleError[] {
    return [...this.warnings];
  }

  /**
   * 断言没有 error（测试失败时调用）
   */
  assertNoErrors() {
    if (this.errors.length > 0) {
      throw new Error(
        `Found ${this.errors.length} console error(s):\n` +
          this.errors.map((e, i) => `${i + 1}. ${e.message} (at ${e.url})`).join('\n')
      );
    }
  }

  /**
   * 断言没有 error 和 warning（严格模式）
   */
  assertNoErrorsOrWarnings() {
    this.assertNoErrors();
    if (this.warnings.length > 0) {
      throw new Error(
        `Found ${this.warnings.length} console warning(s):\n` +
          this.warnings.map((w, i) => `${i + 1}. ${w.message} (at ${w.url})`).join('\n')
      );
    }
  }

  /**
   * 手动添加白名单（临时使用）
   */
  addTemporaryWhitelist(pattern: RegExp) {
    CONSOLE_WHITELIST.push(pattern);
  }

  /**
   * 打印当前捕获的所有日志
   */
  printReport() {
    console.log('\n========== CONSOLE MONITOR REPORT ==========');
    console.log(`Errors: ${this.errors.length}`);
    console.log(`Warnings: ${this.warnings.length}`);
    if (this.errors.length > 0) {
      console.log('\nErrors:');
      this.errors.forEach((e, i) => {
        console.log(`  ${i + 1}. [${e.timestamp.toISOString()}] ${e.message}`);
        console.log(`     URL: ${e.url}`);
      });
    }
    if (this.warnings.length > 0) {
      console.log('\nWarnings:');
      this.warnings.forEach((w, i) => {
        console.log(`  ${i + 1}. [${w.timestamp.toISOString()}] ${w.message}`);
        console.log(`     URL: ${w.url}`);
      });
    }
    console.log('============================================\n');
  }

  /**
   * 重置状态
   */
  reset() {
    this.errors = [];
    this.warnings = [];
    this.page = null;
  }
}

// 单例实例
export const consoleMonitor = new ConsoleMonitor();

/**
 * Playwright Fixture - 自动监控 console
 */
export const testWithConsole = test.extend<{
  consoleMonitor: ConsoleMonitor;
}>({
  consoleMonitor: async ({ page }, use) => {
    const monitor = new ConsoleMonitor();
    monitor.start(page);
    await use(monitor);
    monitor.assertNoErrors(); // 每个测试结束时检查
  },
});

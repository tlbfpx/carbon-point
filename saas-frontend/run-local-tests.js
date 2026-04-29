#!/usr/bin/env node
/**
 * Carbon Point - 本地完整测试脚本 (Node.js 跨平台版)
 *
 * 使用方式：
 *   node run-local-tests.js          # 运行所有测试
 *   node run-local-tests.js platform # 只运行平台前端
 *   node run-local-tests.js enterprise # 只运行企业前端
 *   node run-local-tests.js h5       # 只运行 H5
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  nc: '\x1b[0m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.nc}`);
}

function copyFileSync(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

async function runCommand(command, cwd, description) {
  log(colors.yellow, `\n[${description}]`);
  log(colors.yellow, `执行: ${command}`);

  return new Promise((resolve) => {
    const [cmd, ...args] = command.split(' ');

    const child = spawn(cmd, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(colors.green, `✓ ${description} 完成`);
      } else {
        log(colors.red, `✗ ${description} 完成 (退出码: ${code})`);
      }
      resolve(code);
    });
  });
}

async function main() {
  const target = process.argv[2] || 'all';

  log(colors.green, '========================================');
  log(colors.green, '  Carbon Point 本地测试套件');
  log(colors.green, '========================================');

  // 检查目录
  if (!fs.existsSync('platform-frontend') || !fs.existsSync('enterprise-frontend') || !fs.existsSync('h5')) {
    log(colors.red, '错误：请在 saas-frontend 目录下运行此脚本');
    process.exit(1);
  }

  // 复制 console-monitor 工具
  log(colors.yellow, '\n[1/5] 配置测试工具...');
  const monitorSrc = 'platform-frontend/e2e/utils/console-monitor.ts';

  if (fs.existsSync(monitorSrc)) {
    copyFileSync(monitorSrc, 'enterprise-frontend/e2e/utils/console-monitor.ts');
    copyFileSync(monitorSrc, 'h5/e2e/utils/console-monitor.ts');
    log(colors.green, '✓ Console Monitor 已配置');
  } else {
    log(colors.red, '警告: 未找到 console-monitor.ts');
  }

  const targets = target === 'all' ? ['platform', 'enterprise', 'h5'] : [target];

  for (const t of targets) {
    if (t === 'platform') {
      await runCommand(
        'npx playwright test --config=playwright.local-chrome.config.ts --headed',
        'platform-frontend',
        '2/5 运行平台前端测试'
      );
    } else if (t === 'enterprise') {
      await runCommand(
        'npx playwright test --config=playwright.local-chrome.config.ts --headed',
        'enterprise-frontend',
        '3/5 运行企业前端测试'
      );
    } else if (t === 'h5') {
      await runCommand(
        'npx playwright test --config=e2e/playwright.local-chrome.config.ts --headed',
        'h5',
        '4/5 运行 H5 移动端测试'
      );
    }
  }

  log(colors.green, '\n========================================');
  log(colors.green, '  测试执行完成');
  log(colors.green, '========================================');
  console.log('\n报告位置：');
  console.log('  平台前端: platform-frontend/e2e/reports-local/index.html');
  console.log('  企业前端: enterprise-frontend/e2e/reports-local/index.html');
  console.log('  H5 移动端: h5/e2e/reports-local/index.html');
}

main().catch((err) => {
  console.error(colors.red + '错误:' + colors.nc, err);
  process.exit(1);
});

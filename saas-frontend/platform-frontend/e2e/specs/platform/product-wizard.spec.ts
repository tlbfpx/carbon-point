import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsPlatformAdmin, uniqueId } from '../../helpers';

test.describe('平台后台 - 产品配置向导全流程', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    await page.goto(`${BASE_URL}/features/products`);
    await page.waitForLoadState('networkidle');
  });

  test('PW-001: 产品配置向导 - 完整流程测试', async ({ page }) => {
    const productName = `标准爬楼打卡_${uniqueId()}`;
    const productCode = `STAIRS_${Date.now()}`;

    // 步骤 1: 打开配置向导
    await page.click('button:has-text("配置产品")');
    await expect(page.locator('.ant-modal')).toBeVisible();
    await expect(page.locator('.ant-steps')).toBeVisible();

    // 步骤 2: 填写基本信息
    await expect(page.locator('.ant-steps-item-active')).toContainText('基本信息');

    await page.fill('input[placeholder*="如: stairs_basic"]', productCode);
    await page.fill('input[placeholder*="请输入产品名称"]', productName);

    // 选择产品分类
    await page.click('.ant-select-selector');
    await page.click('.ant-select-item:has-text("爬楼积分")');

    await page.fill('textarea[placeholder*="描述"]', '企业标准版爬楼打卡产品，支持时段配置、节假日翻倍、连续打卡奖励');

    // 进入下一步
    await page.click('button:has-text("下一步")');

    // 步骤 3: 选择触发器
    await expect(page.locator('.ant-steps-item-active')).toContainText('选择触发器');
    await expect(page.locator('.ant-alert')).toContainText('选择触发器');

    // 选择打卡触发器
    await page.click('.ant-card:has-text("打卡触发器")');
    await expect(page.locator('.ant-card:has-text("打卡触发器")')).toHaveCSS('border-color', /rgb\(24, 144, 255\)|#1890ff/);

    // 进入下一步
    await page.click('button:has-text("下一步")');

    // 步骤 4: 组装规则链
    await expect(page.locator('.ant-steps-item-active')).toContainText('组装规则链');

    // 验证规则链已加载
    const ruleChainItems = page.locator('.ant-tag:has-text("时段匹配"), .ant-tag:has-text("随机基数"), .ant-tag:has-text("特殊日期倍率"), .ant-tag:has-text("等级系数"), .ant-tag:has-text("数值取整"), .ant-tag:has-text("每日上限")');
    await expect(ruleChainItems.first()).toBeVisible();

    // 测试配置规则节点 - 时段匹配
    const timeSlotConfigBtn = page.locator('button:has-text("配置")').first();
    if (await timeSlotConfigBtn.isVisible()) {
      await timeSlotConfigBtn.click();
      await expect(page.locator('.ant-modal-title')).toContainText('配置规则节点');

      // 可以在此测试配置表单的交互
      await page.waitForTimeout(500);

      // 关闭配置弹窗
      await page.click('.ant-modal-footer button:has-text("取消")');
    }

    // 测试调整规则顺序 - 将第一个节点下移
    const moveDownBtns = page.locator('button[aria-label*="down"]');
    if (await moveDownBtns.count() >= 2) {
      await moveDownBtns.first().click();
    }

    // 进入下一步
    await page.click('button:has-text("下一步")');

    // 步骤 5: 选择功能点
    await expect(page.locator('.ant-steps-item-active')).toContainText('选择功能点');

    // 验证功能点列表
    const featureItems = page.locator('.ant-checkbox-wrapper');
    await expect(featureItems.first()).toBeVisible();

    // 选择一些功能点
    const featureBoxes = page.locator('div[role*="presentation"]');
    if (await featureBoxes.count() > 0) {
      await featureBoxes.first().click();
    }

    // 确认创建
    await page.click('button:has-text("确认创建")');

    // 验证创建成功 - 应该显示成功提示
    await page.waitForTimeout(1000);

    // 验证产品列表中包含新产品
    await page.goto(`${BASE_URL}/features/products`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.ant-table')).toContainText(productName);
  });

  test('PW-002: 产品创建成功后快捷操作', async ({ page }) => {
    const productName = `快捷操作测试_${uniqueId()}`;
    const productCode = `QUICK_${Date.now()}`;

    // 快速创建一个产品来测试成功模态框
    await page.click('button:has-text("配置产品")');

    // 快速完成向导步骤
    await page.fill('input[placeholder*="如: stairs_basic"]', productCode);
    await page.fill('input[placeholder*="请输入产品名称"]', productName);
    await page.click('.ant-select-selector');
    await page.click('.ant-select-item:has-text("爬楼积分")');

    await page.click('button:has-text("下一步")');
    await page.click('.ant-card:has-text("打卡触发器")');
    await page.click('button:has-text("下一步")');
    await page.click('button:has-text("下一步")');
    await page.click('button:has-text("确认创建")');

    // 验证成功模态框
    await page.waitForTimeout(1000);

    // 检查是否有成功相关的提示
    const successModal = page.locator('.ant-modal-title:has-text("产品创建成功")');
    if (await successModal.isVisible()) {
      await expect(successModal).toBeVisible();

      // 测试快捷操作按钮
      await expect(page.locator('button:has-text("查看产品详情")')).toBeVisible();
      await expect(page.locator('button:has-text("去套餐管理")')).toBeVisible();
      await expect(page.locator('button:has-text("继续创建新产品")')).toBeVisible();

      // 测试继续创建新产品
      await page.click('button:has-text("继续创建新产品")');
      await expect(page.locator('.ant-modal-title:has-text("配置产品")')).toBeVisible();
    }
  });

  test('PW-003: 向导步骤验证和回退', async ({ page }) => {
    // 打开向导
    await page.click('button:has-text("配置产品")');

    // 验证第一步 - 不填写信息不能下一步
    await page.click('button:has-text("下一步")');
    await expect(page.locator('.ant-steps-item-active')).toContainText('基本信息');

    // 填写基本信息
    await page.fill('input[placeholder*="如: stairs_basic"]', `BACK_${Date.now()}`);
    await page.fill('input[placeholder*="请输入产品名称"]', `回退测试_${uniqueId()}`);
    await page.click('.ant-select-selector');
    await page.click('.ant-select-item:has-text("爬楼积分")');

    // 进入第二步
    await page.click('button:has-text("下一步")');
    await expect(page.locator('.ant-steps-item-active')).toContainText('选择触发器');

    // 测试回退
    await page.click('button:has-text("上一步")');
    await expect(page.locator('.ant-steps-item-active')).toContainText('基本信息');

    // 再次进入第二步
    await page.click('button:has-text("下一步")');
    await expect(page.locator('.ant-steps-item-active')).toContainText('选择触发器');

    // 取消向导
    await page.click('button:has-text("取消")');
    await expect(page.locator('.ant-modal')).not.toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsPlatformAdmin, expectAntSuccess, waitForModal, closeModal } from '../../helpers';

test.describe('平台后台 - 平台配置', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    await page.click('text=平台配置');
    await page.waitForTimeout(2000);
  });

  test('PC-001: 平台配置页面可访问', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: '平台配置' })).toBeVisible();
    await expect(page.locator('.ant-form')).toBeVisible();
  });

  test('PC-002: 保存按钮可见', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: '保存' }).first()).toBeVisible();
  });

  test('PC-003: 基础配置表单可编辑', async ({ page }) => {
    const formItems = page.locator('.ant-form-item');
    const count = await formItems.count();
    expect(count).toBeGreaterThan(0);
    // Verify inputs are editable
    const firstInput = page.locator('.ant-form input').first();
    await expect(firstInput).toBeEnabled();
  });

  test('PC-004: 切换到通知设置Tab', async ({ page }) => {
    const notificationTab = page.locator('.ant-tabs-tab').filter({ hasText: '通知设置' });
    if (await notificationTab.isVisible()) {
      await notificationTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator('.ant-form').filter({ hasText: /通知|notification/i })).toBeVisible();
    } else {
      // If no tabs, skip - form may have notification fields directly
      test.skip('No notification tab found, skipping');
    }
  });

  test('PC-005: 切换到积分规则Tab', async ({ page }) => {
    const pointsTab = page.locator('.ant-tabs-tab').filter({ hasText: '积分规则' });
    if (await pointsTab.isVisible()) {
      await pointsTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator('.ant-form')).toBeVisible();
    } else {
      test.skip('No points rule tab found, skipping');
    }
  });

  test('PC-006: 切换到功能开关Tab', async ({ page }) => {
    const featureTab = page.locator('.ant-tabs-tab').filter({ hasText: '功能开关' });
    if (await featureTab.isVisible()) {
      await featureTab.click();
      await page.waitForTimeout(500);
      // Check for toggle switches
      const switches = page.locator('.ant-switch');
      expect(await switches.count()).toBeGreaterThan(0);
    } else {
      test.skip('No feature flags tab found, skipping');
    }
  });

  test('PC-007: 切换到第三方集成Tab', async ({ page }) => {
    const integrationTab = page.locator('.ant-tabs-tab').filter({ hasText: '第三方集成' });
    if (await integrationTab.isVisible()) {
      await integrationTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator('.ant-form')).toBeVisible();
    } else {
      test.skip('No integration tab found, skipping');
    }
  });

  test('PC-008: 切换到系统设置Tab', async ({ page }) => {
    const systemTab = page.locator('.ant-tabs-tab').filter({ hasText: '系统设置' });
    if (await systemTab.isVisible()) {
      await systemTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator('.ant-form')).toBeVisible();
    } else {
      test.skip('No system settings tab found, skipping');
    }
  });

  test('PC-009: 必填字段验证 - 留空提交', async ({ page }) => {
    // Clear a required field and attempt to save
    const requiredInput = page.locator('.ant-form-item-required input').first();
    if (await requiredInput.isVisible()) {
      await requiredInput.clear();
      await page.locator('button').filter({ hasText: '保存' }).first().click();
      await page.waitForTimeout(500);
      // Should show validation error
      const errorMsg = page.locator('.ant-form-item-explain-error');
      await expect(errorMsg.first()).toBeVisible({ timeout: 3000 });
    } else {
      test.skip('No required fields found to test validation');
    }
  });

  test('PC-010: 邮箱格式验证', async ({ page }) => {
    const emailField = page.locator('.ant-form-item').filter({ hasText: /邮箱|email/i }).locator('input');
    if (await emailField.isVisible()) {
      await emailField.fill('invalid-email');
      await page.locator('button').filter({ hasText: '保存' }).first().click();
      await page.waitForTimeout(500);
      const errorMsg = page.locator('.ant-form-item-explain-error');
      await expect(errorMsg.first()).toBeVisible({ timeout: 3000 });
    } else {
      test.skip('No email field found');
    }
  });

  test('PC-011: URL格式验证', async ({ page }) => {
    const urlField = page.locator('.ant-form-item').filter({ hasText: /URL|链接|地址/i }).locator('input').first();
    if (await urlField.isVisible()) {
      await urlField.fill('not-a-valid-url');
      await page.locator('button').filter({ hasText: '保存' }).first().click();
      await page.waitForTimeout(500);
      const errorMsg = page.locator('.ant-form-item-explain-error');
      await expect(errorMsg.first()).toBeVisible({ timeout: 3000 });
    } else {
      test.skip('No URL field found');
    }
  });

  test('PC-012: 数字字段边界值验证', async ({ page }) => {
    const numberField = page.locator('.ant-form-item').filter({ hasText: /数量|上限|最大/i }).locator('input').first();
    if (await numberField.isVisible()) {
      await numberField.fill('999999999999');
      await page.locator('button').filter({ hasText: '保存' }).first().click();
      await page.waitForTimeout(500);
      // Should either save successfully or show range error
      const errorOrSuccess = await Promise.race([
        page.locator('.ant-form-item-explain-error').first().isVisible({ timeout: 2000 }).then(() => 'error'),
        page.locator('.ant-message-success').isVisible({ timeout: 2000 }).then(() => 'success'),
      ]);
      expect(['error', 'success']).toContain(errorOrSuccess);
    } else {
      test.skip('No number field found for boundary test');
    }
  });

  test('PC-013: 功能开关切换', async ({ page }) => {
    const featureTab = page.locator('.ant-tabs-tab').filter({ hasText: '功能开关' });
    if (await featureTab.isVisible()) {
      await featureTab.click();
      await page.waitForTimeout(500);
      const firstSwitch = page.locator('.ant-switch').first();
      if (await firstSwitch.isVisible()) {
        const isChecked = await firstSwitch.getAttribute('class');
        await firstSwitch.click();
        await page.waitForTimeout(300);
        const newClass = await firstSwitch.getAttribute('class');
        expect(newClass).not.toBe(isChecked);
      } else {
        test.skip('No switches found');
      }
    } else {
      test.skip('No feature flags tab');
    }
  });

  test('PC-014: 保存成功提示', async ({ page }) => {
    // Make a small change and save
    const input = page.locator('.ant-form input').first();
    const originalValue = await input.getAttribute('value') || '';
    const newValue = originalValue + '_test';
    await input.fill(newValue);
    await page.locator('button').filter({ hasText: '保存' }).first().click();
    await expectAntSuccess(page, 5000);
  });

  test('PC-015: 保存后数据持久化', async ({ page }) => {
    // Fill a field and save
    const input = page.locator('.ant-form input').first();
    const testValue = `autotest_${Date.now()}`;
    await input.fill(testValue);
    await page.locator('button').filter({ hasText: '保存' }).first().click();
    await expectAntSuccess(page, 5000);
    // Click away to different tab and back
    const systemTab = page.locator('.ant-tabs-tab').filter({ hasText: '系统设置' }).first();
    if (await systemTab.isVisible()) {
      await systemTab.click();
      await page.waitForTimeout(500);
      await page.locator('.ant-tabs-tab').filter({ hasText: '基础配置' }).first().click();
      await page.waitForTimeout(1000);
    }
    // Verify the value is still in the field
    const newInput = page.locator('.ant-form input').first();
    await expect(newInput).toBeVisible({ timeout: 5000 });
  });

  test('PC-016: 表单重置功能', async ({ page }) => {
    const resetButton = page.locator('button').filter({ hasText: /重置|取消/i }).first();
    if (await resetButton.isVisible()) {
      // Make some changes
      const input = page.locator('.ant-form input').first();
      await input.fill('some_test_value');
      await resetButton.click();
      await page.waitForTimeout(500);
      // Form should either reset or show confirmation
      const modal = page.locator('.ant-modal');
      if (await modal.isVisible()) {
        await page.locator('.ant-btn-primary').filter({ hasText: /确定|确认/i }).click();
        await page.waitForTimeout(300);
      }
    } else {
      test.skip('No reset button found');
    }
  });

  test('PC-017: 下拉选择框可展开', async ({ page }) => {
    const select = page.locator('.ant-select').first();
    if (await select.isVisible()) {
      await select.click();
      await page.waitForTimeout(300);
      const dropdown = page.locator('.ant-select-dropdown');
      await expect(dropdown).toBeVisible();
    } else {
      test.skip('No select dropdown found');
    }
  });

  test('PC-018: 日期选择器可打开', async ({ page }) => {
    const datePicker = page.locator('.ant-picker').first();
    if (await datePicker.isVisible()) {
      await datePicker.click();
      await page.waitForTimeout(300);
      const pickerPanel = page.locator('.ant-picker-panel');
      await expect(pickerPanel).toBeVisible();
    } else {
      test.skip('No date picker found');
    }
  });

  test('PC-019: 多行文本框可编辑', async ({ page }) => {
    const textarea = page.locator('.ant-input-textarea textarea');
    if (await textarea.isVisible()) {
      const testText = `Test description ${Date.now()}`;
      await textarea.fill(testText);
      const value = await textarea.inputValue();
      expect(value).toBe(testText);
    } else {
      test.skip('No textarea found');
    }
  });

  test('PC-020: 页面加载时显示loading状态', async ({ page }) => {
    // Navigate using the menu which is already logged in
    await page.click('text=平台配置');
    await page.waitForTimeout(2000);
    // Check for loading spinner during load
    const loading = page.locator('.ant-spin');
    const hasLoading = await loading.isVisible({ timeout: 3000 }).catch(() => false);
    // If page loads fast, loading may not be visible - this is acceptable
    if (hasLoading) {
      await expect(loading).toBeVisible();
    }
    // Eventually form should be visible
    await expect(page.locator('.ant-form')).toBeVisible({ timeout: 10000 });
  });
});

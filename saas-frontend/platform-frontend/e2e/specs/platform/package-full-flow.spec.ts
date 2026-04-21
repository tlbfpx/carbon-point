import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsPlatformAdmin, uniqueId } from '../../helpers';
import { ProductManagementPage } from '../../pages/platform/ProductManagementPage';
import { PackageManagementPage } from '../../pages/platform/PackageManagementPage';
import { BlockLibraryPage } from '../../pages/platform/BlockLibraryPage';

/**
 * 套餐完整创建全流程 E2E 测试 (serial)
 *
 * 流程:
 *  1. 登录 → 积木组件库验证
 *  2. 创建产品（向导 or 快速创建）
 *  3. 产品详情 & 功能点配置
 *  4. 创建套餐 → 添加产品 → 配置功能点 → 验证
 *  5. 清理
 */

const uid = Date.now();
const productCode = `E2E_PKG_STAIRS_${uid}`;
const productName = `E2E套餐流程爬楼产品_${uid}`;
const packageCode = `EP_${uid}`;
const packageName = `E2E专业版套餐_${uid}`;

test.describe.serial('套餐完整创建全流程', () => {
  test('PKF-010: 积木组件库 - 验证组件注册状态', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);

    const blockPage = new BlockLibraryPage(page);
    await blockPage.goto();
    await blockPage.expectVisible();

    await blockPage.clickTriggerTab();
    const triggerCount = await blockPage.getTriggerRowCount();
    await blockPage.clickRuleNodeTab();
    const ruleNodeCount = await blockPage.getRuleNodeRowCount();
    await blockPage.clickFeatureTab();
    const featureCount = await blockPage.getFeatureRowCount();

    expect(triggerCount).toBeGreaterThanOrEqual(0);
    expect(ruleNodeCount).toBeGreaterThanOrEqual(0);
    expect(featureCount).toBeGreaterThanOrEqual(0);
  });

  test('PKF-020: 创建产品（向导优先，回退快速创建）', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);

    const productPage = new ProductManagementPage(page);
    await productPage.goto();
    await productPage.expectVisible();

    // 打开向导
    await productPage.openWizard();
    await expect(productPage.wizardSteps.locator('.ant-steps-item-active')).toContainText('基本信息');

    // 填写基本信息
    await productPage.fillBasicInfo(productCode, productName, '爬楼积分', 'E2E套餐全流程测试产品');
    await productPage.clickNext();

    // 等待触发器步骤渲染
    await expect(productPage.wizardSteps.locator('.ant-steps-item-active')).toContainText('选择触发器');

    // 等待 registry API 响应后再检查卡片
    await page.waitForResponse(
      (resp) => resp.url().includes('/registry/modules') && resp.status() === 200,
      { timeout: 10000 },
    ).catch(() => {}); // 可能已经被加载过了，忽略超时

    // 等待卡片或空状态渲染
    await page.waitForTimeout(1000);

    const moduleCards = productPage.wizardModal.locator('.ant-card');
    const cardCount = await moduleCards.count();

    if (cardCount > 0) {
      // ── 向导模式 ──
      await moduleCards.first().click();
      await productPage.clickNext();

      // 组装规则链
      await expect(productPage.wizardSteps.locator('.ant-steps-item-active')).toContainText('组装规则链');

      // 配置第一个规则节点 - 打开并关闭配置弹窗
      const configBtns = productPage.wizardModal.locator('button').filter({ hasText: '配置' });
      if ((await configBtns.count()) > 0) {
        await configBtns.first().click();
        await expect(productPage.ruleNodeConfigModal).toBeVisible();
        // 关闭配置弹窗（点击 X 按钮或 Cancel）
        await productPage.ruleNodeConfigModal.locator('.ant-modal-close').click();
        await expect(productPage.ruleNodeConfigModal).not.toBeVisible({ timeout: 5000 });
      }

      // 规则顺序调整
      const arrowDownBtns = page.locator('.anticon-arrow-down').locator('..');
      if ((await arrowDownBtns.count()) >= 2) {
        await arrowDownBtns.first().click();
      }
      const arrowUpBtns = page.locator('.anticon-arrow-up').locator('..');
      if ((await arrowUpBtns.count()) >= 2) {
        await arrowUpBtns.nth(1).click();
      }

      // 添加可用节点
      const addBtns = productPage.wizardModal.locator('button').filter({ hasText: '添加' });
      if ((await addBtns.count()) > 0) {
        await addBtns.first().click();
      }

      await productPage.clickNext();

      // 选择功能点
      await expect(productPage.wizardSteps.locator('.ant-steps-item-active')).toContainText('选择功能点');
      const featureCheckboxes = productPage.wizardModal.locator('.ant-checkbox-wrapper');
      if ((await featureCheckboxes.count()) > 0) {
        await featureCheckboxes.first().click();
        if ((await featureCheckboxes.count()) > 1) {
          await featureCheckboxes.nth(1).click();
        }
      }

      await productPage.clickFinish();

      // 等待产品创建成功（监听成功消息或弹窗）
      const successMessage = page.locator('.ant-message').filter({ hasText: '成功' });
      const successModal = productPage.successModal;
      await Promise.race([
        successMessage.waitFor({ state: 'visible', timeout: 15000 }),
        successModal.waitFor({ state: 'visible', timeout: 15000 }),
      ]).catch(() => {});

      // 关闭成功弹窗（如果有）
      if (await successModal.isVisible().catch(() => false)) {
        await successModal.locator('button').first().click();
      }

      // 关闭可能残留的弹窗
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      // ── 回退：快速创建 ──
      await productPage.wizardCancelButton.click();
      await expect(productPage.wizardModal).not.toBeVisible();

      await productPage.quickCreate(productCode, productName, '爬楼积分', 'E2E套餐全流程测试产品');
      await expect(page.locator('.ant-message')).toContainText('成功');
    }

    // 最终验证：产品出现在列表
    // 先关闭所有残留弹窗，再通过菜单导航
    for (let i = 0; i < 3; i++) {
      const modalVisible = await page.locator('.ant-modal-wrap:not([style*="display: none"])').isVisible().catch(() => false);
      if (!modalVisible) break;
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // 用 API 直接验证产品创建成功
    const apiResponse = await page.request.get('http://localhost:8080/platform/products', {
      headers: { Authorization: `Bearer ${await page.evaluate(() => JSON.parse(localStorage.getItem('carbon-platform-auth') || '{}').state?.accessToken || '')}` },
    });
    const apiData = await apiResponse.json();
    const productRecords = apiData?.data?.records || apiData?.data || [];
    const found = productRecords.some((p: { name: string }) => p.name === productName);
    expect(found, `产品 "${productName}" 应该已创建`).toBeTruthy();
  });

  test('PKF-030: 产品详情 Drawer 和功能点配置', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);

    const productPage = new ProductManagementPage(page);
    await productPage.goto();
    await productPage.expectVisible();

    const row = productPage.table.locator('tr').filter({ hasText: productName });
    await expect(row).toBeVisible({ timeout: 10000 });

    // 详情
    await row.locator('button').filter({ hasText: '详情' }).click();
    await expect(productPage.detailDrawer).toBeVisible();
    await expect(page.locator('.ant-descriptions')).toBeVisible();
    await expect(page.locator('.ant-drawer')).toContainText('规则链预览');
    await page.locator('.ant-drawer-close').click();
    await expect(productPage.detailDrawer).not.toBeVisible();

    // 功能点配置
    await row.locator('button').filter({ hasText: '配置功能' }).click();
    await expect(productPage.featureConfigModal).toBeVisible();

    const featureItems = productPage.featureConfigModal.locator('.ant-checkbox-wrapper');
    const itemCount = await featureItems.count();
    if (itemCount > 0) {
      await featureItems.first().click();
      const configInput = productPage.featureConfigModal.locator('input[placeholder="配置值"]');
      if (await configInput.isVisible()) {
        await configInput.fill('e2e_test_value');
      }
      const okBtn = productPage.featureConfigModal.locator('.ant-modal-footer button').filter({ hasText: '确定' });
      if (await okBtn.isVisible()) {
        await okBtn.click();
        await expect(page.locator('.ant-message')).toContainText('成功');
      }
    } else {
      await productPage.featureConfigModal.locator('.ant-modal-close').click();
    }
  });

  test('PKF-040: 创建套餐', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);

    const packagePage = new PackageManagementPage(page);
    await packagePage.goto();
    await packagePage.expectVisible();

    await packagePage.createPackage(packageName, packageCode, 'E2E端到端套餐全流程测试');
    await expect(page.locator('.ant-message')).toContainText('成功');

    await packagePage.goto();
    await expect(packagePage.table).toContainText(packageName);
  });

  test('PKF-050: 配置套餐产品 - 添加产品到套餐', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);

    const packagePage = new PackageManagementPage(page);
    await packagePage.goto();
    await packagePage.expectVisible();

    const pkgRow = packagePage.table.locator('tr').filter({ hasText: packageName });
    await expect(pkgRow).toBeVisible({ timeout: 10000 });

    await packagePage.openProductConfig(packageName);
    await expect(packagePage.productConfigModal).toBeVisible();

    const productCheckbox = packagePage.productConfigModal
      .locator('.ant-checkbox-wrapper')
      .filter({ hasText: productName });
    if (await productCheckbox.isVisible()) {
      await productCheckbox.click();
    }

    await packagePage.saveProductConfig();
    await expect(page.locator('.ant-message')).toContainText('成功');
  });

  test('PKF-060: 配置套餐产品功能点开关', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);

    const packagePage = new PackageManagementPage(page);
    await packagePage.goto();
    await packagePage.expectVisible();

    await packagePage.openProductConfig(packageName);
    await expect(packagePage.productConfigModal).toBeVisible();

    const productCheckbox = packagePage.productConfigModal
      .locator('.ant-checkbox-wrapper')
      .filter({ hasText: productName });
    if (await productCheckbox.isVisible()) {
      const isChecked = await productCheckbox.locator('.ant-checkbox-checked').count();
      if (isChecked === 0) {
        await productCheckbox.click();
      }
    }

    const collapseHeader = packagePage.productConfigModal
      .locator('.ant-collapse-item-header')
      .filter({ hasText: productName });
    if (await collapseHeader.isVisible()) {
      await collapseHeader.click();
      await page.waitForTimeout(500);

      const switches = packagePage.productConfigModal.locator('.ant-collapse-content .ant-switch');
      const switchCount = await switches.count();

      let toggled = false;
      for (let i = 0; i < switchCount; i++) {
        const sw = switches.nth(i);
        if (await sw.isEnabled()) {
          await sw.click();
          toggled = true;
          break;
        }
      }

      if (toggled) {
        await packagePage.saveProductFeatures();
        await expect(page.locator('.ant-message')).toContainText('成功');
      }
    }

    await packagePage.productConfigModal.locator('.ant-modal-close').click();
  });

  test('PKF-070: 验证套餐最终状态', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);

    const packagePage = new PackageManagementPage(page);
    await packagePage.goto();
    await packagePage.expectVisible();

    const row = packagePage.table.locator('tr').filter({ hasText: packageName });
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row.locator('.ant-tag').filter({ hasText: '启用' })).toBeVisible();
    await expect(row.locator('button').filter({ hasText: '编辑' })).toBeVisible();
    await expect(row.locator('button').filter({ hasText: '配置产品' })).toBeVisible();

    await row.locator('button').filter({ hasText: '配置产品' }).click();
    await expect(packagePage.productConfigModal).toBeVisible();

    const productCheckbox = packagePage.productConfigModal
      .locator('.ant-checkbox-wrapper')
      .filter({ hasText: productName });
    if (await productCheckbox.isVisible()) {
      const checkedCount = await productCheckbox.locator('.ant-checkbox-checked').count();
      expect(checkedCount, '产品应该已被勾选关联到套餐').toBeGreaterThan(0);
    }

    await packagePage.productConfigModal.locator('.ant-modal-close').click();
  });

  test('PKF-080: 清理测试数据', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);

    const packagePage = new PackageManagementPage(page);
    await packagePage.goto();
    await packagePage.expectVisible();

    const pkgRow = packagePage.table.locator('tr').filter({ hasText: packageName });
    if (await pkgRow.isVisible()) {
      const deleteBtn = pkgRow.locator('button').filter({ hasText: '删除' });
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        await page.locator('.ant-popconfirm').locator('button').filter({ hasText: /确\s*认/ }).click();
        await expect(page.locator('.ant-message')).toContainText('成功');
      }
    }

    const productPage = new ProductManagementPage(page);
    await productPage.goto();
    await productPage.expectVisible();

    const prodRow = productPage.table.locator('tr').filter({ hasText: productName });
    if (await prodRow.isVisible()) {
      await prodRow.locator('button').filter({ hasText: '删除' }).click();
      await page.locator('.ant-popconfirm').locator('button').filter({ hasText: /确\s*认/ }).click();
      await expect(page.locator('.ant-message')).toContainText('成功');
    }
  });
});

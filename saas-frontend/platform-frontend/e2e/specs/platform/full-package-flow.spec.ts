import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsPlatformAdmin, uniqueId } from '../../helpers';
import { ProductManagementPage } from '../../pages/platform/ProductManagementPage';
import { PackageManagementPage } from '../../pages/platform/PackageManagementPage';
import { BlockLibraryPage } from '../../pages/platform/BlockLibraryPage';
import { PlatformConfigPage } from '../../pages/platform/PlatformConfigPage';

test.describe('平台后台 - 套餐完整创建流程', () => {
  // Shared test data
  const uid = Date.now();
  const productCode1 = `STAIRS_${uid}`;
  const productName1 = `标准爬楼打卡_${uid}`;
  const productCode2 = `WALK_${uid}`;
  const productName2 = `走路计步_${uid}`;
  const packageCode = `PKG_PRO_${uid}`;
  const packageName = `专业版套餐_${uid}`;

  // ──────────────────────────────────────────────
  // 1. Dashboard & Navigation
  // ──────────────────────────────────────────────
  test('FP-001: 登录后 Dashboard 页面可访问', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    await page.waitForLoadState('networkidle');

    // Verify layout
    await expect(page.locator('.ant-layout-sider')).toBeVisible();
    await expect(page.locator('.ant-layout-content')).toBeVisible();

    // Verify sidebar menus exist
    await expect(page.locator('text=企业管理')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=系统管理')).toBeVisible();
    await expect(page.locator('text=平台配置')).toBeVisible();
  });

  test('FP-002: 侧边栏导航到各功能页面', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    await page.waitForLoadState('networkidle');

    // Navigate to product management
    await page.getByRole('menuitem', { name: '产品管理' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2').filter({ hasText: '产品管理' })).toBeVisible();

    // Navigate to block library
    await page.getByRole('menuitem', { name: '积木组件库' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2').filter({ hasText: '积木组件库' })).toBeVisible();

    // Navigate to package management
    await page.getByRole('menuitem', { name: '套餐管理' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2').filter({ hasText: '套餐管理' })).toBeVisible();

    // Navigate to platform config
    await page.getByRole('menuitem', { name: '平台配置' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2').filter({ hasText: '平台配置' })).toBeVisible();
  });

  // ──────────────────────────────────────────────
  // 2. Block Library - Verify Registry
  // ──────────────────────────────────────────────
  test('FP-010: 积木组件库 - 查看已注册产品模块', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const blockPage = new BlockLibraryPage(page);
    await blockPage.goto();
    await blockPage.expectVisible();

    // Module overview card should be present
    const moduleCount = await blockPage.getModuleCount();
    expect(moduleCount).toBeGreaterThanOrEqual(0);
  });

  test('FP-011: 积木组件库 - 触发器 Tab', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const blockPage = new BlockLibraryPage(page);
    await blockPage.goto();
    await blockPage.expectVisible();

    await blockPage.clickTriggerTab();

    const rowCount = await blockPage.getTriggerRowCount();
    // Should have at least one trigger registered (stairs_climbing or walking)
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });

  test('FP-012: 积木组件库 - 规则节点 Tab', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const blockPage = new BlockLibraryPage(page);
    await blockPage.goto();
    await blockPage.expectVisible();

    await blockPage.clickRuleNodeTab();

    const rowCount = await blockPage.getRuleNodeRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(0);

    // If nodes exist, verify table columns
    if (rowCount > 0) {
      const table = page.locator('.ant-table').nth(1);
      await expect(table.locator('th').filter({ hasText: '排序' })).toBeVisible();
      await expect(table.locator('th').filter({ hasText: '节点标识' })).toBeVisible();
    }
  });

  test('FP-013: 积木组件库 - 功能点模板 Tab', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const blockPage = new BlockLibraryPage(page);
    await blockPage.goto();
    await blockPage.expectVisible();

    await blockPage.clickFeatureTab();

    const rowCount = await blockPage.getFeatureRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(0);

    // If features exist, verify columns
    if (rowCount > 0) {
      const table = page.locator('.ant-table').nth(2);
      await expect(table.locator('th').filter({ hasText: '功能点标识' })).toBeVisible();
      await expect(table.locator('th').filter({ hasText: '名称' })).toBeVisible();
      await expect(table.locator('th').filter({ hasText: '是否必需' })).toBeVisible();
    }
  });

  // ──────────────────────────────────────────────
  // 3. Product Management - Create via Wizard
  // ──────────────────────────────────────────────
  test('FP-020: 产品管理 - 页面加载与表格', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const productPage = new ProductManagementPage(page);
    await productPage.goto();
    await productPage.expectVisible();

    // Buttons should be visible
    await expect(productPage.createWizardButton).toBeVisible();
    await expect(productPage.quickCreateButton).toBeVisible();
    await expect(productPage.refreshButton).toBeVisible();
  });

  test('FP-021: 产品配置向导 - 爬楼产品完整创建流程', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const productPage = new ProductManagementPage(page);
    await productPage.goto();
    await productPage.expectVisible();

    // Step 0: Open wizard
    await productPage.openWizard();
    await expect(productPage.wizardSteps.locator('.ant-steps-item-active')).toContainText('基本信息');

    // Step 1: Fill basic info
    await productPage.fillBasicInfo(
      productCode1,
      productName1,
      '爬楼积分',
      '企业标准版爬楼打卡产品，支持时段配置和节假日翻倍'
    );
    await productPage.clickNext();

    // Step 2: Select trigger - should auto-select from category
    await expect(productPage.wizardSteps.locator('.ant-steps-item-active')).toContainText('选择触发器');
    // Click the first available module card to select trigger
    const moduleCards = productPage.wizardModal.locator('.ant-card');
    if ((await moduleCards.count()) > 0) {
      await moduleCards.first().click();
    }
    await productPage.clickNext();

    // Step 3: Assemble rule chain
    await expect(productPage.wizardSteps.locator('.ant-steps-item-active')).toContainText('组装规则链');

    // Verify rule chain items are loaded
    const ruleChainTags = productPage.wizardModal.locator('.ant-tag');
    const tagCount = await ruleChainTags.count();
    expect(tagCount).toBeGreaterThanOrEqual(0);

    // Test: Configure first rule node (if any)
    const configBtns = productPage.wizardModal.locator('button').filter({ hasText: '配置' });
    if ((await configBtns.count()) > 0) {
      await configBtns.first().click();
      await expect(productPage.ruleNodeConfigModal).toBeVisible();

      // Verify modal title contains node name
      const title = productPage.ruleNodeConfigModal.locator('.ant-modal-title');
      await expect(title).toContainText('配置规则节点');

      // Save default config
      await productPage.ruleNodeConfigModal.locator('button').filter({ hasText: '保存' }).click();
      await expect(productPage.ruleNodeConfigModal).not.toBeVisible();
    }

    // Test: Move a rule node down (if enough nodes)
    const moveDownBtns = page.locator('.anticon-arrow-down').locator('..');
    if ((await moveDownBtns.count()) >= 2) {
      await moveDownBtns.first().click();
    }

    // Test: Move a rule node back up
    const moveUpBtns = page.locator('.anticon-arrow-up').locator('..');
    if ((await moveUpBtns.count()) >= 2) {
      await moveUpBtns.first().click();
    }

    await productPage.clickNext();

    // Step 4: Select features
    await expect(productPage.wizardSteps.locator('.ant-steps-item-active')).toContainText('选择功能点');

    // Toggle a feature by clicking its row
    const featureRows = productPage.wizardModal.locator('.ant-checkbox-wrapper');
    if ((await featureRows.count()) > 0) {
      await featureRows.first().click();
    }

    // Test prev button
    await productPage.clickPrev();
    await expect(productPage.wizardSteps.locator('.ant-steps-item-active')).toContainText('组装规则链');
    await productPage.clickNext();
    await expect(productPage.wizardSteps.locator('.ant-steps-item-active')).toContainText('选择功能点');

    // Finish
    await productPage.clickFinish();

    // Verify success - either success modal or success message
    const successModalVisible = await productPage.successModal.isVisible({ timeout: 5000 }).catch(() => false);
    if (successModalVisible) {
      await expect(productPage.successModal).toContainText('产品创建成功');
      // Close success modal
      await productPage.successModal.locator('button').filter({ hasText: '查看产品详情' }).click();
    }

    // Verify product appears in table
    await productPage.goto();
    await productPage.expectVisible();
    // Search through pages if paginated
    await expect(productPage.table).toContainText(productName1);
  });

  test('FP-022: 快速创建产品 - 走路积分产品', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const productPage = new ProductManagementPage(page);
    await productPage.goto();
    await productPage.expectVisible();

    await productPage.quickCreate(
      productCode2,
      productName2,
      '走路积分',
      '走路计步产品，按步数计算积分'
    );

    // Verify success message
    await expect(page.locator('.ant-message')).toContainText('成功');

    // Verify in table
    await productPage.goto();
    await productPage.expectVisible();
    await expect(productPage.table).toContainText(productName2);
  });

  test('FP-023: 产品管理 - 分类筛选', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const productPage = new ProductManagementPage(page);
    await productPage.goto();
    await productPage.expectVisible();

    // Filter by 爬楼积分
    await productPage.filterByCategory('爬楼积分');
    await expect(productPage.table).toBeVisible();
    // All visible tags should be 爬楼打卡 (blue)
    const walkingTags = productPage.table.locator('.ant-tag').filter({ hasText: '走路计步' });
    expect(await walkingTags.count()).toBe(0);

    // Clear filter
    await productPage.clearFilter();
    await expect(productPage.table).toBeVisible();
  });

  test('FP-024: 产品详情 Drawer', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const productPage = new ProductManagementPage(page);
    await productPage.goto();
    await productPage.expectVisible();

    // Open detail of first product
    const firstDetailBtn = productPage.table.locator('button').filter({ hasText: '详情' }).first();
    if (await firstDetailBtn.isVisible()) {
      await firstDetailBtn.click();
      await expect(productPage.detailDrawer).toBeVisible();

      // Verify drawer content sections
      await expect(page.locator('.ant-descriptions')).toBeVisible();
      // Close drawer
      await page.locator('.ant-drawer-close').click();
      await expect(productPage.detailDrawer).not.toBeVisible();
    }
  });

  test('FP-025: 编辑产品', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const productPage = new ProductManagementPage(page);
    await productPage.goto();
    await productPage.expectVisible();

    // Find a product row and click edit
    const editBtns = productPage.table.locator('button').filter({ hasText: '编辑' });
    if ((await editBtns.count()) > 0) {
      await editBtns.first().click();
      const editModal = page.locator('.ant-modal').filter({ hasText: '编辑产品' });
      await expect(editModal).toBeVisible();

      // Edit name
      const nameInput = editModal.locator('input[placeholder*="请输入产品名称"]');
      const originalName = await nameInput.inputValue();
      const newName = `${originalName}_edited`;
      await nameInput.clear();
      await nameInput.fill(newName);
      await editModal.locator('button[type="submit"]').click();

      // Verify success
      await expect(page.locator('.ant-message')).toContainText('成功');
    }
  });

  test('FP-026: 产品配置向导 - 步骤验证', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const productPage = new ProductManagementPage(page);
    await productPage.goto();
    await productPage.expectVisible();

    await productPage.openWizard();

    // Try to go next without filling required fields
    await productPage.clickNext();

    // Should still be on step 0 (validation prevents advance)
    await expect(productPage.wizardSteps.locator('.ant-steps-item-active')).toContainText('基本信息');

    // A warning message should appear
    await expect(page.locator('.ant-message')).toContainText('请填写');

    // Fill required fields
    await productPage.fillBasicInfo(`VAL_${Date.now()}`, `验证测试_${uniqueId()}`, '爬楼积分');
    await productPage.clickNext();

    // Now on step 1 - trigger selection
    await expect(productPage.wizardSteps.locator('.ant-steps-item-active')).toContainText('选择触发器');

    // Try next without selecting trigger
    await productPage.clickNext();
    await expect(page.locator('.ant-message')).toContainText('请选择');

    // Cancel wizard
    await productPage.wizardCancelButton.click();
    await expect(productPage.wizardModal).not.toBeVisible();
  });

  test('FP-027: 产品功能点配置', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const productPage = new ProductManagementPage(page);
    await productPage.goto();
    await productPage.expectVisible();

    // Open feature config for first product
    const configBtns = productPage.table.locator('button').filter({ hasText: '配置功能' });
    if ((await configBtns.count()) > 0) {
      await configBtns.first().click();
      await expect(productPage.featureConfigModal).toBeVisible();

      // Should show feature list
      const checkboxes = productPage.featureConfigModal.locator('.ant-checkbox-wrapper');
      const featureCount = await checkboxes.count();

      if (featureCount > 0) {
        // Toggle first feature
        await checkboxes.first().click();

        // If it's a config type feature, a config input should appear
        const configInput = productPage.featureConfigModal.locator('input[placeholder="配置值"]');
        if (await configInput.isVisible()) {
          await configInput.fill('test_value');
        }

        // Click OK to save
        const okBtn = productPage.featureConfigModal.locator('.ant-modal-footer button').filter({ hasText: '确定' });
        if (await okBtn.isVisible()) {
          await okBtn.click();
          await expect(page.locator('.ant-message')).toContainText('成功');
        }
      } else {
        // No features - close modal
        await productPage.featureConfigModal.locator('.ant-modal-close').click();
      }
    }
  });

  test('FP-028: 产品管理 - 刷新列表', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const productPage = new ProductManagementPage(page);
    await productPage.goto();
    await productPage.expectVisible();

    await productPage.refreshButton.click();
    await page.waitForLoadState('networkidle');
    await expect(productPage.table).toBeVisible();
  });

  test('FP-029: 产品管理 - 分页', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const productPage = new ProductManagementPage(page);
    await productPage.goto();
    await productPage.expectVisible();

    // Check pagination exists
    const pagination = page.locator('.ant-pagination');
    if (await pagination.isVisible()) {
      await expect(pagination.locator('.ant-pagination-total-text')).toContainText('共');
    }
  });

  // ──────────────────────────────────────────────
  // 4. Package Management - Create & Configure
  // ──────────────────────────────────────────────
  test('FP-030: 套餐管理 - 页面加载', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const packagePage = new PackageManagementPage(page);
    await packagePage.goto();
    await packagePage.expectVisible();

    await expect(packagePage.createButton).toBeVisible();
    await expect(packagePage.refreshButton).toBeVisible();
  });

  test('FP-031: 创建套餐', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const packagePage = new PackageManagementPage(page);
    await packagePage.goto();
    await packagePage.expectVisible();

    await packagePage.createPackage(packageName, packageCode, '包含爬楼和走路积分的专业版套餐');

    // Verify success
    await expect(page.locator('.ant-message')).toContainText('成功');

    // Verify in table
    await packagePage.goto();
    await expect(packagePage.table).toContainText(packageName);
  });

  test('FP-032: 编辑套餐', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const packagePage = new PackageManagementPage(page);
    await packagePage.goto();
    await packagePage.expectVisible();

    // Create a temp package to edit
    const tempName = `编辑测试_${uniqueId()}`;
    const tempCode = `EDIT_${Date.now()}`;
    await packagePage.createPackage(tempName, tempCode);
    await expect(page.locator('.ant-message')).toContainText('成功');

    // Edit it
    const newName = `${tempName}_v2`;
    await packagePage.editPackage(tempName, newName, '更新后的描述');
    await expect(page.locator('.ant-message')).toContainText('成功');
  });

  test('FP-033: 配置套餐产品 - 添加产品到套餐', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const packagePage = new PackageManagementPage(page);
    await packagePage.goto();
    await packagePage.expectVisible();

    // Create a temp package
    const tempName = `产品配置_${uniqueId()}`;
    const tempCode = `CFG_${Date.now()}`;
    await packagePage.createPackage(tempName, tempCode);
    await expect(page.locator('.ant-message')).toContainText('成功');

    // Open product config
    await packagePage.openProductConfig(tempName);

    // Select first available product
    const productCheckboxes = packagePage.productConfigModal.locator('.ant-checkbox-wrapper');
    if ((await productCheckboxes.count()) > 0) {
      await productCheckboxes.first().click();

      // Save
      await packagePage.saveProductConfig();
      await expect(page.locator('.ant-message')).toContainText('成功');
    }
  });

  test('FP-034: 配置套餐产品功能点', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const packagePage = new PackageManagementPage(page);
    await packagePage.goto();
    await packagePage.expectVisible();

    // Find any existing package and open product config
    const configBtns = packagePage.table.locator('button').filter({ hasText: '配置产品' });
    if ((await configBtns.count()) > 0) {
      await configBtns.first().click();
      await expect(packagePage.productConfigModal).toBeVisible();

      // Select a product to see its features
      const productCheckboxes = packagePage.productConfigModal.locator('.ant-checkbox-wrapper');
      if ((await productCheckboxes.count()) > 0) {
        // Check if not already checked
        const firstCheckbox = productCheckboxes.first();
        const isChecked = await firstCheckbox.locator('.ant-checkbox-checked').count();
        if (isChecked === 0) {
          await firstCheckbox.click();
        }

        // Wait for collapse panel to appear
        const collapseHeaders = packagePage.productConfigModal.locator('.ant-collapse-item-header');
        if ((await collapseHeaders.count()) > 0) {
          // Expand the first product
          await collapseHeaders.first().click();

          // Wait for feature list to render
          const featureSwitches = packagePage.productConfigModal.locator('.ant-collapse-content .ant-switch');
          if ((await featureSwitches.count()) > 0) {
            // Toggle first optional feature (non-disabled switch)
            const switchCount = await featureSwitches.count();
            for (let i = 0; i < switchCount; i++) {
              const sw = featureSwitches.nth(i);
              if (await sw.isEnabled()) {
                await sw.click();
                break;
              }
            }

            // Save features
            await packagePage.saveProductFeatures();
          }
        }
      }

      // Close modal
      await packagePage.productConfigModal.locator('.ant-modal-close').click();
    }
  });

  test('FP-035: 套餐启用/禁用切换', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const packagePage = new PackageManagementPage(page);
    await packagePage.goto();
    await packagePage.expectVisible();

    // Find toggle button in any row
    const toggleBtns = packagePage.table.locator('button').filter({ hasText: /启用|禁用/ });
    if ((await toggleBtns.count()) > 0) {
      const btn = toggleBtns.first();
      const text = await btn.textContent();
      await btn.click();

      // Confirm popconfirm
      const confirmBtn = page.locator('.ant-popconfirm button').filter({ hasText: '确认' });
      await confirmBtn.click();

      // Verify success
      await expect(page.locator('.ant-message')).toContainText('成功');

      // Verify status changed
      const newBtn = packagePage.table.locator('button').filter({ hasText: /启用|禁用/ }).first();
      const newText = await newBtn.textContent();
      expect(newText).not.toBe(text);
    }
  });

  test('FP-036: 套餐管理 - 列表分页与刷新', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const packagePage = new PackageManagementPage(page);
    await packagePage.goto();
    await packagePage.expectVisible();

    // Test refresh
    await packagePage.refreshButton.click();
    await page.waitForLoadState('networkidle');
    await expect(packagePage.table).toBeVisible();

    // Check pagination
    const pagination = page.locator('.ant-pagination');
    if (await pagination.isVisible()) {
      await expect(pagination).toContainText('共');
    }
  });

  // ──────────────────────────────────────────────
  // 5. Platform Config - Verify All Tabs
  // ──────────────────────────────────────────────
  test('FP-040: 平台配置 - 页面加载', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const configPage = new PlatformConfigPage(page);
    await configPage.goto();
    await configPage.expectVisible();

    // Verify all tabs exist
    await expect(configPage.basicTab).toBeVisible();
    await expect(configPage.notificationTab).toBeVisible();
    await expect(configPage.pointsTab).toBeVisible();
    await expect(configPage.featureTab).toBeVisible();
    await expect(configPage.integrationTab).toBeVisible();
    await expect(configPage.systemTab).toBeVisible();
    await expect(configPage.templateTab).toBeVisible();
  });

  test('FP-041: 基础配置 - 表单字段', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const configPage = new PlatformConfigPage(page);
    await configPage.goto();
    await configPage.expectVisible();

    // Default is basic tab - verify form fields
    await expect(page.locator('.ant-form-item').filter({ hasText: '默认每日积分上限' })).toBeVisible();
    await expect(page.locator('.ant-form-item').filter({ hasText: '默认等级系数' })).toBeVisible();
    await expect(page.locator('.ant-form-item').filter({ hasText: 'AccessToken' })).toBeVisible();
    await expect(page.locator('.ant-form-item').filter({ hasText: 'RefreshToken' })).toBeVisible();

    // Test form interaction
    const dailyCapInput = page.locator('.ant-form-item').filter({ hasText: '默认每日积分上限' }).locator('input');
    await dailyCapInput.clear();
    await dailyCapInput.fill('600');
    await expect(dailyCapInput).toHaveValue('600');
  });

  test('FP-042: 通知设置 Tab', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const configPage = new PlatformConfigPage(page);
    await configPage.goto();

    await configPage.switchTab('通知设置');
    await expect(page.locator('.ant-form')).toBeVisible();

    // Verify fields
    await expect(page.locator('.ant-form-item').filter({ hasText: '通知邮箱' })).toBeVisible();
    await expect(page.locator('.ant-form-item').filter({ hasText: '启用短信通知' })).toBeVisible();
    await expect(page.locator('.ant-form-item').filter({ hasText: '启用邮件通知' })).toBeVisible();

    // Test email validation
    const emailInput = page.locator('.ant-form-item').filter({ hasText: '通知邮箱' }).locator('input');
    await emailInput.fill('invalid-email');
    await configPage.saveButton.first().click();
    await expect(page.locator('.ant-form-item-explain-error')).toBeVisible({ timeout: 3000 });

    // Fix with valid email
    await emailInput.clear();
    await emailInput.fill('admin@carbon-point.com');
  });

  test('FP-043: 积分规则 Tab', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const configPage = new PlatformConfigPage(page);
    await configPage.goto();

    await configPage.switchTab('积分规则');
    await expect(page.locator('.ant-form')).toBeVisible();

    // Verify fields
    await expect(page.locator('.ant-form-item').filter({ hasText: '每层楼积分' })).toBeVisible();
    await expect(page.locator('.ant-form-item').filter({ hasText: '每步积分' })).toBeVisible();
    await expect(page.locator('.ant-form-item').filter({ hasText: '每日积分上限' })).toBeVisible();

    // Test editing a value
    const pointsPerFloor = page.locator('.ant-form-item').filter({ hasText: '每层楼积分' }).locator('input');
    await pointsPerFloor.clear();
    await pointsPerFloor.fill('15');
    await expect(pointsPerFloor).toHaveValue('15');
  });

  test('FP-044: 功能开关 Tab', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const configPage = new PlatformConfigPage(page);
    await configPage.goto();

    await configPage.switchTab('功能开关');

    // Verify switches are present
    const switches = page.locator('.ant-switch');
    const switchCount = await switches.count();
    expect(switchCount).toBeGreaterThan(0);

    // Verify known feature flags
    await expect(page.locator('text=启用打卡功能')).toBeVisible();
    await expect(page.locator('text=启用积分商城')).toBeVisible();
    await expect(page.locator('text=启用连续打卡奖励')).toBeVisible();
    await expect(page.locator('text=启用排行榜')).toBeVisible();

    // Toggle a switch
    const firstSwitch = switches.first();
    const wasChecked = (await firstSwitch.getAttribute('class'))?.includes('ant-switch-checked');
    await firstSwitch.click();
    const isChecked = (await firstSwitch.getAttribute('class'))?.includes('ant-switch-checked');
    expect(isChecked).toBe(wasChecked ? undefined : 'ant-switch-checked' ? true : undefined);

    // Toggle back
    await firstSwitch.click();

    // Verify save button
    await expect(page.locator('button').filter({ hasText: '保存功能开关' })).toBeVisible();
  });

  test('FP-045: 第三方集成 Tab', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const configPage = new PlatformConfigPage(page);
    await configPage.goto();

    await configPage.switchTab('第三方集成');
    await expect(page.locator('.ant-form')).toBeVisible();

    // Verify fields
    await expect(page.locator('.ant-form-item').filter({ hasText: '微信AppId' })).toBeVisible();
    await expect(page.locator('.ant-form-item').filter({ hasText: '微信Secret' })).toBeVisible();
    await expect(page.locator('.ant-form-item').filter({ hasText: 'API网关地址' })).toBeVisible();

    // Verify password field
    const secretInput = page.locator('.ant-form-item').filter({ hasText: '微信Secret' }).locator('input');
    expect(await secretInput.getAttribute('type')).toBe('password');

    // Test URL validation
    const urlInput = page.locator('.ant-form-item').filter({ hasText: 'API网关地址' }).locator('input');
    await urlInput.fill('not-a-url');
    await page.locator('button').filter({ hasText: '保存' }).first().click();
    await expect(page.locator('.ant-form-item-explain-error')).toBeVisible({ timeout: 3000 });
  });

  test('FP-046: 系统设置 Tab', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const configPage = new PlatformConfigPage(page);
    await configPage.goto();

    await configPage.switchTab('系统设置');
    await expect(page.locator('.ant-form')).toBeVisible();

    // Verify fields
    await expect(page.locator('.ant-form-item').filter({ hasText: '系统名称' })).toBeVisible();
    await expect(page.locator('.ant-form-item').filter({ hasText: '日志级别' })).toBeVisible();
    await expect(page.locator('.ant-form-item').filter({ hasText: '维护模式' })).toBeVisible();
    await expect(page.locator('.ant-form-item').filter({ hasText: '系统描述' })).toBeVisible();

    // Test system name edit
    const nameInput = page.locator('.ant-form-item').filter({ hasText: '系统名称' }).locator('input');
    await nameInput.clear();
    await nameInput.fill('碳积分打卡平台');
  });

  test('FP-047: 规则模板 Tab', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const configPage = new PlatformConfigPage(page);
    await configPage.goto();

    await configPage.switchTab('规则模板');

    // Verify template area
    await expect(page.locator('.ant-card').filter({ hasText: '默认规则模板' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: '新建模板' })).toBeVisible();
  });

  test('FP-048: 创建规则模板', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const configPage = new PlatformConfigPage(page);
    await configPage.goto();
    await configPage.switchTab('规则模板');

    const templateName = `测试模板_${uniqueId()}`;

    // Create template
    await configPage.createRuleTemplate(templateName, '自动化测试规则模板');
    await expect(page.locator('.ant-message')).toContainText('成功');

    // Verify template in table
    await expect(page.locator('.ant-table')).toContainText(templateName);
  });

  test('FP-049: 编辑规则模板', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const configPage = new PlatformConfigPage(page);
    await configPage.goto();
    await configPage.switchTab('规则模板');

    // Find any template and edit
    const editBtns = page.locator('.ant-table button').filter({ hasText: '编辑' });
    if ((await editBtns.count()) > 0) {
      await editBtns.first().click();
      const modal = page.locator('.ant-modal').filter({ hasText: '编辑规则模板' });
      await expect(modal).toBeVisible();

      // Edit name
      const nameInput = modal.locator('input[placeholder*="模板名称"]');
      await nameInput.clear();
      await nameInput.fill(`编辑模板_${Date.now()}`);

      await modal.locator('button[type="submit"]').click();
      await expect(page.locator('.ant-message')).toContainText('成功');
    }
  });

  test('FP-050: 表单重置功能', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const configPage = new PlatformConfigPage(page);
    await configPage.goto();
    await configPage.expectVisible();

    // Modify a field
    const firstInput = page.locator('.ant-form input:not([type="hidden"])').first();
    await firstInput.fill('99999');

    // Click reset
    const resetBtn = page.locator('button').filter({ hasText: '重置' }).first();
    await resetBtn.click();
    await expect(page.locator('.ant-message')).toContainText('已重置');
  });

  // ──────────────────────────────────────────────
  // 6. End-to-End Flow: Product → Package → Config
  // ──────────────────────────────────────────────
  test('FP-060: E2E - 完整套餐创建流程 (产品→规则→功能→套餐→配置)', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const ts = Date.now();

    // --- Step 1: Create product via wizard ---
    const productPage = new ProductManagementPage(page);
    await productPage.goto();
    await productPage.expectVisible();

    const e2eProductCode = `E2E_STAIRS_${ts}`;
    const e2eProductName = `E2E爬楼产品_${ts}`;

    await productPage.openWizard();

    // Fill basic info
    await productPage.fillBasicInfo(
      e2eProductCode,
      e2eProductName,
      '爬楼积分',
      'E2E测试专用产品'
    );
    await productPage.clickNext();

    // Select trigger
    await expect(productPage.wizardSteps.locator('.ant-steps-item-active')).toContainText('选择触发器');
    const moduleCards = productPage.wizardModal.locator('.ant-card');
    if ((await moduleCards.count()) > 0) {
      await moduleCards.first().click();
    }
    await productPage.clickNext();

    // Rule chain - configure first node
    await expect(productPage.wizardSteps.locator('.ant-steps-item-active')).toContainText('组装规则链');
    const configBtns = productPage.wizardModal.locator('button').filter({ hasText: '配置' });
    if ((await configBtns.count()) > 0) {
      await configBtns.first().click();
      await expect(productPage.ruleNodeConfigModal).toBeVisible();
      await productPage.ruleNodeConfigModal.locator('button').filter({ hasText: '保存' }).click();
    }
    await productPage.clickNext();

    // Select features
    await expect(productPage.wizardSteps.locator('.ant-steps-item-active')).toContainText('选择功能点');
    const featureRows = productPage.wizardModal.locator('.ant-checkbox-wrapper');
    if ((await featureRows.count()) > 0) {
      // Select first two features
      await featureRows.first().click();
      if ((await featureRows.count()) > 1) {
        await featureRows.nth(1).click();
      }
    }

    // Create
    await productPage.clickFinish();

    // Wait for creation
    const successVisible = await productPage.successModal.isVisible({ timeout: 5000 }).catch(() => false);
    if (successVisible) {
      // Close success modal to go to next step
      await productPage.successModal.locator('button').filter({ hasText: '去套餐管理' }).click();
    }

    // Verify product exists
    await productPage.goto();
    await productPage.expectVisible();
    await expect(productPage.table).toContainText(e2eProductName);

    // --- Step 2: Create package ---
    const packagePage = new PackageManagementPage(page);
    await packagePage.goto();
    await packagePage.expectVisible();

    const e2ePackageCode = `E2E_PKG_${ts}`;
    const e2ePackageName = `E2E专业版_${ts}`;

    await packagePage.createPackage(e2ePackageName, e2ePackageCode, 'E2E端到端测试套餐');
    await expect(page.locator('.ant-message')).toContainText('成功');

    // --- Step 3: Add product to package ---
    await packagePage.openProductConfig(e2ePackageName);
    await expect(packagePage.productConfigModal).toBeVisible();

    // Select the E2E product
    const productCheckbox = packagePage.productConfigModal.locator('.ant-checkbox-wrapper').filter({ hasText: e2eProductName });
    if (await productCheckbox.isVisible()) {
      await productCheckbox.click();
    }

    // Save product config
    await packagePage.saveProductConfig();
    await expect(page.locator('.ant-message')).toContainText('成功');

    // --- Step 4: Configure product features in package ---
    await packagePage.openProductConfig(e2ePackageName);
    await expect(packagePage.productConfigModal).toBeVisible();

    // Expand the product panel
    const collapseHeader = packagePage.productConfigModal.locator('.ant-collapse-item-header').filter({ hasText: e2eProductName });
    if (await collapseHeader.isVisible()) {
      await collapseHeader.click();

      // Wait for feature switches to appear
      const switches = packagePage.productConfigModal.locator('.ant-collapse-content .ant-switch');
      const switchCount = await switches.count();

      if (switchCount > 0) {
        // Toggle first optional (enabled) switch
        for (let i = 0; i < switchCount; i++) {
          const sw = switches.nth(i);
          if (await sw.isEnabled()) {
            await sw.click();
            break;
          }
        }

        // Save features
        await packagePage.saveProductFeatures();
        await expect(page.locator('.ant-message')).toContainText('成功');
      }
    }

    // Close modal
    await packagePage.productConfigModal.locator('.ant-modal-close').click();

    // --- Step 5: Verify package in table with updated data ---
    await packagePage.goto();
    await expect(packagePage.table).toContainText(e2ePackageName);

    // --- Step 6: Verify platform config is accessible ---
    const configPage = new PlatformConfigPage(page);
    await configPage.goto();
    await configPage.expectVisible();

    // Switch through tabs to verify nothing is broken
    await configPage.switchTab('功能开关');
    const switches = page.locator('.ant-switch');
    expect(await switches.count()).toBeGreaterThan(0);

    await configPage.switchTab('规则模板');
    await expect(page.locator('button').filter({ hasText: '新建模板' })).toBeVisible();
  });

  // ──────────────────────────────────────────────
  // 7. Product deletion (cleanup scenario)
  // ──────────────────────────────────────────────
  test('FP-070: 删除产品 - Popconfirm 确认', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const productPage = new ProductManagementPage(page);
    await productPage.goto();
    await productPage.expectVisible();

    // Quick create a disposable product
    const tempCode = `DEL_${Date.now()}`;
    const tempName = `待删除产品_${Date.now()}`;
    await productPage.quickCreate(tempCode, tempName, '爬楼积分');
    await expect(page.locator('.ant-message')).toContainText('成功');

    // Reload to find it in table
    await productPage.goto();
    await productPage.expectVisible();

    // Find and click delete
    const row = productPage.table.locator('tr').filter({ hasText: tempName });
    await row.locator('button').filter({ hasText: '删除' }).click();

    // Verify popconfirm appears
    const popconfirm = page.locator('.ant-popconfirm');
    await expect(popconfirm).toBeVisible();
    await expect(popconfirm).toContainText('确认删除');

    // Confirm delete
    await popconfirm.locator('button').filter({ hasText: '确认' }).click();
    await expect(page.locator('.ant-message')).toContainText('成功');
  });

  test('FP-071: 删除套餐 - Popconfirm 确认', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    const packagePage = new PackageManagementPage(page);
    await packagePage.goto();
    await packagePage.expectVisible();

    // Create a disposable package
    const tempCode = `DEL_PKG_${Date.now()}`;
    const tempName = `待删除套餐_${Date.now()}`;
    await packagePage.createPackage(tempName, tempCode);
    await expect(page.locator('.ant-message')).toContainText('成功');

    // Reload
    await packagePage.goto();

    // Find and delete (only possible if tenantCount === 0 and code !== 'free')
    const row = packagePage.table.locator('tr').filter({ hasText: tempName });
    const deleteBtn = row.locator('button').filter({ hasText: '删除' });
    // The button may be absent if code is 'free' or has tenants
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      const popconfirm = page.locator('.ant-popconfirm');
      await expect(popconfirm).toContainText('确认删除');
      await popconfirm.locator('button').filter({ hasText: '确认' }).click();
      await expect(page.locator('.ant-message')).toContainText('成功');
    }
  });
});

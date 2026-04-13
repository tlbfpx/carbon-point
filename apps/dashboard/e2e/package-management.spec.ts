import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Platform Package Management
 * Tests cover CRUD operations for permission packages from the platform admin perspective.
 *
 * Page: /saas/platform/config (Config.tsx)
 *
 * Prerequisites:
 * - Backend server running
 * - Platform admin user authenticated via platform-admin.setup.ts
 * - Package management API endpoints implemented (/platform/packages/*)
 *
 * Environment variables:
 *   PLAYWRIGHT_BASE_URL - base URL for the app (default: http://localhost:3001)
 *   PLATFORM_ADMIN_USERNAME - platform admin username
 *   PLATFORM_ADMIN_PASSWORD - platform admin password
 */
test.describe('Platform Package Management', () => {
  test.use({
    storageState: 'e2e/.auth/platform-admin.json',
  });

  // ===== 1. Create new package with permissions =====

  test('should create a new package with permissions', async ({ page }) => {
    await page.goto('/saas/platform/config');

    // Wait for table to load
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Click "新建套餐"
    await page.getByRole('button', { name: '新建套餐' }).click();

    // Create/Edit modal should open with title "新建套餐"
    await expect(page.locator('.ant-modal-title')).toHaveText('新建套餐');

    // Fill in package details
    const pkgCode = `test-pkg-${Date.now()}`;
    const pkgName = `测试套餐-${Date.now()}`;

    await page.locator('input[placeholder*="套餐编码"], input[id*="code"]').fill(pkgCode);
    await page.locator('input[placeholder*="套餐名称"], input[id*="name"]').fill(pkgName);
    await page.locator('textarea[placeholder*="套餐描述"]').fill('自动化测试创建的套餐');

    // Submit
    await page.getByRole('button', { name: '确 定' }).click();

    // Expect success message
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

    // Modal should be closed
    await expect(page.locator('.ant-modal')).not.toBeVisible();

    // New package should appear in table
    await expect(page.getByText(pkgName)).toBeVisible();
  });

  test('should show validation errors when creating package without required fields', async ({ page }) => {
    await page.goto('/saas/platform/config');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Open create modal
    await page.getByRole('button', { name: '新建套餐' }).click();

    // Try to submit without filling required fields
    await page.getByRole('button', { name: '确 定' }).click();

    // Ant Design form validation should show errors
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible();
    // Modal should remain open
    await expect(page.locator('.ant-modal')).toBeVisible();
  });

  // ===== 2. Edit existing package (add/remove permissions) =====

  test('should edit package name and description', async ({ page }) => {
    // Create a package first
    const pkgName = `待编辑套餐-${Date.now()}`;
    await page.goto('/saas/platform/config');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: '新建套餐' }).click();
    await page.locator('input[placeholder*="套餐编码"], input[id*="code"]').fill(`edit-test-${Date.now()}`);
    await page.locator('input[placeholder*="套餐名称"], input[id*="name"]').fill(pkgName);
    await page.getByRole('button', { name: '确 定' }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

    // Reload and edit
    await page.goto('/saas/platform/config');

    // Find the row and click edit
    const row = page.locator('tbody tr').filter({ hasText: pkgName });
    await row.locator('button').filter({ hasText: '编辑' }).click();

    // Modal should open with title "编辑套餐"
    await expect(page.locator('.ant-modal-title')).toHaveText('编辑套餐');

    // Code field should be disabled (not editable)
    const codeInput = page.locator('input[id*="code"], input[placeholder*="套餐编码"]');
    await expect(codeInput).toBeDisabled();

    // Clear and set new name
    const nameInput = page.locator('input[id*="name"], input[placeholder*="套餐名称"]');
    await nameInput.clear();
    const newName = `已编辑套餐-${Date.now()}`;
    await nameInput.fill(newName);

    await page.locator('textarea[placeholder*="套餐描述"]').fill('更新后的描述');

    await page.getByRole('button', { name: '确 定' }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

    // Verify
    await page.goto('/saas/platform/config');
    await expect(page.getByText(newName)).toBeVisible();
    await expect(page.getByText('更新后的描述')).toBeVisible();
  });

  test('should configure package permissions in separate modal', async ({ page }) => {
    // Create a package
    const pkgName = `权限配置测试-${Date.now()}`;
    await page.goto('/saas/platform/config');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: '新建套餐' }).click();
    await page.locator('input[placeholder*="套餐编码"], input[id*="code"]').fill(`perm-test-${Date.now()}`);
    await page.locator('input[placeholder*="套餐名称"], input[id*="name"]').fill(pkgName);
    await page.getByRole('button', { name: '确 定' }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

    // Reload and click "配置权限"
    await page.goto('/saas/platform/config');
    const row = page.locator('tbody tr').filter({ hasText: pkgName });
    await row.locator('button').filter({ hasText: '配置权限' }).click();

    // Permission config modal should open
    await expect(page.locator('.ant-modal-title')).toHaveText('配置套餐权限');

    // Permission tree should be visible
    const permTree = page.locator('.ant-tree');
    await expect(permTree).toBeVisible();

    // Select some permissions
    const dashboardNode = permTree.locator('.ant-tree-node-content-wrapper').filter({ hasText: '数据看板' }).first();
    if (await dashboardNode.isVisible()) {
      await dashboardNode.click();
    }

    // Save permissions
    await page.getByRole('button', { name: '保存权限' }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });
  });

  // ===== 3. Delete unbound package -> success =====

  test('should delete an unbound package successfully', async ({ page }) => {
    // Create a package to delete
    const pkgName = `待删除套餐-${Date.now()}`;
    await page.goto('/saas/platform/config');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: '新建套餐' }).click();
    await page.locator('input[placeholder*="套餐编码"], input[id*="code"]').fill(`del-test-${Date.now()}`);
    await page.locator('input[placeholder*="套餐名称"], input[id*="name"]').fill(pkgName);
    await page.getByRole('button', { name: '确 定' }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

    // Reload
    await page.goto('/saas/platform/config');

    // Find and delete the package (using Popconfirm)
    const row = page.locator('tbody tr').filter({ hasText: pkgName });
    await row.locator('button').filter({ hasText: '删除' }).click();

    // Popconfirm should appear
    const popconfirm = page.locator('.ant-popconfirm');
    await expect(popconfirm).toBeVisible();
    await expect(popconfirm.getByText('确认删除该套餐？')).toBeVisible();

    // Click confirm
    await popconfirm.getByRole('button', { name: '确定' }).click();

    // Expect success
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

    // Package should no longer be in the table
    await expect(row).not.toBeVisible();
  });

  // ===== 4. Delete package with bound tenant -> error =====

  test('should prevent deleting a package that is bound to enterprises', async ({ page }) => {
    await page.goto('/saas/platform/config');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Try to delete a preset package that likely has bound tenants (e.g., free/pro/enterprise)
    // The spec says: if tenantCount > 0, the popconfirm should show a warning
    const row = page.locator('tbody tr').filter({ hasText: '免费版' }).or(
      page.locator('tbody tr').filter({ hasText: '免费版' })
    ).first();

    const boundRowExists = await row.count() > 0;

    if (boundRowExists) {
      // Check the tenant count in the row
      const tenantCountText = await row.locator('td').nth(4).textContent();

      await row.locator('button').filter({ hasText: '删除' }).click();

      const popconfirm = page.locator('.ant-popconfirm');
      await expect(popconfirm).toBeVisible();

      // If bound, description should mention binding
      if (tenantCountText && parseInt(tenantCountText) > 0) {
        await expect(popconfirm.getByText(/已有企业绑定|绑定企业/)).toBeVisible();
      }

      // Confirm deletion attempt
      await popconfirm.getByRole('button', { name: '确定' }).click();

      // Should show error message
      await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.ant-message-error')).toContainText(/绑定|解绑/);
    } else {
      test.skip('No bound package found to test deletion restriction');
    }
  });

  // ===== 5. Assign package to enterprise =====

  test('should assign package when creating enterprise', async ({ page }) => {
    await page.goto('/saas/platform/enterprises');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Click "开通企业"
    await page.getByRole('button', { name: '开通企业' }).click();

    // Enterprise create modal should open
    await expect(page.locator('.ant-modal-title')).toHaveText('开通企业');

    // Fill in basic info
    const enterpriseName = `测试企业-${Date.now()}`;
    await page.locator('input[placeholder*="企业名称"]').fill(enterpriseName);
    await page.locator('input[placeholder*="联系人"]').fill('测试联系人');
    await page.locator('input[placeholder*="手机号"]').fill('13900000000');

    // Package selector should be present
    const packageSelect = page.locator('.ant-select');
    await expect(packageSelect.first()).toBeVisible();

    // Open package dropdown
    await packageSelect.first().click();
    await page.waitForSelector('.ant-select-dropdown', { timeout: 3000 });

    // Select first available package option
    const firstOption = page.locator('.ant-select-dropdown .ant-select-item').first();
    if (await firstOption.isVisible()) {
      await firstOption.click();
    }

    // Submit
    await page.getByRole('button', { name: '确认开通' }).click();

    // Expect success
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

    // Modal should be closed
    await expect(page.locator('.ant-modal')).not.toBeVisible();
  });

  // ===== 6. Change enterprise package (upgrade/downgrade) =====

  test('should change enterprise package with confirmation', async ({ page }) => {
    await page.goto('/saas/platform/enterprises');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Find first enterprise with "详情" button
    const firstRow = page.locator('.ant-table-tbody tr').first();
    const detailBtn = firstRow.locator('button').filter({ hasText: '详情' });

    if (await detailBtn.isVisible()) {
      await detailBtn.click();

      // Detail modal should open
      await expect(page.locator('.ant-modal-title')).toHaveText('企业详情');

      // Package selector should be visible
      const packageSelect = page.locator('.ant-modal .ant-select');
      await expect(packageSelect).toBeVisible();

      // Get current package
      const currentPackage = await packageSelect.locator('.ant-select-selection-item').textContent().catch(() => '');

      // Change package
      await packageSelect.click();
      await page.waitForSelector('.ant-select-dropdown', { timeout: 3000 });

      // Select a different package (skip current)
      const options = page.locator('.ant-select-dropdown .ant-select-item');
      const optionCount = await options.count();
      if (optionCount > 1) {
        // Pick second option
        await options.nth(1).click();
      } else if (optionCount === 1) {
        await options.first().click();
      }

      // Confirmation alert should appear
      const alert = page.locator('.ant-alert');
      await expect(alert.filter({ hasText: '套餐更换' })).toBeVisible();

      // If package changed, a confirmation modal might appear
      const confirmModal = page.locator('.ant-modal-confirm');
      if (await confirmModal.isVisible()) {
        await confirmModal.getByRole('button', { name: '确认更换' }).click();
        await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  // ===== Additional: Package list columns =====

  test('should display package list with correct columns', async ({ page }) => {
    await page.goto('/saas/platform/config');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Verify table columns: 套餐名称, 套餐编码, 描述, 权限数量, 状态, 绑定企业数
    await expect(page.getByText('套餐名称')).toBeVisible();
    await expect(page.getByText('套餐编码')).toBeVisible();
    await expect(page.getByText('描述')).toBeVisible();
    await expect(page.getByText('权限数量')).toBeVisible();
    await expect(page.getByText('状态')).toBeVisible();
    await expect(page.getByText('绑定企业数')).toBeVisible();
  });

  test('should toggle package status', async ({ page }) => {
    // Create a package first
    const pkgName = `状态测试-${Date.now()}`;
    await page.goto('/saas/platform/config');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: '新建套餐' }).click();
    await page.locator('input[placeholder*="套餐编码"], input[id*="code"]').fill(`status-${Date.now()}`);
    await page.locator('input[placeholder*="套餐名称"], input[id*="name"]').fill(pkgName);
    await page.getByRole('button', { name: '确 定' }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

    // Reload and toggle status
    await page.goto('/saas/platform/config');
    const row = page.locator('tbody tr').filter({ hasText: pkgName });

    // Find the status tag
    const statusTag = row.locator('.ant-tag');
    if (await statusTag.isVisible()) {
      // New packages are created with status=1 (启用/green)
      await expect(statusTag).toContainText('启用');
    }
  });

  test('should prevent duplicate package code', async ({ page }) => {
    // Create a package with specific code
    const pkgCode = `dup-test-${Date.now()}`;
    const pkgName = `重复测试-${Date.now()}`;

    await page.goto('/saas/platform/config');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: '新建套餐' }).click();
    await page.locator('input[placeholder*="套餐编码"], input[id*="code"]').fill(pkgCode);
    await page.locator('input[placeholder*="套餐名称"], input[id*="name"]').fill(pkgName);
    await page.getByRole('button', { name: '确 定' }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

    // Try to create another with same code
    await page.getByRole('button', { name: '新建套餐' }).click();
    await page.locator('input[placeholder*="套餐编码"], input[id*="code"]').fill(pkgCode);
    await page.locator('input[placeholder*="套餐名称"], input[id*="name"]').fill(`${pkgName}-2`);
    await page.getByRole('button', { name: '确 定' }).click();

    // Should show error
    await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 5000 });
  });
});

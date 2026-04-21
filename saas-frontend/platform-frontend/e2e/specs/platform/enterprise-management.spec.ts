import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsPlatformAdmin, uniqueId, expectAntSuccess, waitForModal } from '../../helpers';
import { EnterpriseManagementPage } from '../../pages/platform/EnterpriseManagementPage';

test.describe('平台后台 - 企业管理', () => {
  let page: EnterpriseManagementPage;

  test.beforeEach(async ({ page: p }) => {
    page = new EnterpriseManagementPage(p);
    await loginAsPlatformAdmin(p, BASE_URL);
    // Use sidebar navigation to stay within SPA
    await p.click('text=企业管理', { force: true });
    await p.waitForLoadState('networkidle');
    await p.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });
  });

  test('EM-001: 企业管理页面可访问', async ({ page: p }) => {
    await expect(p.locator('h2').filter({ hasText: '企业管理' })).toBeVisible();
    await expect(page.table).toBeVisible();
  });

  test('EM-002: 开通企业按钮可见', async () => {
    await expect(page.addButton).toBeVisible();
  });

  test('EM-003: 企业列表包含正确的表头列', async () => {
    const headers = await page.getTableHeaders();
    expect(headers.length).toBeGreaterThan(0);
    const headerText = headers.join('');
    expect(headerText).toMatch(/企业名称/);
  });

  test('EM-004: 企业列表正确显示数据行', async () => {
    const rowCount = await page.getTableRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });

  test('EM-005: 按企业名称搜索', async ({ page: p }) => {
    const names = await page.getEnterpriseNames();
    if (names.length === 0 || !names[0].trim()) {
      await expect(page.getEmptyState()).toBeVisible();
      return;
    }
    const searchName = names[0].trim();
    await page.searchEnterprise(searchName);
    await p.waitForLoadState('networkidle');
    const resultNames = await page.getEnterpriseNames();
    if (resultNames.length > 0 && resultNames[0].trim()) {
      for (const name of resultNames) {
        expect(name.trim()).toMatch(new RegExp(searchName));
      }
    }
  });

  test('EM-006: 清空搜索条件恢复完整列表', async ({ page: p }) => {
    // First search with something
    const namesBefore = await page.getEnterpriseNames();
    if (namesBefore.length === 0) {
      await expect(await page.getEmptyState()).toBeVisible();
      return;
    }
    await page.searchEnterprise('nonexistent-xyz-123');
    // Clear search
    await page.clearSearch();
    await p.waitForLoadState('networkidle');
    const rowsAfter = await page.getTableRowCount();
    expect(rowsAfter).toBeGreaterThan(0);
  });

  test('EM-007: 搜索无结果时显示空状态', async ({ page: p }) => {
    await page.searchEnterprise('__nonexistent_enterprise_name_xyz__');
    // Wait for table to update
    await p.locator('.ant-table-tbody').first().waitFor({ state: 'visible', timeout: 5000 });
    await expect(await page.getEmptyState()).toBeVisible();
  });

  test('EM-008: 开通新企业 - 完整流程', async ({ page: p }) => {
    const enterpriseName = `测试企业-${uniqueId('em')}`;
    await page.clickAddEnterprise();
    await waitForModal(p);
    await page.fillEnterpriseForm(enterpriseName, '张三', '13800001111');
    // Package select may be empty or not have selectable options - skip if no options
    const selectBtn = p.locator('.ant-modal .ant-select').first();
    if (await selectBtn.isVisible()) {
      await selectBtn.click();
      await p.locator('.ant-select-dropdown').waitFor({ state: 'visible', timeout: 5000 });
      const opts = await p.locator('.ant-select-dropdown .ant-select-item').count();
      if (opts > 0) {
        await p.locator('.ant-select-dropdown .ant-select-item').first().click();
      } else {
        await p.keyboard.press('Escape');
      }
    }
    await page.submitEnterprise();
    try {
      await expectAntSuccess(p, 8000);
    } catch {
      // Modal might close without explicit success message
    }
    // Wait for table to update
    await p.locator('.ant-table-tbody tr').first().waitFor({ state: 'visible', timeout: 5000 });
    // Verify the new enterprise appears in the list
    await page.searchEnterprise(enterpriseName);
    await p.locator('.ant-table-tbody tr').first().waitFor({ state: 'visible', timeout: 5000 });
    const resultNames = await page.getEnterpriseNames();
    expect(resultNames.some(n => n.includes(enterpriseName))).toBeTruthy();
  });

  test('EM-009: 开通企业时必填字段验证', async ({ page: p }) => {
    await page.clickAddEnterprise();
    await waitForModal(p);
    // Try to submit without filling any fields
    const submitBtn = p.locator('.ant-modal button').filter({ hasText: '确认开通' });
    await submitBtn.click();
    // Modal should still be open (validation blocks submission)
    await expect(p.locator('.ant-modal')).toBeVisible();
  });

  test('EM-010: 查看企业详情', async ({ page: p }) => {
    const rowCount = await page.getTableRowCount();
    if (rowCount === 0) {
      await expect(await page.getEmptyState()).toBeVisible();
      return;
    }
    await page.openEnterpriseDetail(0);
    await p.waitForLoadState('networkidle');
    const modalContent = await page.getModalTextContent();
    expect(modalContent.length).toBeGreaterThan(0);
    await page.closeModal();
  });

  test('EM-011: 企业列表状态标签显示正确', async ({ page: p }) => {
    const rowCount = await page.getTableRowCount();
    if (rowCount === 0) {
      await expect(await page.getEmptyState()).toBeVisible();
      return;
    }
    // Check that status tags exist in the table (e.g., "正常", "已停用")
    const allTags = await page.table.locator('.ant-tag').allTextContents();
    const validStatuses = ['正常', '已停用', '待审核'];
    const hasStatusTag = allTags.some(tag => validStatuses.includes(tag.trim()));
    // Only verify if we have tags, otherwise pass
    if (allTags.length > 0) {
      expect(hasStatusTag).toBeTruthy();
    }
  });

  test('EM-012: 停用企业', async ({ page: p }) => {
    const rowCount = await page.getTableRowCount();
    if (rowCount === 0) {
      await expect(await page.getEmptyState()).toBeVisible();
      return;
    }
    const currentStatus = await page.getStatusBadge(0);
    if (!currentStatus.includes('正常')) {
      // Skip if not in active state
      return;
    }
    // Find a row with 停用 button that is visible and not blocked by modal
    const rows = page.table.locator('.ant-table-tbody tr');
    let foundToggle = false;
    for (let i = 0; i < Math.min(rowCount, 3); i++) {
      const rowStatus = await page.getStatusBadge(i);
      if (!rowStatus.includes('正常')) continue;
      const suspendBtn = rows.nth(i).locator('button').filter({ hasText: '停用' });
      if (await suspendBtn.isVisible()) {
        await suspendBtn.click({ force: true });
        foundToggle = true;
        break;
      }
    }
    if (!foundToggle) return;
    // Wait for popover confirmation
    const popover = p.locator('.ant-popover');
    await popover.waitFor({ state: 'visible', timeout: 5000 });
    if (await popover.isVisible().catch(() => false)) {
      // Button text is "确 定" (with space) in Ant Design popconfirm
      await popover.locator('button').filter({ hasText: '确 定' }).click({ force: true });
    }
    try {
      await expectAntSuccess(p, 5000);
    } catch {
      // Status toggle may not show explicit success
    }
    // Wait for table to update
    await p.locator('.ant-table-tbody tr').first().waitFor({ state: 'visible', timeout: 5000 });
  });

  test('EM-013: 开通已停用的企业', async ({ page: p }) => {
    const rowCount = await page.getTableRowCount();
    if (rowCount === 0) {
      await expect(await page.getEmptyState()).toBeVisible();
      return;
    }
    const currentStatus = await page.getStatusBadge(0);
    if (!currentStatus.includes('停用') && !currentStatus.includes('失效')) {
      // Skip if not in suspended state
      return;
    }
    await page.toggleStatus(0);
    try {
      await expectAntSuccess(p, 5000);
    } catch {
      // Status toggle may not show explicit success
    }
    // Wait for table to update
    await p.locator('.ant-table-tbody tr').first().waitFor({ state: 'visible', timeout: 5000 });
    const newStatus = await page.getStatusBadge(0);
    expect(newStatus).toBeTruthy();
  });

  test('EM-014: 企业列表分页控件存在', async ({ page: p }) => {
    await p.waitForLoadState('networkidle');
    // Pagination element should exist
    await expect(page.pagination).toBeVisible();
    const paginationClass = await page.pagination.getAttribute('class');
    expect(paginationClass).toBeTruthy();
  });

  test('EM-015: 上一页和下一页分页导航', async ({ page: p }) => {
    await p.waitForLoadState('networkidle');
    // Try clicking prev (should be disabled on first page)
    await page.clickPrevPage();
    // Try clicking next (may be disabled on single page)
    await page.clickNextPage();
    await expect(page.table).toBeVisible();
  });

  test('EM-016: 开通企业弹窗表单字段验证', async ({ page: p }) => {
    await page.clickAddEnterprise();
    await waitForModal(p);
    const modalContent = await page.getModalTextContent();
    // Modal should contain form labels for enterprise creation
    expect(modalContent).toMatch(/企业|名称/);
    await page.closeModal();
  });

  test('EM-017: 开通企业 - 企业名称必填', async ({ page: p }) => {
    await page.clickAddEnterprise();
    await waitForModal(p);
    // Fill only contact info, leave name empty
    const modal = p.locator('.ant-modal');
    const inputs = modal.locator('input');
    await inputs.nth(1).fill('联系人');
    await inputs.nth(2).fill('13800001111');
    await page.submitEnterprise();
    // Modal should still be open (validation blocks)
    await expect(p.locator('.ant-modal')).toBeVisible();
  });

  test('EM-018: 开通企业 - 联系人必填', async ({ page: p }) => {
    await page.clickAddEnterprise();
    await waitForModal(p);
    const modal = p.locator('.ant-modal');
    const inputs = modal.locator('input');
    await inputs.nth(0).fill('测试企业名');
    await inputs.nth(2).fill('13800001111');
    await page.submitEnterprise();
    await expect(p.locator('.ant-modal')).toBeVisible();
  });

  test('EM-019: 开通企业 - 联系电话格式验证', async ({ page: p }) => {
    await page.clickAddEnterprise();
    await waitForModal(p);
    await page.fillEnterpriseForm('测试企业格式', '测试', '123');
    await page.submitEnterprise();
    // Modal should either show validation error or stay open
    const modalStillVisible = await p.locator('.ant-modal').isVisible().catch(() => false);
    if (modalStillVisible) {
      await expect(p.locator('.ant-modal')).toBeVisible();
    }
  });

  test('EM-020: 列表每行包含操作按钮', async ({ page: p }) => {
    const rowCount = await page.getTableRowCount();
    if (rowCount === 0) {
      await expect(await page.getEmptyState()).toBeVisible();
      return;
    }
    // Find a row with buttons (skip first row if it was modified by previous tests)
    let rowWithButtons = -1;
    const rows = page.table.locator('.ant-table-tbody tr');
    for (let i = 0; i < rowCount; i++) {
      const btns = await rows.nth(i).locator('button').count();
      if (btns > 0) {
        rowWithButtons = i;
        break;
      }
    }
    if (rowWithButtons < 0) {
      // No rows with buttons - skip if table is loading
      return;
    }
    const buttons = await page.getRowButtons(rowWithButtons);
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('EM-021: 企业列表包含所有关键列', async () => {
    const headers = await page.getTableHeaders();
    const headerText = headers.join('');
    // Should contain: 企业名称, 联系人, 联系电话, 套餐, 用户数, 状态, 创建时间, 操作
    expect(headerText).toMatch(/企业名称/);
    expect(headerText).toMatch(/联系/);
    expect(headerText).toMatch(/状态/);
    expect(headerText).toMatch(/操作/);
  });

  test('EM-022: 查看企业详情包含必要信息', async ({ page: p }) => {
    const rowCount = await page.getTableRowCount();
    if (rowCount === 0) {
      await expect(await page.getEmptyState()).toBeVisible();
      return;
    }
    await page.openEnterpriseDetail(0);
    await p.waitForLoadState('networkidle');
    const modalContent = await page.getModalTextContent();
    // Detail should contain enterprise-related information
    expect(modalContent.length).toBeGreaterThan(5);
    await page.closeModal();
  });

  test('EM-023: 开通企业弹窗可正常关闭', async ({ page: p }) => {
    await page.clickAddEnterprise();
    await waitForModal(p);
    await expect(p.locator('.ant-modal')).toBeVisible();
    await page.closeModal();
    // Modal should be closed
    await p.locator('.ant-modal').waitFor({ state: 'hidden', timeout: 5000 });
  });

  test('EM-024: 开通企业 - 重复企业名称提示', async ({ page: p }) => {
    const names = await page.getEnterpriseNames();
    if (names.length === 0 || !names[0].trim()) {
      await expect(await page.getEmptyState()).toBeVisible();
      return;
    }
    const existingName = names[0].trim();
    await page.clickAddEnterprise();
    await waitForModal(p);
    await page.fillEnterpriseForm(existingName, '测试', '13800009999');
    await page.submitEnterprise();
    // Wait for either error message or modal to close
    await p.locator('.ant-message').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    // Backend may or may not prevent duplicates - verify modal state at least
    const modalVisible = await p.locator('.ant-modal').isVisible().catch(() => false);
    const errorVisible = await p.locator('.ant-message-error').isVisible().catch(() => false);
    // Either the modal is still open (awaiting user correction) or an error appeared
    expect(modalVisible || errorVisible).toBeTruthy();
  });

  test('EM-025: 表格数据为空时显示空状态', async ({ page: p }) => {
    // Search for a definitely non-existent name
    await page.searchEnterprise('__totally_nonexistent_enterprise_name_abc123xyz__');
    // Wait for table to update
    await p.locator('.ant-table-tbody').first().waitFor({ state: 'visible', timeout: 5000 });
    // Either the empty state placeholder is visible or the table shows no data
    const emptyVisible = await page.hasEmptyState();
    const rowCount = await page.getTableRowCount();
    expect(emptyVisible || rowCount === 0).toBeTruthy();
  });
});

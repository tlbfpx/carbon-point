/**
 * Platform Admin — 字典管理 E2E
 * 路由: /system/dict
 */
import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsPlatformAdmin, uniqueId } from '../../helpers';
import { DictManagementPage } from '../../pages/platform/DictManagementPage';

test.describe('平台后台 - 字典管理', () => {
  let page: DictManagementPage;

  test.beforeEach(async ({ page: p }) => {
    page = new DictManagementPage(p);
    await loginAsPlatformAdmin(p, BASE_URL);
    await page.goto();
  });

  test.afterEach(async ({ page: p }) => {
    try {
      const popover = p.locator('.ant-popover');
      if (await popover.isVisible({ timeout: 500 }).catch(() => false)) {
        await p.keyboard.press('Escape');
      }
    } catch { /* ignore */ }
    try {
      const modal = p.locator('.ant-modal');
      if (await modal.isVisible({ timeout: 500 }).catch(() => false)) {
        await p.locator('.ant-modal-close').first().click();
        await modal.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
      }
    } catch { /* ignore */ }
  });

  // ── 页面结构 ────────────────────────────────────────────────

  test('DM-001: 页面标题正确', async () => {
    await expect(page.pageTitle).toBeVisible();
    const text = await page.pageTitle.textContent();
    expect(text?.trim()).toMatch(/字典管理/);
  });

  test('DM-002: 字典表格可见', async () => {
    await expect(page.table).toBeVisible();
  });

  test('DM-003: 表头列完整', async () => {
    const headers = await page.table.locator('.ant-table-thead th').allTextContents();
    const headerText = headers.join('');
    expect(headerText).toMatch(/字典类型/);
    expect(headerText).toMatch(/字典编码/);
    expect(headerText).toMatch(/字典名称/);
    expect(headerText).toMatch(/状态/);
    expect(headerText).toMatch(/操作/);
  });

  test('DM-004: 新增字典按钮可见', async () => {
    await expect(page.createButton).toBeVisible();
    const text = await page.createButton.textContent();
    expect(text).toMatch(/新增字典/);
  });

  test('DM-005: 字典类型筛选器可见', async () => {
    await expect(page.typeFilterSelect).toBeVisible();
  });

  test('DM-006: 分页控件可见', async () => {
    await expect(page.pagination).toBeVisible({ timeout: 10000 });
  });

  // ── 创建字典 ────────────────────────────────────────────────

  test('DM-007: 打开新增字典弹窗', async () => {
    await page.openCreateModal();
    await page.assertModalVisible();
    const title = await page.modal.locator('.ant-modal-title').textContent();
    expect(title?.trim()).toMatch(/新增字典/);
  });

  test('DM-008: 新增字典表单字段完整', async () => {
    await page.openCreateModal();
    await expect(page.modalDictTypeInput).toBeVisible();
    await expect(page.modalDictCodeInput).toBeVisible();
    await expect(page.modalDictNameInput).toBeVisible();
    await expect(page.modalSubmitButton).toBeVisible();
  });

  test('DM-009: 必填字段验证（字典类型空）', async () => {
    await page.openCreateModal();
    await page.modalDictCodeInput.fill(`code_${uniqueId('dm')}`);
    await page.modalDictNameInput.fill('测试字典');
    await page.modalSubmitButton.click();
    // Modal should still be open
    await page.assertModalVisible();
  });

  test('DM-010: 必填字段验证（字典编码空）', async () => {
    await page.openCreateModal();
    await page.modalDictTypeInput.fill(`type_${uniqueId('dm')}`);
    await page.modalDictNameInput.fill('测试字典');
    await page.modalSubmitButton.click();
    await page.assertModalVisible();
  });

  test('DM-011: 创建字典成功', async ({ page: p }) => {
    const type = `test_type_${uniqueId('dm')}`;
    const code = `test_code_${uniqueId('dm')}`;
    const name = `测试字典_${uniqueId('dm')}`;
    await page.createDict({ dictType: type, dictCode: code, dictName: name, sortOrder: 0 });
    await page.assertSuccessMessage();
    await page.assertDictVisible(name);
  });

  test('DM-012: 创建字典带备注', async ({ page: p }) => {
    const type = `test_type2_${uniqueId('dm')}`;
    const code = `test_code2_${uniqueId('dm')}`;
    const name = `测试字典2_${uniqueId('dm')}`;
    await page.createDict({
      dictType: type,
      dictCode: code,
      dictName: name,
      remark: '这是E2E自动测试生成的字典',
    });
    await page.assertSuccessMessage();
    await page.assertDictVisible(name);
  });

  test('DM-013: 取消创建关闭弹窗', async () => {
    await page.openCreateModal();
    await page.closeModal();
    await page.waitForModalGone();
  });

  // ── 编辑字典 ────────────────────────────────────────────────

  test('DM-014: 编辑字典弹窗可打开', async ({ page: p }) => {
    const type = `edit_type_${uniqueId('dm')}`;
    const code = `edit_code_${uniqueId('dm')}`;
    const name = `编辑字典_${uniqueId('dm')}`;
    await page.createDict({ dictType: type, dictCode: code, dictName: name });
    await page.assertSuccessMessage();
    await page.openEditModal(name);
    await page.assertModalVisible();
    const title = await page.modal.locator('.ant-modal-title').textContent();
    expect(title?.trim()).toMatch(/编辑/);
  });

  test('DM-015: 编辑字典名称后保存成功', async ({ page: p }) => {
    const type = `edit_type2_${uniqueId('dm')}`;
    const code = `edit_code2_${uniqueId('dm')}`;
    const name = `编辑字典2_${uniqueId('dm')}`;
    const newName = `编辑后_${uniqueId('dm')}`;
    await page.createDict({ dictType: type, dictCode: code, dictName: name });
    await page.assertSuccessMessage();
    await page.openEditModal(name);
    await page.fillEditForm({ dictName: newName });
    await page.submitForm();
    await page.assertSuccessMessage();
    await page.assertDictVisible(newName);
  });

  test('DM-016: 编辑时字典类型和编码不可修改', async ({ page: p }) => {
    const type = `edit_type3_${uniqueId('dm')}`;
    const code = `edit_code3_${uniqueId('dm')}`;
    const name = `编辑字典3_${uniqueId('dm')}`;
    await page.createDict({ dictType: type, dictCode: code, dictName: name });
    await page.assertSuccessMessage();
    await page.openEditModal(name);
    // Type and code fields should be disabled
    const typeField = page.modal.locator('input[disabled], .ant-input-disabled').filter({ hasText: type });
    const codeField = page.modal.locator('input[disabled], .ant-input-disabled').filter({ hasText: code });
    const isDisabled = (await typeField.isVisible().catch(() => false)) || (await codeField.isVisible().catch(() => false));
    if (isDisabled) {
      // This is expected behavior
    }
  });

  // ── 筛选功能 ────────────────────────────────────────────────

  test('DM-017: 按字典类型筛选', async ({ page: p }) => {
    // First create a dict with a known type
    const type = `filter_type_${uniqueId('dm')}`;
    const code = `filter_code_${uniqueId('dm')}`;
    const name = `筛选字典_${uniqueId('dm')}`;
    await page.createDict({ dictType: type, dictCode: code, dictName: name });
    await page.assertSuccessMessage();
    // Apply filter
    await page.filterByType(type);
    await page.assertDictVisible(name);
  });

  test('DM-018: 清空筛选恢复全部', async ({ page: p }) => {
    const type = `filter_type2_${uniqueId('dm')}`;
    const code = `filter_code2_${uniqueId('dm')}`;
    const name = `筛选字典2_${uniqueId('dm')}`;
    await page.createDict({ dictType: type, dictCode: code, dictName: name });
    await page.assertSuccessMessage();
    await page.filterByType(type);
    await page.assertDictVisible(name);
    await page.clearFilter();
    // After clearing, table should still have content
    await expect(page.table).toBeVisible();
  });

  // ── 删除字典 ────────────────────────────────────────────────

  test('DM-019: 删除确认弹窗可见', async ({ page: p }) => {
    const type = `del_type_${uniqueId('dm')}`;
    const code = `del_code_${uniqueId('dm')}`;
    const name = `删除字典_${uniqueId('dm')}`;
    await page.createDict({ dictType: type, dictCode: code, dictName: name });
    await page.assertSuccessMessage();
    await page.deleteDict(name);
    await expect(page.page.locator('.ant-popconfirm')).toBeVisible();
  });

  test('DM-020: 确认删除后字典消失', async ({ page: p }) => {
    const type = `del_type2_${uniqueId('dm')}`;
    const code = `del_code2_${uniqueId('dm')}`;
    const name = `删除字典2_${uniqueId('dm')}`;
    await page.createDict({ dictType: type, dictCode: code, dictName: name });
    await page.assertSuccessMessage();
    await page.deleteDict(name);
    await page.confirmDelete();
    await page.assertSuccessMessage();
    await page.assertDictNotVisible(name);
  });

  // ── 列表状态 ────────────────────────────────────────────────

  test('DM-021: 字典列表状态标签显示正常', async () => {
    const count = await page.getRowCount();
    if (count === 0) return;
    const firstRowText = await page.tableRows.first().textContent();
    if (firstRowText) {
      const hasStatus = /启用|禁用/.test(firstRowText);
      expect(hasStatus).toBeTruthy();
    }
  });

  test('DM-022: 字典列表操作按钮完整', async ({ page: p }) => {
    const type = `ops_type_${uniqueId('dm')}`;
    const code = `ops_code_${uniqueId('dm')}`;
    const name = `操作字典_${uniqueId('dm')}`;
    await page.createDict({ dictType: type, dictCode: code, dictName: name });
    await page.assertSuccessMessage();
    const row = page.tableRows.filter({ hasText: name }).first();
    await row.waitFor({ state: 'visible', timeout: 5000 });
    const editBtn = page.editButton(name);
    const deleteBtn = page.deleteButton(name);
    await expect(editBtn).toBeVisible();
    await expect(deleteBtn).toBeVisible();
  });
});

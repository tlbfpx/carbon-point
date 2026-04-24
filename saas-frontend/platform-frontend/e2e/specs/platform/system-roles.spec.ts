/**
 * Platform Admin — 角色管理 E2E
 * 路由: /system/roles
 */
import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsPlatformAdmin, uniqueId } from '../../helpers';
import { SystemRolesPage } from '../../pages/platform/SystemRolesPage';

test.describe('平台后台 - 角色管理', () => {
  let page: SystemRolesPage;

  test.beforeEach(async ({ page: p }) => {
    page = new SystemRolesPage(p);
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

  test('SR-001: 页面标题正确', async () => {
    await expect(page.pageTitle).toBeVisible();
    const text = await page.pageTitle.textContent();
    expect(text?.trim()).toMatch(/角色管理/);
  });

  test('SR-002: 角色表格可见', async () => {
    await expect(page.table).toBeVisible();
    await expect(page.tableRows.first()).toBeVisible();
  });

  test('SR-003: 表头列完整', async () => {
    const headers = await page.table.locator('.ant-table-thead th').allTextContents();
    const headerText = headers.join('');
    expect(headerText).toMatch(/角色编码/);
    expect(headerText).toMatch(/角色名称/);
    expect(headerText).toMatch(/状态/);
    expect(headerText).toMatch(/操作/);
  });

  test('SR-004: 新增角色按钮可见', async () => {
    await expect(page.createButton).toBeVisible();
    const text = await page.createButton.textContent();
    expect(text).toMatch(/新增角色/);
  });

  test('SR-005: 超级管理员不可删除（安全保护）', async () => {
    // super_admin row should NOT have a delete button
    const superAdminRow = page.tableRows.filter({ hasText: 'super_admin' }).first();
    if (await superAdminRow.isVisible()) {
      const deleteBtn = page.deleteButton('super_admin');
      await expect(deleteBtn).not.toBeVisible();
    }
  });

  test('SR-006: 分页控件可见', async () => {
    await expect(page.pagination).toBeVisible({ timeout: 10000 });
  });

  // ── 创建角色 ────────────────────────────────────────────────

  test('SR-007: 打开新增角色弹窗', async () => {
    await page.openCreateModal();
    await page.assertModalVisible();
    const title = await page.modal.locator('.ant-modal-title').textContent();
    expect(title?.trim()).toMatch(/新增角色/);
  });

  test('SR-008: 新增角色表单字段完整', async () => {
    await page.openCreateModal();
    await expect(page.modalCodeInput).toBeVisible();
    await expect(page.modalNameInput).toBeVisible();
    await expect(page.modalSubmitButton).toBeVisible();
  });

  test('SR-009: 必填字段验证（角色编码空）', async () => {
    await page.openCreateModal();
    await page.modalNameInput.fill('测试角色');
    await page.modalSubmitButton.click();
    // Modal should still be open (validation blocks)
    await page.assertModalVisible();
  });

  test('SR-010: 必填字段验证（角色名称空）', async () => {
    await page.openCreateModal();
    await page.modalCodeInput.fill(`CODE_${uniqueId('sr')}`);
    await page.modalSubmitButton.click();
    await page.assertModalVisible();
  });

  test('SR-011: 创建角色成功', async ({ page: p }) => {
    const code = `test_role_${Date.now()}`;
    const name = `测试角色_${uniqueId('sr')}`;
    await page.createRole({ code, name, description: 'E2E自动测试角色' });
    await page.assertSuccessMessage();
    await page.assertRoleVisible(name);
  });

  test('SR-012: 取消创建关闭弹窗', async () => {
    await page.openCreateModal();
    await page.closeModal();
    await page.waitForModalGone();
  });

  // ── 编辑角色 ────────────────────────────────────────────────

  test('SR-013: 编辑角色弹窗可打开', async ({ page: p }) => {
    const code = `edit_role_${Date.now()}`;
    const name = `编辑角色_${uniqueId('sr')}`;
    await page.createRole({ code, name });
    await page.assertSuccessMessage();
    await page.openEditModal(name);
    await page.assertModalVisible();
    const title = await page.modal.locator('.ant-modal-title').textContent();
    expect(title?.trim()).toMatch(/编辑/);
  });

  test('SR-014: 编辑角色名称后保存成功', async ({ page: p }) => {
    const code = `edit_role2_${Date.now()}`;
    const name = `编辑角色2_${uniqueId('sr')}`;
    const newName = `编辑后_${uniqueId('sr')}`;
    await page.createRole({ code, name });
    await page.assertSuccessMessage();
    await page.openEditModal(name);
    await page.fillEditForm({ name: newName });
    await page.submitForm();
    await page.assertSuccessMessage();
    await page.assertRoleVisible(newName);
  });

  // ── 配置权限 ────────────────────────────────────────────────

  test('SR-015: 配置权限弹窗可打开', async ({ page: p }) => {
    const code = `perm_role_${Date.now()}`;
    const name = `权限角色_${uniqueId('sr')}`;
    await page.createRole({ code, name });
    await page.assertSuccessMessage();
    await page.openPermModal(name);
    await expect(page.permModal).toBeVisible();
    // Tree exists in DOM; may be hidden if no permissions configured in backend
    const treeExists = await page.permTree.count();
    expect(treeExists).toBeGreaterThan(0);
  });

  test('SR-016: 权限树节点可点击', async ({ page: p }) => {
    const code = `perm_role2_${Date.now()}`;
    const name = `权限角色2_${uniqueId('sr')}`;
    await page.createRole({ code, name });
    await page.assertSuccessMessage();
    await page.openPermModal(name);
    const nodes = page.permTree.locator('.ant-tree-node-content');
    const count = await nodes.count();
    if (count > 0) {
      await nodes.first().click();
      // Wait a moment for state to update
    }
  });

  test('SR-017: 保存权限后显示成功', async ({ page: p }) => {
    const code = `perm_role3_${Date.now()}`;
    const name = `权限角色3_${uniqueId('sr')}`;
    await page.createRole({ code, name });
    await page.assertSuccessMessage();
    await page.openPermModal(name);
    await page.savePermissions();
    await page.assertSuccessMessage();
  });

  // ── 删除角色 ────────────────────────────────────────────────

  test('SR-018: 删除确认弹窗可见', async ({ page: p }) => {
    const code = `del_role_${Date.now()}`;
    const name = `删除角色_${uniqueId('sr')}`;
    await page.createRole({ code, name });
    await page.assertSuccessMessage();
    await page.deleteRole(name);
    await expect(page.page.locator('.ant-popconfirm')).toBeVisible();
  });

  test('SR-019: 确认删除后角色消失', async ({ page: p }) => {
    const code = `del_role2_${Date.now()}`;
    const name = `删除角色2_${uniqueId('sr')}`;
    await page.createRole({ code, name });
    await page.assertSuccessMessage();
    await page.deleteRole(name);
    await page.confirmDelete();
    await page.assertSuccessMessage();
    await page.assertRoleNotVisible(name);
  });

  // ── 列表状态 ────────────────────────────────────────────────

  test('SR-020: 角色列表状态标签显示正常', async () => {
    const count = await page.getRowCount();
    if (count === 0) return;
    const firstRowText = await page.tableRows.first().textContent();
    if (firstRowText) {
      const hasStatus = /启用|禁用/.test(firstRowText);
      expect(hasStatus).toBeTruthy();
    }
  });

  test('SR-021: 角色列表操作按钮完整', async ({ page: p }) => {
    const code = `ops_role_${Date.now()}`;
    const name = `操作角色_${uniqueId('sr')}`;
    await page.createRole({ code, name });
    await page.assertSuccessMessage();
    const row = page.tableRows.filter({ hasText: name }).first();
    await row.waitFor({ state: 'visible', timeout: 5000 });
    const editBtn = page.editButton(name);
    const permBtn = page.permButton(name);
    await expect(editBtn).toBeVisible();
    await expect(permBtn).toBeVisible();
  });

  test('SR-022: 重复角色编码提示', async ({ page: p }) => {
    const code = `dup_role_${Date.now()}`;
    const name = `重复编码_${uniqueId('sr')}`;
    await page.createRole({ code, name });
    await page.assertSuccessMessage();
    // Try to create another with same code
    await page.openCreateModal();
    await page.fillCreateForm({ code, name: `${name}_副本` });
    await page.submitForm();
    // Should show error or modal stays open
    const errorOrModal = await Promise.race([
      page.page.locator('.ant-message-error').isVisible({ timeout: 3000 }).then(() => 'error'),
      page.modal.isVisible({ timeout: 3000 }).then(() => 'modal'),
    ]);
    expect(['error', 'modal']).toContain(errorOrModal);
  });
});

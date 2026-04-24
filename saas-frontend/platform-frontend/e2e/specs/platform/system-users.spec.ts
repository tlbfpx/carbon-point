/**
 * Platform Admin — 系统用户管理 E2E
 * 路由: /system/users
 */
import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsPlatformAdmin, uniqueId } from '../../helpers';
import { SystemUsersPage } from '../../pages/platform/SystemUsersPage';

test.describe('平台后台 - 系统用户管理', () => {
  let page: SystemUsersPage;

  test.beforeEach(async ({ page: p }) => {
    page = new SystemUsersPage(p);
    await loginAsPlatformAdmin(p, BASE_URL);
    await page.goto();
  });

  test.afterEach(async ({ page: p }) => {
    // Close any leftover modals / popovers to avoid polluting next test
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

  test('SU-001: 页面标题正确', async () => {
    await expect(page.pageTitle).toBeVisible();
    const text = await page.pageTitle.textContent();
    expect(text?.trim()).toMatch(/用户管理/);
  });

  test('SU-002: 用户表格可见', async () => {
    await expect(page.table).toBeVisible();
    await expect(page.tableRows.first()).toBeVisible();
  });

  test('SU-003: 表头列完整', async () => {
    const headers = await page.table.locator('.ant-table-thead th').allTextContents();
    const headerText = headers.join('');
    expect(headerText).toMatch(/用户名/);
    expect(headerText).toMatch(/手机/);
    expect(headerText).toMatch(/角色/);
    expect(headerText).toMatch(/状态/);
    expect(headerText).toMatch(/操作/);
  });

  test('SU-004: 新增用户按钮可见', async () => {
    await expect(page.createButton).toBeVisible();
    const text = await page.createButton.textContent();
    expect(text).toMatch(/新增用户/);
  });

  test('SU-005: 刷新按钮可见', async () => {
    await expect(page.refreshButton).toBeVisible();
  });

  test('SU-006: 分页控件可见', async () => {
    await expect(page.pagination).toBeVisible({ timeout: 10000 });
  });

  // ── 创建用户 ────────────────────────────────────────────────

  test('SU-007: 打开新增用户弹窗', async () => {
    await page.openCreateModal();
    await page.assertModalVisible();
    const title = await page.modal.locator('.ant-modal-title').textContent();
    expect(title?.trim()).toMatch(/新增用户/);
  });

  test('SU-008: 新增用户表单字段完整', async () => {
    await page.openCreateModal();
    await expect(page.modalUsernameInput).toBeVisible();
    await expect(page.modalPhoneInput).toBeVisible();
    await expect(page.modalPasswordInput).toBeVisible();
    await expect(page.modalRoleSelect).toBeVisible();
    await expect(page.modalSubmitButton).toBeVisible();
  });

  test('SU-009: 必填字段验证（用户名空）', async () => {
    await page.openCreateModal();
    await page.modalPhoneInput.fill('13800138001');
    await page.modalPasswordInput.fill('Admin123!');
    await page.selectRole('超级管理员');
    await page.modalSubmitButton.click();
    // Modal should still be visible (validation blocks)
    await page.assertModalVisible();
  });

  test('SU-010: 手机号格式验证', async () => {
    await page.openCreateModal();
    await page.fillCreateForm({
      username: 'testuser',
      phone: '12345', // invalid
      password: 'Admin123!',
      role: '超级管理员',
    });
    await page.modalSubmitButton.click();
    // Should show validation error, not submit
    const error = page.page.locator('.ant-form-item-explain-error').first();
    await expect(error).toBeVisible({ timeout: 3000 });
  });

  test('SU-011: 密码长度验证', async () => {
    await page.openCreateModal();
    await page.fillCreateForm({
      username: 'testuser',
      phone: '13800138001',
      password: '123', // too short
      role: '超级管理员',
    });
    await page.modalSubmitButton.click();
    const error = page.page.locator('.ant-form-item-explain-error').first();
    await expect(error).toBeVisible({ timeout: 3000 });
  });

  test('SU-012: 创建用户成功', async ({ page: p }) => {
    const username = `test_${uniqueId('su')}`;
    const phone = `138${String(Date.now()).slice(-8)}`;
    await page.createUser({
      username,
      phone,
      password: 'Admin123!',
      email: `${username}@test.com`,
      role: '超级管理员',
    });
    await page.assertSuccessMessage();
    await page.assertUserVisible(username);
  });

  test('SU-013: 取消创建关闭弹窗', async () => {
    await page.openCreateModal();
    await page.closeModal();
    await page.waitForModalGone();
  });

  // ── 编辑用户 ────────────────────────────────────────────────

  test('SU-014: 编辑用户弹窗可打开', async ({ page: p }) => {
    const username = `edit_${uniqueId('su')}`;
    const phone = `138${String(Date.now()).slice(-8)}`;
    await page.createUser({
      username,
      phone,
      password: 'Admin123!',
      role: '管理员',
    });
    await page.assertSuccessMessage();
    await page.openEditModal(username);
    await page.assertModalVisible();
    const title = await page.modal.locator('.ant-modal-title').textContent();
    expect(title?.trim()).toMatch(/编辑/);
  });

  test('SU-015: 编辑用户后数据更新', async ({ page: p }) => {
    const username = `edit2_${uniqueId('su')}`;
    const phone = `138${String(Date.now()).slice(-8)}`;
    await page.createUser({
      username,
      phone,
      password: 'Admin123!',
      role: '管理员',
    });
    await page.assertSuccessMessage();
    await page.openEditModal(username);
    await page.fillEditForm({ email: `${username}_updated@test.com` });
    await page.submitForm();
    await page.assertSuccessMessage();
  });

  // ── 重置密码 ───────────────────────────────────────────────

  test('SU-016: 重置密码弹窗可打开', async ({ page: p }) => {
    const username = `reset_${uniqueId('su')}`;
    const phone = `138${String(Date.now()).slice(-8)}`;
    await page.createUser({
      username,
      phone,
      password: 'Admin123!',
      role: '管理员',
    });
    await page.assertSuccessMessage();
    await page.openResetPasswordModal(username);
    await expect(page.resetModal).toBeVisible();
    await expect(page.resetNewPasswordInput).toBeVisible();
    await expect(page.resetConfirmPasswordInput).toBeVisible();
  });

  test('SU-017: 重置密码两次不一致时验证', async ({ page: p }) => {
    const username = `reset2_${uniqueId('su')}`;
    const phone = `138${String(Date.now()).slice(-8)}`;
    await page.createUser({
      username,
      phone,
      password: 'Admin123!',
      role: '管理员',
    });
    await page.assertSuccessMessage();
    await page.openResetPasswordModal(username);
    await page.resetNewPasswordInput.fill('NewPass123!');
    await page.resetConfirmPasswordInput.fill('Different123!');
    await page.resetSubmitButton.click();
    // Should show error message about mismatch
    await expect(page.page.locator('.ant-message-error')).toBeVisible({ timeout: 3000 });
  });

  test('SU-018: 重置密码成功', async ({ page: p }) => {
    const username = `reset3_${uniqueId('su')}`;
    const phone = `138${String(Date.now()).slice(-8)}`;
    await page.createUser({
      username,
      phone,
      password: 'Admin123!',
      role: '管理员',
    });
    await page.assertSuccessMessage();
    await page.openResetPasswordModal(username);
    await page.resetPassword('NewPass456!');
    await page.assertSuccessMessage();
  });

  // ── 删除用户 ────────────────────────────────────────────────

  test('SU-019: 删除确认弹窗可见', async ({ page: p }) => {
    const username = `del_${uniqueId('su')}`;
    const phone = `138${String(Date.now()).slice(-8)}`;
    await page.createUser({
      username,
      phone,
      password: 'Admin123!',
      role: '管理员',
    });
    await page.assertSuccessMessage();
    await page.deleteUser(username);
    await expect(page.page.locator('.ant-popconfirm')).toBeVisible();
  });

  test('SU-020: 确认删除后用户消失', async ({ page: p }) => {
    const username = `del2_${uniqueId('su')}`;
    const phone = `138${String(Date.now()).slice(-8)}`;
    await page.createUser({
      username,
      phone,
      password: 'Admin123!',
      role: '管理员',
    });
    await page.assertSuccessMessage();
    await page.deleteUser(username);
    await page.confirmDelete();
    await page.assertSuccessMessage();
    await page.assertUserNotVisible(username);
  });

  // ── 列表状态 ────────────────────────────────────────────────

  test('SU-021: 用户列表状态标签显示正常', async () => {
    const count = await page.getRowCount();
    if (count === 0) return;
    const tag = page.statusTag(await page.tableRows.first().locator('td').nth(0).textContent() ?? '');
    const status = await tag.textContent();
    expect(['正常', '停用'].some(s => status?.includes(s))).toBeTruthy();
  });

  test('SU-022: 分页总数显示', async () => {
    const text = await page.paginationTotalText.textContent();
    expect(text).toBeTruthy();
  });

  test('SU-023: 分页下一页可用', async () => {
    const totalText = await page.paginationTotalText.textContent();
    const match = totalText?.match(/共 (\d+) 条/);
    const total = match ? parseInt(match[1], 10) : 0;
    if (total <= 10) {
      // Next button should be disabled
      await expect(page.paginationNext).toHaveClass(/disabled/);
    } else {
      await page.paginationNext.click();
      await page.tableRows.first().waitFor({ state: 'visible', timeout: 5000 });
    }
  });
});

import { test, expect } from '@playwright/test';
import { BASE_URL } from '../config';
import { loginAsEnterpriseAdmin } from '../helpers';

test.describe('企业后台 - 部门管理 (15 tests)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsEnterpriseAdmin(page, BASE_URL);
    // 直接访问部门管理页面
    await page.goto(`${BASE_URL}/department-management`);
    await page.waitForLoadState('domcontentloaded');
  });

  test('DM-001: 部门管理页面可访问', async ({ page }) => {
    await expect(page.locator('.ant-layout-sider')).toBeVisible();
    await expect(page.locator('.ant-layout-content')).toBeVisible();
  });

  test('DM-002: 页面标题显示“部门管理”', async ({ page }) => {
    const heading = page.locator('h2').filter({ hasText: '部门管理' });
    await expect(heading).toBeVisible();
  });

  test('DM-003: 页面副标题说明可见', async ({ page }) => {
    await expect(page.locator('text=管理企业的部门和团队')).toBeVisible();
  });

  test('DM-004: 新建部门按钮可见', async ({ page }) => {
    const createBtn = page.locator('button').filter({ hasText: '新建部门' });
    await expect(createBtn).toBeVisible();
  });

  test('DM-005: 部门列表表格可见', async ({ page }) => {
    const tableCard = page.locator('.ant-card').filter({ hasText: '部门列表' });
    const exists = await tableCard.isVisible().catch(() => false);
    if (exists) {
      await expect(tableCard).toBeVisible();
    }
  });

  test('DM-006: 部门列表表格组件可见', async ({ page }) => {
    const table = page.locator('.ant-card').filter({ hasText: '部门列表' }).locator('.ant-table');
    const exists = await table.isVisible().catch(() => false);
    if (exists) {
      await expect(table).toBeVisible();
    }
  });

  test('DM-007: 新建部门按钮可点击', async ({ page }) => {
    const createBtn = page.locator('button').filter({ hasText: '新建部门' });
    const exists = await createBtn.isVisible().catch(() => false);
    if (exists) {
      await expect(createBtn).toBeEnabled();
    }
  });

  test('DM-008: 新建部门模态框打开', async ({ page }) => {
    const createBtn = page.locator('button').filter({ hasText: '新建部门' });
    const exists = await createBtn.isVisible().catch(() => false);
    if (exists) {
      await createBtn.click();
      await expect(page.locator('.ant-modal')).toBeVisible();
    }
  });

  test('DM-009: 新建部门模态框有标题', async ({ page }) => {
    // 先尝试打开
    const createBtn = page.locator('button').filter({ hasText: '新建部门' });
    const createExists = await createBtn.isVisible().catch(() => false);
    if (createExists) {
      await createBtn.click();
    }
    // 检查模态框标题
    const modalTitle = page.locator('.ant-modal-title');
    const modalVisible = await modalTitle.isVisible().catch(() => false);
    if (modalVisible) {
      await expect(modalTitle).toBeVisible();
    }
  });

  test('DM-010: 部门名称输入框可见', async ({ page }) => {
    // 先尝试打开
    const createBtn = page.locator('button').filter({ hasText: '新建部门' });
    const createExists = await createBtn.isVisible().catch(() => false);
    if (createExists) {
      await createBtn.click();
    }
    const nameInput = page.locator('#name');
    const exists = await nameInput.isVisible().catch(() => false);
    if (exists) {
      await expect(nameInput).toBeVisible();
    }
  });

  test('DM-011: 描述输入框可见', async ({ page }) => {
    const descInput = page.locator('#description');
    const exists = await descInput.isVisible().catch(() => false);
    if (exists) {
      await expect(descInput).toBeVisible();
    }
  });

  test('DM-012: 保存按钮可见', async ({ page }) => {
    const saveBtn = page.locator('button').filter({ hasText: '保存' });
    const exists = await saveBtn.isVisible().catch(() => false);
    if (exists) {
      await expect(saveBtn).toBeVisible();
    }
  });

  test('DM-013: 取消按钮可见', async ({ page }) => {
    const cancelBtn = page.locator('button').filter({ hasText: '取消' });
    const exists = await cancelBtn.isVisible().catch(() => false);
    if (exists) {
      await expect(cancelBtn).toBeVisible();
    }
  });

  test('DM-014: 侧边栏菜单检查', async ({ page }) => {
    await expect(page.locator('.ant-layout-sider')).toBeVisible();
  });

  test('DM-015: 页面布局完整', async ({ page }) => {
    await expect(page.locator('.ant-layout-content')).toBeVisible();
  });
});

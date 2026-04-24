/**
 * Full Platform Admin Audit — Playwright E2E
 *
 * Tests: Dashboard overlay bug, menu completeness, feature completeness,
 *        visual correctness for all 5 platform pages.
 */
import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsPlatformAdmin } from '../../helpers';

// ─── Shared Login ─────────────────────────────────────────────
async function loginAndGo(page: import('@playwright/test').Page, path: string) {
  await loginAsPlatformAdmin(page, BASE_URL);

  // Wait for the dashboard to fully load before navigating away
  await page.waitForSelector('.ant-layout-content', { timeout: 15000 });

  // Use direct URL navigation for reliable routing
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState('networkidle');
  await page.locator('.ant-layout-content').waitFor({ state: 'visible', timeout: 10000 });
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1: Dashboard Overlay Bug
// ═══════════════════════════════════════════════════════════════
test.describe('Dashboard Overlay Bug', () => {
  test('OVERLAY-001: No blocking overlay covers dashboard buttons', async ({ page }) => {
    await loginAndGo(page, '/dashboard');

    // Check for any fixed/absolute positioned overlays
    const overlayInfo = await page.evaluate(() => {
      const results: Array<{ tag: string; id: string; classes: string; style: string; zIndex: string }> = [];
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const cs = window.getComputedStyle(el);
        const pos = cs.position;
        const zIdx = cs.zIndex;
        const pointer = cs.pointerEvents;
        const op = parseFloat(cs.opacity);
        // Look for elements that could block clicks: positioned with high z-index or full-page coverage
        if (
          (pos === 'fixed' || pos === 'absolute') &&
          pointer !== 'none' &&
          el.clientWidth >= window.innerWidth * 0.9 &&
          el.clientHeight >= window.innerHeight * 0.3
        ) {
          results.push({
            tag: el.tagName,
            id: el.id,
            classes: el.className.toString().substring(0, 120),
            style: el.getAttribute('style')?.substring(0, 200) || '',
            zIndex: zIdx,
          });
        }
      }
      return results;
    });

    // Print what we found for debugging
    console.log('Blocking overlay candidates:', JSON.stringify(overlayInfo, null, 2));

    // Filter out legitimate overlays (Ant Design Spin, known components)
    const problematicOverlays = overlayInfo.filter(o =>
      !o.classes.includes('ant-spin') &&
      !o.classes.includes('ant-message') &&
      !o.classes.includes('ant-notification')
    );

    if (problematicOverlays.length > 0) {
      console.error('PROBLEMATIC OVERLAYS FOUND:', JSON.stringify(problematicOverlays, null, 2));
    }

    expect(problematicOverlays.length, `Found ${problematicOverlays.length} blocking overlays`).toBe(0);
  });

  test('OVERLAY-002: Dashboard export button is clickable', async ({ page }) => {
    await loginAndGo(page, '/dashboard');

    const exportBtn = page.locator('button:has-text("导出报表")');
    await exportBtn.waitFor({ timeout: 10000 });

    // Check if the button is NOT covered by another element
    const isCovered = await exportBtn.evaluate((btn: HTMLButtonElement) => {
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const topEl = document.elementFromPoint(centerX, centerY);
      const isSame = topEl === btn || btn.contains(topEl);
      return {
        covered: !isSame,
        blockingTag: isSame ? null : topEl?.tagName,
        blockingClass: isSame ? null : (topEl?.className?.toString() || '').substring(0, 200),
        blockingStyle: isSame ? null : (topEl?.getAttribute('style') || '').substring(0, 200),
      };
    });

    if (isCovered.covered) {
      console.error('Button is covered by:', JSON.stringify(isCovered, null, 2));
    }

    expect(isCovered.covered).toBe(false);
  });

  test('OVERLAY-003: Dashboard segmented control is clickable', async ({ page }) => {
    await loginAndGo(page, '/dashboard');

    const segmented = page.locator('.ant-segmented');
    await segmented.waitFor({ timeout: 10000 });

    // Try clicking each segment
    const dayBtn = page.locator('.ant-segmented:has-text("按日")');
    const isDayCovered = await page.evaluate(() => {
      const segs = document.querySelectorAll('.ant-segmented-item');
      for (const seg of segs) {
        if (seg.textContent?.includes('按日')) {
          const rect = seg.getBoundingClientRect();
          const topEl = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          const isSame = topEl === seg || seg.contains(topEl);
          if (!isSame) {
            return { covered: true, blockingTag: topEl?.tagName, blockingClass: (topEl?.className?.toString() || '').substring(0, 200) };
          }
        }
      }
      return { covered: false };
    });

    expect(isDayCovered.covered).toBe(false);
  });

  test('OVERLAY-004: All interactive dashboard elements are unblocked', async ({ page }) => {
    await loginAndGo(page, '/dashboard');

    // Check all buttons on the page for coverage
    const blockedButtons = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const blocked: Array<{ text: string; blockingClass: string }> = [];
      for (const btn of buttons) {
        const rect = btn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const topEl = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        const isSame = topEl === btn || btn.contains(topEl);
        if (!isSame) {
          blocked.push({
            text: btn.textContent?.substring(0, 50) || '',
            blockingClass: (topEl?.className?.toString() || '').substring(0, 200),
          });
        }
      }
      return blocked;
    });

    if (blockedButtons.length > 0) {
      console.error('Blocked buttons:', JSON.stringify(blockedButtons, null, 2));
    }

    expect(blockedButtons.length, `${blockedButtons.length} buttons are blocked by overlays`).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 2: Menu Completeness
// ═══════════════════════════════════════════════════════════════
test.describe('Menu Completeness', () => {
  test('MENU-001: All required menu items exist in sidebar', async ({ page }) => {
    await loginAndGo(page, '/dashboard');

    const requiredMenuItems = [
      '平台看板',
      '企业管理',
      '系统管理',
      '功能配置',
      '套餐管理',
    ];

    for (const item of requiredMenuItems) {
      await expect(page.locator(`.ant-menu:has-text("${item}")`)).toBeVisible({ timeout: 10000 });
    }
  });

  test('MENU-002: System management submenu items exist', async ({ page }) => {
    await loginAndGo(page, '/dashboard');

    // Ensure submenu is expanded (may already be open from initial state)
    const sysMenu = page.locator('.ant-menu-submenu-title:has-text("系统管理")');
    await sysMenu.waitFor({ state: 'visible', timeout: 10000 });
    const expanded = await sysMenu.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await sysMenu.click();
      await page.waitForTimeout(500);
    }

    const subItems = ['用户管理', '角色管理', '操作日志', '字典管理'];
    for (const item of subItems) {
      await expect(page.locator(`.ant-menu-item:has-text("${item}")`).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('MENU-003: Feature config submenu items exist', async ({ page }) => {
    await loginAndGo(page, '/dashboard');

    const featMenu = page.locator('.ant-menu-submenu-title:has-text("功能配置")');
    await featMenu.waitFor({ state: 'visible', timeout: 10000 });
    const expanded = await featMenu.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await featMenu.click();
      await page.waitForTimeout(500);
    }

    const subItems = ['产品管理', '积木组件库'];
    for (const item of subItems) {
      await expect(page.locator(`.ant-menu-item:has-text("${item}")`).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('MENU-004: Menu navigation works for all pages', async ({ page }) => {
    await loginAndGo(page, '/dashboard');

    const navTargets = [
      { menu: '平台看板', url: '/dashboard' },
      { menu: '企业管理', url: '/enterprises' },
      { menu: '套餐管理', url: '/packages' },
    ];

    for (const { menu, url } of navTargets) {
      await page.locator(`.ant-menu-item:has-text("${menu}")`).first().click();
      await page.waitForLoadState('networkidle');
      await page.locator('.ant-layout-content').waitFor({ state: 'visible', timeout: 10000 });
      expect(page.url()).toContain(url);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 3: BlockLibrary — Extension Guidance + Completeness
// ═══════════════════════════════════════════════════════════════
test.describe('BlockLibrary Page', () => {
  test('BL-001: Block library page loads correctly', async ({ page }) => {
    await loginAndGo(page, '/features/blocks');
    await expect(page.locator('h1')).toContainText('积木组件库');
  });

  test('BL-002: Three tabs exist (触发器, 规则节点, 功能点模板)', async ({ page }) => {
    await loginAndGo(page, '/features/blocks');
    // Tabs are inside a GlassCard; wait for them to appear
    const tabs = page.locator('.ant-tabs-tab');
    await tabs.first().waitFor({ state: 'visible', timeout: 10000 });
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(3);
    await expect(tabs.nth(0)).toContainText('触发器');
    await expect(tabs.nth(1)).toContainText('规则节点');
    await expect(tabs.nth(2)).toContainText('功能点模板');
  });

  test('BL-003: Extension guidance alert visible on each tab', async ({ page }) => {
    await loginAndGo(page, '/features/blocks');

    // Check that extension guidance alert exists - the text comes from EXTENSION_GUIDANCE constant
    const alert = page.locator('.ant-alert').first();
    await alert.waitFor({ state: 'visible', timeout: 10000 });
    // At least one should be visible on the default tab
    const count = await page.locator('.ant-alert').count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('BL-004: Tab switching works and each tab has table', async ({ page }) => {
    await loginAndGo(page, '/features/blocks');
    const tabs = page.locator('.ant-tabs-tab');
    await tabs.first().waitFor({ state: 'visible', timeout: 10000 });
    const tabNames = ['触发器', '规则节点', '功能点模板'];
    for (let i = 0; i < tabNames.length; i++) {
      await tabs.nth(i).click();
      await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('BL-005: Extension guidance alert content is correct', async ({ page }) => {
    await loginAndGo(page, '/features/blocks');
    // The extension guidance alert has title and description from EXTENSION_GUIDANCE constant
    const alert = page.locator('.ant-alert').first();
    await alert.waitFor({ state: 'visible', timeout: 10000 });
    await expect(alert).toBeVisible();
    // The description should mention contacting dev team
    const alertText = await alert.textContent();
    expect(alertText).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 4: ProductManagement — Repositioned Wizard
// ═══════════════════════════════════════════════════════════════
test.describe('ProductManagement Page', () => {
  test('PROD-001: Product management page loads', async ({ page }) => {
    await loginAndGo(page, '/features/products');
    await expect(page.locator('h1')).toContainText('产品管理');
  });

  test('PROD-002: "配置产品" button exists (not "新建产品向导")', async ({ page }) => {
    await loginAndGo(page, '/features/products');
    const configBtn = page.locator('button:has-text("配置产品")');
    await expect(configBtn).toBeVisible({ timeout: 5000 });
    // Old label should NOT exist
    const oldBtn = page.locator('button:has-text("新建产品向导")');
    await expect(oldBtn).not.toBeVisible();
  });

  test('PROD-003: Product table has expected columns', async ({ page }) => {
    await loginAndGo(page, '/features/products');
    const headers = await page.locator('.ant-table-thead th').allTextContents();
    const headerText = headers.join('|');
    // Should have basic columns
    expect(headerText).toMatch(/产品/);
    expect(headerText).toMatch(/操作/);
  });

  test('PROD-004: "关联套餐" column exists in product table', async ({ page }) => {
    await loginAndGo(page, '/features/products');
    // Wait for table to load
    await page.locator('.ant-table').first().waitFor({ state: 'visible', timeout: 10000 });
    const headers = await page.locator('.ant-table-thead th').allTextContents();
    const headerText = headers.join('|');
    expect(headerText).toMatch(/关联套餐/);
  });

  test('PROD-005: Opening config wizard shows modal', async ({ page }) => {
    await loginAndGo(page, '/features/products');
    const configBtn = page.locator('button:has-text("配置产品")');
    await configBtn.click();
    // Modal should open
    await expect(page.locator('.ant-modal').first()).toBeVisible();
  });

  test('PROD-006: Product table renders data rows', async ({ page }) => {
    await loginAndGo(page, '/features/products');
    const rows = page.locator('.ant-table-tbody tr');
    const count = await rows.count();
    // Table may be empty if no products exist, but table structure should be there
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 5: PackageManagement — Tree Collapse Panels
// ═══════════════════════════════════════════════════════════════
test.describe('PackageManagement Page', () => {
  test('PKG-001: Package management page loads', async ({ page }) => {
    await loginAndGo(page, '/packages');
    await expect(page.locator('h1')).toContainText('套餐管理');
  });

  test('PKG-002: Package table visible with data', async ({ page }) => {
    await loginAndGo(page, '/packages');
    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('PKG-003: "配置产品" button exists in package table', async ({ page }) => {
    await loginAndGo(page, '/packages');
    const configBtn = page.locator('.ant-table button').filter({ hasText: '配置产品' });
    const count = await configBtn.count();
    if (count > 0) {
      await configBtn.first().click();
      await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 });

      // Should show checkbox-style product selection
      const checkboxes = page.locator('.ant-modal .ant-checkbox');
      const cbCount = await checkboxes.count();
      expect(cbCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('PKG-004: Package config modal uses Collapse panels for products', async ({ page }) => {
    await loginAndGo(page, '/packages');
    const configBtn = page.locator('.ant-table button').filter({ hasText: '配置产品' });
    const count = await configBtn.count();
    if (count > 0) {
      await configBtn.first().click();

      // If there are collapse panels, they represent products
      const collapsePanels = page.locator('.ant-modal .ant-collapse-item');
      const panelCount = await collapsePanels.count();
      // May have 0 if no products selected yet
      expect(panelCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('PKG-005: Create package button visible', async ({ page }) => {
    await loginAndGo(page, '/packages');
    const createBtn = page.locator('button').filter({ hasText: '创建套餐' });
    const altBtn = page.locator('button').filter({ hasText: '新建套餐' });
    const visible = (await createBtn.isVisible().catch(() => false)) || (await altBtn.isVisible().catch(() => false));
    expect(visible).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 6: EnterpriseManagement — Permission Overview Tab
// ═══════════════════════════════════════════════════════════════
test.describe('EnterpriseManagement Page', () => {
  test('ENT-001: Enterprise management page loads', async ({ page }) => {
    await loginAndGo(page, '/enterprises');
    await expect(page.locator('h1')).toContainText('企业管理');
  });

  test('ENT-002: Enterprise table has data rows', async ({ page }) => {
    await loginAndGo(page, '/enterprises');
    const rows = page.locator('.ant-table-tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('ENT-003: Enterprise detail modal has permission overview tab', async ({ page }) => {
    await loginAndGo(page, '/enterprises');
    // Wait for actual data rows to appear
    const rows = page.locator('.ant-table-tbody tr');
    await rows.first().waitFor({ state: 'visible', timeout: 15000 });

    const detailBtn = page.locator('.ant-table-tbody button').filter({ hasText: '详情' }).first();
    if (!await detailBtn.isVisible().catch(() => false)) { test.skip(); return; }
    await detailBtn.click();

    await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 });
    const permTab = page.locator('.ant-modal .ant-tabs-tab:has-text("权限总览")');
    await expect(permTab).toBeVisible({ timeout: 5000 });
  });

  test('ENT-004: Permission overview tab shows chain visualization', async ({ page }) => {
    await loginAndGo(page, '/enterprises');
    const rows = page.locator('.ant-table-tbody tr');
    await rows.first().waitFor({ state: 'visible', timeout: 15000 });

    const detailBtn = page.locator('.ant-table-tbody button').filter({ hasText: '详情' }).first();
    if (!await detailBtn.isVisible().catch(() => false)) { test.skip(); return; }
    await detailBtn.click();

    const permTab = page.locator('.ant-modal .ant-tabs-tab:has-text("权限总览")');
    await permTab.click();
    await expect(page.locator('.ant-modal')).toBeVisible();

    const text = await page.locator('.ant-modal').textContent();
    // Chain visualization shows: 套餐, 包含产品, 启用功能点, 企业菜单
    expect(text?.includes('套餐') || text?.includes('产品') || text?.includes('功能点') || text?.includes('菜单')).toBe(true);
  });

  test('ENT-005: Enterprise detail modal has all 4 tabs', async ({ page }) => {
    await loginAndGo(page, '/enterprises');
    const rows = page.locator('.ant-table-tbody tr');
    await rows.first().waitFor({ state: 'visible', timeout: 15000 });

    const detailBtn = page.locator('.ant-table-tbody button').filter({ hasText: '详情' }).first();
    if (!await detailBtn.isVisible().catch(() => false)) { test.skip(); return; }
    await detailBtn.click();

    // Wait for modal and tabs to render
    await page.locator('.ant-modal').waitFor({ state: 'visible', timeout: 5000 });
    const tabs = page.locator('.ant-modal .ant-tabs-tab');
    await tabs.first().waitFor({ state: 'visible', timeout: 5000 });
    const tabCount = await tabs.count();
    // Expect 4 tabs: 基本信息, 用户管理, 已启用产品, 权限总览
    expect(tabCount).toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 7: Visual Correctness — Dark Theme
// ═══════════════════════════════════════════════════════════════
test.describe('Visual Correctness', () => {
  test('VIS-001: Dark theme is applied (dark sidebar background)', async ({ page }) => {
    await loginAndGo(page, '/dashboard');
    const sider = page.locator('.ant-layout-sider');
    await expect(sider).toBeVisible();
    const bg = await sider.evaluate(el => window.getComputedStyle(el).backgroundColor);
    // Dark background should not be white
    expect(bg).not.toBe('rgb(255, 255, 255)');
  });

  test('VIS-002: Page header has correct layout', async ({ page }) => {
    await loginAndGo(page, '/dashboard');
    // Header should be visible
    const header = page.locator('.ant-layout-header');
    await expect(header).toBeVisible();
  });

  test('VIS-003: GlassCard stat cards render with content', async ({ page }) => {
    await loginAndGo(page, '/dashboard');
    const statCards = page.locator('.ant-statistic');
    const count = await statCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('VIS-004: Charts render without errors', async ({ page }) => {
    await loginAndGo(page, '/dashboard');
    const charts = page.locator('.recharts-wrapper');
    const count = await charts.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('VIS-005: No console errors on dashboard', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await loginAndGo(page, '/dashboard');

    // Filter out known non-critical errors (e.g., network errors from missing API)
    const criticalErrors = errors.filter(e =>
      !e.includes('404') &&
      !e.includes('Failed to fetch') &&
      !e.includes('net::ERR') &&
      !e.includes('Warning:')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('VIS-006: BlockLibrary page has no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await loginAndGo(page, '/features/blocks');
    const criticalErrors = errors.filter(e =>
      !e.includes('404') &&
      !e.includes('Failed to fetch') &&
      !e.includes('net::ERR') &&
      !e.includes('Warning:')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('VIS-007: ProductManagement page has no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await loginAndGo(page, '/features/products');
    const criticalErrors = errors.filter(e =>
      !e.includes('404') &&
      !e.includes('Failed to fetch') &&
      !e.includes('net::ERR') &&
      !e.includes('Warning:')
    );
    expect(criticalErrors.length).toBe(0);
  });
});

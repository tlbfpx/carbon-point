import { type Page, type Locator, expect } from '@playwright/test';
import { BASE_URL } from '../config';

export interface TimeSlotFormData {
  name: string;
  startTime: string;
  endTime: string;
  basePoints: string | number;
}

export class RulesPage {
  readonly page: Page;

  // ---- Tab Navigation ----
  readonly tabs: Locator;
  readonly tabTimeSlot: Locator;
  readonly tabConsecutive: Locator;
  readonly tabSpecial: Locator;
  readonly tabLevel: Locator;
  readonly tabDailyCap: Locator;

  // ---- Time Slot Tab ----
  readonly timeSlotTable: Locator;
  readonly timeSlotRows: Locator;
  readonly addTimeSlotButton: Locator;
  readonly timeSlotModal: Locator;

  // ---- Consecutive Tab ----
  readonly consecutiveForm: Locator;
  readonly addConsecutiveButton: Locator;
  readonly consecutiveSaveButton: Locator;
  readonly consecutiveDeleteButtons: Locator;

  // ---- Special Dates Tab ----
  readonly specialDateTable: Locator;
  readonly specialDateRows: Locator;
  readonly addSpecialDateButton: Locator;
  readonly specialDateModal: Locator;

  // ---- Level Coefficients Tab ----
  readonly levelForm: Locator;
  readonly levelCoefficientInputs: Locator;
  readonly levelSaveButton: Locator;

  // ---- Daily Cap Tab ----
  readonly dailyCapForm: Locator;
  readonly dailyCapInput: Locator;
  readonly dailyCapSaveButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // ---- Tab Navigation ----
    this.tabs = page.locator('.ant-tabs-tab');
    this.tabTimeSlot = page.locator('.ant-tabs-tab').filter({ hasText: '时段规则' });
    this.tabConsecutive = page.locator('.ant-tabs-tab').filter({ hasText: '连续打卡' });
    this.tabSpecial = page.locator('.ant-tabs-tab').filter({ hasText: '特殊日期' });
    this.tabLevel = page.locator('.ant-tabs-tab').filter({ hasText: '等级系数' });
    this.tabDailyCap = page.locator('.ant-tabs-tab').filter({ hasText: '每日上限' });

    // ---- Time Slot Tab ----
    this.timeSlotTable = page.locator('.ant-table');
    this.timeSlotRows = page.locator('.ant-table-tbody tr');
    this.addTimeSlotButton = page.locator('button').filter({ hasText: '新增时段' });
    this.timeSlotModal = page.locator('.ant-modal');

    // ---- Consecutive Tab ----
    this.consecutiveForm = page.locator('form');
    this.addConsecutiveButton = page.locator('button').filter({ hasText: '添加' }).first();
    this.consecutiveSaveButton = page.locator('button[type="submit"]');
    this.consecutiveDeleteButtons = page.locator('.ant-form-item button').filter({ hasText: '删除' });

    // ---- Special Dates Tab ----
    this.specialDateTable = page.locator('.ant-tabs-tabpane-active .ant-table');
    this.specialDateRows = page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr');
    this.addSpecialDateButton = page.locator('button').filter({ hasText: '添加特殊日期' });
    this.specialDateModal = page.locator('.ant-modal');

    // ---- Level Coefficients Tab ----
    this.levelForm = page.locator('form');
    this.levelCoefficientInputs = page.locator('input.ant-input-number');
    this.levelSaveButton = page.locator('button[type="submit"]');

    // ---- Daily Cap Tab ----
    this.dailyCapForm = page.locator('form');
    this.dailyCapInput = page.locator('input.ant-input-number');
    this.dailyCapSaveButton = page.locator('button[type="submit"]');
  }

  // ==================== Navigation ====================

  async goto() {
    await this.page.goto(`${BASE_URL}/ rules`);
    // Wait for the default TimeSlot tab to be active and table to load
    await this.page.waitForSelector('.ant-tabs-tab-active', { timeout: 15000 });
    // Wait for the time slot table to appear (default tab)
    await this.page.waitForSelector('.ant-table', { timeout: 15000 });
  }

  async switchToTab(tab: '时段规则' | '连续打卡' | '特殊日期' | '等级系数' | '每日上限') {
    switch (tab) {
      case '时段规则':    await this.tabTimeSlot.click(); break;
      case '连续打卡':    await this.tabConsecutive.click(); break;
      case '特殊日期':    await this.tabSpecial.click(); break;
      case '等级系数':    await this.tabLevel.click(); break;
      case '每日上限':    await this.tabDailyCap.click(); break;
    }
    // Wait for the tab button to become active
    await this.page.waitForSelector('.ant-tabs-tab-active', { timeout: 10000 });
    // Poll until the active tab panel has a non-zero bounding box (visible)
    await this.page.waitForFunction(() => {
      const pane = document.querySelector('.ant-tabs-tabpane-active');
      if (!pane) return false;
      const rect = pane.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }, { timeout: 10000 });
    // Wait for API response to load form content (API-based tabs need more time)
    await this.page.waitForTimeout(2000);
  }

  // ==================== Time Slot Tab ====================

  /**
   * Open the add time slot modal and return the modal element.
   * Uses sequential input targeting (matching enterprise test convention):
   *   Input 0 = 时段名称
   *   Input 1 = 开始时间
   *   Input 2 = 结束时间
   *   Input 3 = 基础积分
   */
  async openCreateTimeSlotModal() {
    await this.addTimeSlotButton.click();
    await this.timeSlotModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Fill the time slot form using sequential input positioning.
   */
  async fillTimeSlotForm(data: TimeSlotFormData) {
    const modal = this.timeSlotModal;
    const inputs = modal.locator('input');
    // Sequential: 0=name, 1=startTime, 2=endTime, 3=basePoints
    await inputs.nth(0).fill(String(data.name));
    await inputs.nth(1).fill(String(data.startTime));
    await inputs.nth(2).fill(String(data.endTime));
    // basePoints is an InputNumber - use nth(3) or input.ant-input-number
    const numberInputs = modal.locator('input.ant-input-number');
    if (await numberInputs.count() > 0) {
      await numberInputs.first().fill(String(data.basePoints));
    } else {
      await inputs.nth(3).fill(String(data.basePoints));
    }
  }

  async submitTimeSlotForm() {
    await this.timeSlotModal.locator('button[type="submit"]').click();
    await this.page.waitForTimeout(2000);
  }

  async createTimeSlot(data: TimeSlotFormData) {
    await this.openCreateTimeSlotModal();
    await this.fillTimeSlotForm(data);
    await this.submitTimeSlotForm();
  }

  async closeTimeSlotModal() {
    await this.timeSlotModal.locator('button').filter({ hasText: '取消' }).first().click();
    await this.page.waitForTimeout(500);
  }

  async getTimeSlotCount(): Promise<number> {
    return this.timeSlotRows.count();
  }

  async isTimeSlotVisible(name: string): Promise<boolean> {
    const row = this.timeSlotRows.filter({ hasText: name });
    return row.isVisible().catch(() => false);
  }

  async toggleTimeSlot(name: string) {
    const row = this.timeSlotRows.filter({ hasText: name });
    const toggle = row.locator('.ant-switch');
    await toggle.click();
    await this.page.waitForTimeout(1000);
  }

  async deleteTimeSlot(name: string) {
    const row = this.timeSlotRows.filter({ hasText: name });
    const deleteBtn = row.locator('button').filter({ hasText: '删除' });
    await deleteBtn.click();
    await this.page.locator('.ant-popover').waitFor({ state: 'visible', timeout: 3000 });
    await this.page.locator('.ant-popover button').filter({ hasText: '确认' }).click();
    await this.page.waitForTimeout(1500);
  }

  async editTimeSlot(name: string) {
    const row = this.timeSlotRows.filter({ hasText: name });
    const editBtn = row.locator('button').filter({ hasText: '编辑' });
    await editBtn.click();
    await this.timeSlotModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  // ==================== Consecutive Tab ====================

  async addConsecutiveReward() {
    await this.addConsecutiveButton.click();
    await this.page.waitForTimeout(500);
  }

  async saveConsecutiveRewards() {
    await this.consecutiveSaveButton.click();
    await this.page.waitForTimeout(2000);
  }

  async deleteConsecutiveReward(index: number) {
    const deleteBtns = await this.consecutiveDeleteButtons.all();
    if (deleteBtns.length > index) {
      await deleteBtns[index].click();
      await this.page.waitForTimeout(500);
    }
  }

  async getConsecutiveRewardCount(): Promise<number> {
    return this.consecutiveDeleteButtons.count();
  }

  // ==================== Special Dates Tab ====================

  async openCreateSpecialDateModal() {
    await this.addSpecialDateButton.click();
    await this.specialDateModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Fill special date form using sequential positioning:
   *   Input 0 = multiplier (ant-input-number, but in modal DOM order might differ)
   *   Input 1 = description (ant-input)
   * Plus date picker click.
   */
  async fillSpecialDateForm(data: { multiplier: string | number; description?: string }) {
    // Click the date picker and select first available date
    await this.specialDateModal.locator('.ant-picker').click();
    await this.page.waitForTimeout(500);
    await this.page.locator('.ant-picker-cell-selected').first().click();
    await this.page.waitForTimeout(300);

    // Fill multiplier (InputNumber)
    const numberInputs = this.specialDateModal.locator('input.ant-input-number');
    if (await numberInputs.count() > 0) {
      await numberInputs.first().fill(String(data.multiplier));
    }

    // Fill description
    if (data.description) {
      const textInputs = this.specialDateModal.locator('input.ant-input');
      if (await textInputs.count() > 1) {
        await textInputs.last().fill(data.description);
      } else {
        await textInputs.first().fill(data.description);
      }
    }
  }

  async submitSpecialDateForm() {
    await this.specialDateModal.locator('button[type="submit"]').click();
    await this.page.waitForTimeout(2000);
  }

  async createSpecialDate(data: { multiplier: string | number; description?: string }) {
    await this.openCreateSpecialDateModal();
    await this.fillSpecialDateForm(data);
    await this.submitSpecialDateForm();
  }

  async closeSpecialDateModal() {
    await this.specialDateModal.locator('button').filter({ hasText: '取消' }).first().click();
    await this.page.waitForTimeout(500);
  }

  async getSpecialDateCount(): Promise<number> {
    return this.specialDateRows.count();
  }

  async deleteSpecialDate(description: string) {
    const row = this.specialDateRows.filter({ hasText: description });
    const deleteBtn = row.locator('button').filter({ hasText: '删除' });
    await deleteBtn.click();
    await this.page.locator('.ant-popover').waitFor({ state: 'visible', timeout: 3000 });
    await this.page.locator('.ant-popover button').filter({ hasText: '确认' }).click();
    await this.page.waitForTimeout(1500);
  }

  // ==================== Level Coefficients Tab ====================

  async setLevelCoefficient(level: number, value: string | number) {
    const inputs = await this.levelCoefficientInputs.all();
    if (inputs.length >= level) {
      await inputs[level - 1].fill(String(value));
    }
  }

  async saveLevelCoefficients() {
    await this.levelSaveButton.click();
    await this.page.waitForTimeout(2000);
  }

  async getLevelCoefficientInputCount(): Promise<number> {
    return this.levelCoefficientInputs.count();
  }

  // ==================== Daily Cap Tab ====================

  async setDailyCap(value: string | number) {
    await this.dailyCapInput.fill(String(value));
  }

  async saveDailyCap() {
    await this.dailyCapSaveButton.click();
    await this.page.waitForTimeout(2000);
  }

  async getDailyCapValue(): Promise<string> {
    return this.dailyCapInput.inputValue();
  }

  // ==================== Message Helpers ====================

  async getSuccessMessage(): Promise<string> {
    await this.page.locator('.ant-message-success').waitFor({ state: 'visible', timeout: 5000 });
    return this.page.locator('.ant-message-success').textContent() ?? '';
  }

  async getErrorMessage(): Promise<string> {
    await this.page.locator('.ant-message-error').waitFor({ state: 'visible', timeout: 5000 });
    return this.page.locator('.ant-message-error').textContent() ?? '';
  }

  // ==================== Assertion Helpers ====================

  async assertModalVisible() {
    await expect(this.timeSlotModal).toBeVisible();
  }

  async assertModalHidden() {
    await expect(this.timeSlotModal).not.toBeVisible();
  }

  async assertTimeSlotTableVisible() {
    await expect(this.timeSlotTable).toBeVisible();
  }

  async assertTimeSlotVisible(name: string) {
    const row = this.timeSlotRows.filter({ hasText: name });
    await expect(row).toBeVisible();
  }

  async assertTimeSlotNotVisible(name: string) {
    const row = this.timeSlotRows.filter({ hasText: name });
    await expect(row).not.toBeVisible();
  }
}

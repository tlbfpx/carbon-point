import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../../config';

export interface TimeSlotFormData {
  name: string;
  startTime: string;
  endTime: string;
  basePoints: string | number;
}

export class RulesPage {
  readonly page: Page;

  // Tab buttons (custom pill-style, not Ant Design tabs)
  readonly tabTimeSlot: Locator;
  readonly tabConsecutive: Locator;
  readonly tabSpecial: Locator;
  readonly tabLevel: Locator;
  readonly tabDailyCap: Locator;

  // Time Slot Tab
  readonly timeSlotTable: Locator;
  readonly timeSlotRows: Locator;
  readonly addTimeSlotButton: Locator;
  readonly timeSlotModal: Locator;

  // Consecutive Tab
  readonly consecutiveForm: Locator;
  readonly addConsecutiveButton: Locator;
  readonly consecutiveSaveButton: Locator;
  readonly consecutiveDeleteButtons: Locator;

  // Special Dates Tab
  readonly specialDateTable: Locator;
  readonly specialDateRows: Locator;
  readonly addSpecialDateButton: Locator;
  readonly specialDateModal: Locator;

  // Level Coefficients Tab
  readonly levelForm: Locator;
  readonly levelCoefficientInputs: Locator;
  readonly levelSaveButton: Locator;

  // Daily Cap Tab
  readonly dailyCapForm: Locator;
  readonly dailyCapInput: Locator;
  readonly dailyCapSaveButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // ---- Tab Navigation (custom button-based tabs) ----
    this.tabTimeSlot = page.getByRole('button', { name: /时间段规则/ });
    this.tabConsecutive = page.getByRole('button', { name: /连续奖励/ });
    this.tabSpecial = page.getByRole('button', { name: /特殊日期/ });
    this.tabLevel = page.getByRole('button', { name: /等级系数/ });
    this.tabDailyCap = page.getByRole('button', { name: /每日上限/ });

    // ---- Time Slot Tab ----
    this.timeSlotTable = page.locator('.ant-table');
    this.timeSlotRows = page.locator('.ant-table-tbody tr');
    this.addTimeSlotButton = page.locator('button').filter({ hasText: /添加时段|新增时段|新增/ }).first();
    this.timeSlotModal = page.locator('.ant-modal');

    // ---- Consecutive Tab ----
    this.consecutiveForm = page.locator('form');
    this.addConsecutiveButton = page.getByRole('button', { name: /添.*加|新增/ }).first();
    this.consecutiveSaveButton = page.locator('button[type="submit"]');
    this.consecutiveDeleteButtons = page.locator('button').filter({ hasText: '删除' });

    // ---- Special Dates Tab ----
    this.specialDateTable = page.locator('.ant-table');
    this.specialDateRows = page.locator('.ant-table-tbody tr');
    this.addSpecialDateButton = page.locator('button').filter({ hasText: /添加特殊日期|新增特殊日期/ });
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

  async goto() {
    await this.page.goto(`${BASE_URL}/rules`);
    await this.page.waitForSelector('h1', { timeout: 15000 });
  }

  async switchToTab(tab: '时间段规则' | '连续奖励' | '特殊日期' | '等级系数' | '每日上限') {
    switch (tab) {
      case '时间段规则':    await this.tabTimeSlot.click(); break;
      case '连续奖励':      await this.tabConsecutive.click(); break;
      case '特殊日期':      await this.tabSpecial.click(); break;
      case '等级系数':      await this.tabLevel.click(); break;
      case '每日上限':      await this.tabDailyCap.click(); break;
    }
    await this.page.waitForTimeout(500);
  }

  async openCreateTimeSlotModal() {
    const btn = this.addTimeSlotButton;
    const isVisible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
    if (isVisible) {
      await btn.click();
      await this.timeSlotModal.waitFor({ state: 'visible', timeout: 5000 });
    }
  }

  async fillTimeSlotForm(data: TimeSlotFormData) {
    const modal = this.timeSlotModal;
    const inputs = modal.locator('input');
    await inputs.nth(0).fill(String(data.name));
    await inputs.nth(1).fill(String(data.startTime));
    await inputs.nth(2).fill(String(data.endTime));
    const numberInputs = modal.locator('input.ant-input-number');
    if (await numberInputs.count() > 0) {
      await numberInputs.first().fill(String(data.basePoints));
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
    const modal = this.timeSlotModal;
    const cancelBtn = modal.locator('button').filter({ hasText: '取消' }).first();
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
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
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async deleteTimeSlot(name: string) {
    const row = this.timeSlotRows.filter({ hasText: name });
    const deleteBtn = row.locator('button').filter({ hasText: '删除' });
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
      await this.page.locator('.ant-popover').waitFor({ state: 'visible', timeout: 3000 });
      await this.page.locator('.ant-popover button').filter({ hasText: '确认' }).click();
      await this.page.waitForTimeout(1500);
    }
  }

  async editTimeSlot(name: string) {
    const row = this.timeSlotRows.filter({ hasText: name });
    const editBtn = row.locator('button').filter({ hasText: '编辑' });
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await this.timeSlotModal.waitFor({ state: 'visible', timeout: 5000 });
    }
  }

  async saveConsecutiveRewards() {
    const btn = this.consecutiveSaveButton;
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(2000);
    }
  }

  async getConsecutiveRewardCount(): Promise<number> {
    return this.consecutiveDeleteButtons.count();
  }

  async openCreateSpecialDateModal() {
    const btn = this.addSpecialDateButton;
    const isVisible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
    if (isVisible) {
      await btn.click();
      await this.specialDateModal.waitFor({ state: 'visible', timeout: 5000 });
    }
  }

  async fillSpecialDateForm(data: { multiplier: string | number; description?: string }) {
    const modal = this.specialDateModal;
    const picker = modal.locator('.ant-picker');
    if (await picker.isVisible().catch(() => false)) {
      await picker.click();
      await this.page.waitForTimeout(500);
      const selected = this.page.locator('.ant-picker-cell-selected').first();
      if (await selected.isVisible().catch(() => false)) {
        await selected.click();
        await this.page.waitForTimeout(300);
      }
    }
    const numberInputs = modal.locator('input.ant-input-number');
    if (await numberInputs.count() > 0) {
      await numberInputs.first().fill(String(data.multiplier));
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

  async getSpecialDateCount(): Promise<number> {
    return this.specialDateRows.count();
  }

  async setLevelCoefficient(level: number, value: string | number) {
    const inputs = await this.levelCoefficientInputs.all();
    if (inputs.length >= level) {
      await inputs[level - 1].fill(String(value));
    }
  }

  async saveLevelCoefficients() {
    const btn = this.levelSaveButton;
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(2000);
    }
  }

  async setDailyCap(value: string | number) {
    const input = this.dailyCapInput;
    if (await input.isVisible().catch(() => false)) {
      await input.fill(String(value));
    }
  }

  async saveDailyCap() {
    const btn = this.dailyCapSaveButton;
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(2000);
    }
  }

  async getSuccessMessage(): Promise<string> {
    await this.page.locator('.ant-message-success').waitFor({ state: 'visible', timeout: 5000 });
    return this.page.locator('.ant-message-success').textContent() ?? '';
  }

  async getErrorMessage(): Promise<string> {
    await this.page.locator('.ant-message-error').waitFor({ state: 'visible', timeout: 5000 });
    return this.page.locator('.ant-message-error').textContent() ?? '';
  }
}

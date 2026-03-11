/**
 * Page Object Model 基础类
 * 所有 Page Object 的基类
 */

import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object 基类
 */
export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * 导航到指定 URL
   */
  async goto(url: string): Promise<void> {
    await this.page.goto(url);
  }

  /**
   * 等待页面加载完成
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * 截图
   */
  async screenshot(name: string): Promise<Buffer> {
    return await this.page.screenshot({ path: `${name}.png` });
  }

  /**
   * 等待元素出现
   */
  async waitForSelector(selector: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(selector, { timeout });
  }

  /**
   * 等待元素消失
   */
  async waitForSelectorHidden(selector: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  /**
   * 点击元素
   */
  async click(selector: string): Promise<void> {
    await this.page.click(selector);
  }

  /**
   * 填充输入框
   */
  async fill(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value);
  }

  /**
   * 获取元素文本
   */
  async getText(selector: string): Promise<string> {
    return (await this.page.textContent(selector)) || '';
  }

  /**
   * 检查元素是否可见
   */
  async isVisible(selector: string): Promise<boolean> {
    return await this.page.isVisible(selector);
  }

  /**
   * 检查元素是否启用
   */
  async isEnabled(selector: string): Promise<boolean> {
    return await this.page.isEnabled(selector);
  }

  /**
   * 等待指定时间
   */
  async wait(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /**
   * 刷新页面
   */
  async reload(): Promise<void> {
    await this.page.reload();
  }

  /**
   * 获取当前 URL
   */
  get url(): string {
    return this.page.url();
  }

  /**
   * 获取页面标题
   */
  async title(): Promise<string> {
    return await this.page.title();
  }
}

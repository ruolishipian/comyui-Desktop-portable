/**
 * 主页面 Page Object
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * 主页面 Page Object
 */
export class MainPage extends BasePage {
  // 定位器
  readonly startButton: Locator;
  readonly stopButton: Locator;
  readonly restartButton: Locator;
  readonly configButton: Locator;
  readonly statusIndicator: Locator;
  readonly statusText: Locator;
  readonly logButton: Locator;
  readonly versionText: Locator;

  constructor(page: Page) {
    super(page);

    // 初始化定位器
    this.startButton = page.locator('[data-testid="start-button"]');
    this.stopButton = page.locator('[data-testid="stop-button"]');
    this.restartButton = page.locator('[data-testid="restart-button"]');
    this.configButton = page.locator('[data-testid="config-button"]');
    this.statusIndicator = page.locator('[data-testid="status-indicator"]');
    this.statusText = page.locator('[data-testid="status-text"]');
    this.logButton = page.locator('[data-testid="log-button"]');
    this.versionText = page.locator('[data-testid="version-text"]');
  }

  /**
   * 启动服务
   */
  async start(): Promise<void> {
    await this.startButton.click();
  }

  /**
   * 停止服务
   */
  async stop(): Promise<void> {
    await this.stopButton.click();
  }

  /**
   * 重启服务
   */
  async restart(): Promise<void> {
    await this.restartButton.click();
  }

  /**
   * 打开配置页面
   */
  async openConfig(): Promise<void> {
    await this.configButton.click();
  }

  /**
   * 打开日志
   */
  async openLog(): Promise<void> {
    await this.logButton.click();
  }

  /**
   * 获取状态文本
   */
  async getStatus(): Promise<string> {
    return (await this.statusText.textContent()) || '';
  }

  /**
   * 等待状态变为运行中
   */
  async waitForRunning(timeout = 30000): Promise<void> {
    await expect(this.statusText).toHaveText(/运行中|running/i, { timeout });
  }

  /**
   * 等待状态变为已停止
   */
  async waitForStopped(timeout = 10000): Promise<void> {
    await expect(this.statusText).toHaveText(/已停止|stopped/i, { timeout });
  }

  /**
   * 检查启动按钮是否可用
   */
  async isStartEnabled(): Promise<boolean> {
    return await this.startButton.isEnabled();
  }

  /**
   * 检查停止按钮是否可用
   */
  async isStopEnabled(): Promise<boolean> {
    return await this.stopButton.isEnabled();
  }

  /**
   * 检查重启按钮是否可用
   */
  async isRestartEnabled(): Promise<boolean> {
    return await this.restartButton.isEnabled();
  }

  /**
   * 获取版本号
   */
  async getVersion(): Promise<string> {
    return (await this.versionText.textContent()) || '';
  }

  /**
   * 验证服务状态
   */
  async verifyStatus(expected: 'running' | 'stopped' | 'starting'): Promise<void> {
    const status = await this.getStatus();
    const statusMap = {
      running: /运行中|running/i,
      stopped: /已停止|stopped/i,
      starting: /启动中|starting/i
    };
    expect(status).toMatch(statusMap[expected]);
  }

  /**
   * 等待服务启动完成
   */
  async waitForServiceReady(timeout = 60000): Promise<void> {
    // 等待状态变为运行中
    await this.waitForRunning(timeout);

    // 等待启动按钮禁用
    await expect(this.startButton).toBeDisabled({ timeout });

    // 等待停止按钮启用
    await expect(this.stopButton).toBeEnabled({ timeout });
  }

  /**
   * 等待服务停止完成
   */
  async waitForServiceStopped(timeout = 10000): Promise<void> {
    // 等待状态变为已停止
    await this.waitForStopped(timeout);

    // 等待启动按钮启用
    await expect(this.startButton).toBeEnabled({ timeout });

    // 等待停止按钮禁用
    await expect(this.stopButton).toBeDisabled({ timeout });
  }
}

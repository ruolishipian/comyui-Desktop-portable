/**
 * 配置页面 Page Object
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * 配置页面 Page Object
 */
export class ConfigPage extends BasePage {
  // 定位器
  readonly portInput: Locator;
  readonly autoStartCheckbox: Locator;
  readonly modelDirInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly resetButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);

    // 初始化定位器
    this.portInput = page.locator('[data-testid="port-input"]');
    this.autoStartCheckbox = page.locator('[data-testid="auto-start-checkbox"]');
    this.modelDirInput = page.locator('[data-testid="model-dir-input"]');
    this.saveButton = page.locator('[data-testid="save-button"]');
    this.cancelButton = page.locator('[data-testid="cancel-button"]');
    this.resetButton = page.locator('[data-testid="reset-button"]');
    this.successMessage = page.locator('[data-testid="success-message"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  /**
   * 设置端口
   */
  async setPort(port: number): Promise<void> {
    await this.portInput.fill(port.toString());
  }

  /**
   * 获取端口
   */
  async getPort(): Promise<number> {
    const value = await this.portInput.inputValue();
    return parseInt(value, 10);
  }

  /**
   * 切换自动启动
   */
  async toggleAutoStart(): Promise<void> {
    await this.autoStartCheckbox.click();
  }

  /**
   * 检查自动启动是否选中
   */
  async isAutoStartChecked(): Promise<boolean> {
    return await this.autoStartCheckbox.isChecked();
  }

  /**
   * 设置模型目录
   */
  async setModelDir(dir: string): Promise<void> {
    await this.modelDirInput.fill(dir);
  }

  /**
   * 获取模型目录
   */
  async getModelDir(): Promise<string> {
    return await this.modelDirInput.inputValue();
  }

  /**
   * 保存配置
   */
  async save(): Promise<void> {
    await this.saveButton.click();
  }

  /**
   * 取消配置
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * 重置配置
   */
  async reset(): Promise<void> {
    await this.resetButton.click();
  }

  /**
   * 等待成功消息
   */
  async waitForSuccess(timeout = 5000): Promise<void> {
    await expect(this.successMessage).toBeVisible({ timeout });
  }

  /**
   * 等待错误消息
   */
  async waitForError(timeout = 5000): Promise<void> {
    await expect(this.errorMessage).toBeVisible({ timeout });
  }

  /**
   * 获取成功消息文本
   */
  async getSuccessMessage(): Promise<string> {
    return (await this.successMessage.textContent()) || '';
  }

  /**
   * 获取错误消息文本
   */
  async getErrorMessage(): Promise<string> {
    return (await this.errorMessage.textContent()) || '';
  }

  /**
   * 验证端口错误
   */
  async expectPortError(): Promise<void> {
    const error = await this.getErrorMessage();
    expect(error).toContain('端口');
  }

  /**
   * 验证路径错误
   */
  async expectPathError(): Promise<void> {
    const error = await this.getErrorMessage();
    expect(error).toContain('路径');
  }

  /**
   * 填充完整配置
   */
  async fillConfig(config: { port?: number; autoStart?: boolean; modelDir?: string }): Promise<void> {
    if (config.port !== undefined) {
      await this.setPort(config.port);
    }
    if (config.autoStart !== undefined) {
      const isChecked = await this.isAutoStartChecked();
      if (isChecked !== config.autoStart) {
        await this.toggleAutoStart();
      }
    }
    if (config.modelDir !== undefined) {
      await this.setModelDir(config.modelDir);
    }
  }

  /**
   * 验证配置值
   */
  async verifyConfig(config: { port?: number; autoStart?: boolean; modelDir?: string }): Promise<void> {
    if (config.port !== undefined) {
      const port = await this.getPort();
      expect(port).toBe(config.port);
    }
    if (config.autoStart !== undefined) {
      const autoStart = await this.isAutoStartChecked();
      expect(autoStart).toBe(config.autoStart);
    }
    if (config.modelDir !== undefined) {
      const modelDir = await this.getModelDir();
      expect(modelDir).toBe(config.modelDir);
    }
  }
}

/**
 * 测试环境管理类
 * 提供测试环境的创建、隔离和清理功能
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * 测试环境配置
 */
export interface TestEnvironmentConfig {
  /** 是否自动清理 */
  autoCleanup?: boolean;
  /** 环境名称前缀 */
  prefix?: string;
  /** 是否创建配置目录 */
  createConfigDir?: boolean;
  /** 是否创建日志目录 */
  createLogsDir?: boolean;
}

/**
 * 测试环境管理类
 */
export class TestEnvironment {
  private tempDir: string;
  private configDir: string;
  private logsDir: string;
  private autoCleanup: boolean;
  private isSetup: boolean = false;

  constructor(config: TestEnvironmentConfig = {}) {
    const { autoCleanup = true, prefix = 'comfyui-test' } = config;

    this.autoCleanup = autoCleanup;
    this.tempDir = path.join(os.tmpdir(), `${prefix}-${Date.now()}`);
    this.configDir = path.join(this.tempDir, 'config');
    this.logsDir = path.join(this.tempDir, 'logs');
  }

  /**
   * 设置测试环境
   */
  async setup(): Promise<void> {
    if (this.isSetup) {
      return;
    }

    // 创建临时目录
    await fs.mkdir(this.tempDir, { recursive: true });
    await fs.mkdir(this.configDir, { recursive: true });
    await fs.mkdir(this.logsDir, { recursive: true });

    // 设置环境变量
    process.env.COMFYUI_TEST_MODE = '1';
    process.env.COMFYUI_CONFIG_DIR = this.configDir;
    process.env.COMFYUI_LOGS_DIR = this.logsDir;

    this.isSetup = true;
  }

  /**
   * 清理测试环境
   */
  async cleanup(): Promise<void> {
    if (!this.isSetup) {
      return;
    }

    // 清理环境变量
    delete process.env.COMFYUI_TEST_MODE;
    delete process.env.COMFYUI_CONFIG_DIR;
    delete process.env.COMFYUI_LOGS_DIR;

    // 删除临时目录
    if (this.autoCleanup) {
      try {
        await fs.rm(this.tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn('Failed to cleanup test environment:', error);
      }
    }

    this.isSetup = false;
  }

  /**
   * 获取临时目录路径
   */
  get tempDirectory(): string {
    return this.tempDir;
  }

  /**
   * 获取配置目录路径
   */
  get configDirectory(): string {
    return this.configDir;
  }

  /**
   * 获取日志目录路径
   */
  get logsDirectory(): string {
    return this.logsDir;
  }

  /**
   * 获取配置文件路径
   */
  get configPath(): string {
    return path.join(this.configDir, 'config.json');
  }

  /**
   * 获取日志文件路径
   */
  get logPath(): string {
    return path.join(this.logsDir, 'main.log');
  }

  /**
   * 读取配置文件
   */
  async readConfig(): Promise<any> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * 写入配置文件
   */
  async writeConfig(config: any): Promise<void> {
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  /**
   * 读取日志文件
   */
  async readLog(): Promise<string | null> {
    try {
      return await fs.readFile(this.logPath, 'utf-8');
    } catch (error) {
      return null;
    }
  }

  /**
   * 写入日志文件
   */
  async writeLog(content: string): Promise<void> {
    await fs.appendFile(this.logPath, content + '\n', 'utf-8');
  }

  /**
   * 创建文件
   */
  async createFile(filename: string, content: string): Promise<string> {
    const filePath = path.join(this.tempDir, filename);
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * 读取文件
   */
  async readFile(filename: string): Promise<string> {
    const filePath = path.join(this.tempDir, filename);
    return await fs.readFile(filePath, 'utf-8');
  }

  /**
   * 删除文件
   */
  async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(this.tempDir, filename);
    await fs.unlink(filePath);
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(filename: string): Promise<boolean> {
    const filePath = path.join(this.tempDir, filename);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 创建目录
   */
  async createDirectory(dirname: string): Promise<string> {
    const dirPath = path.join(this.tempDir, dirname);
    await fs.mkdir(dirPath, { recursive: true });
    return dirPath;
  }

  /**
   * 模拟配置损坏
   */
  async breakConfig(): Promise<void> {
    await fs.writeFile(this.configPath, 'invalid json{', 'utf-8');
  }

  /**
   * 模拟路径不存在
   */
  async breakPath(): Promise<void> {
    const config = await this.readConfig();
    if (config) {
      config.portablePath = '/invalid/path/that/does/not/exist';
      await this.writeConfig(config);
    }
  }

  /**
   * 清空配置
   */
  async clearConfig(): Promise<void> {
    try {
      await fs.unlink(this.configPath);
    } catch (error) {
      // 忽略错误
    }
  }

  /**
   * 清空日志
   */
  async clearLogs(): Promise<void> {
    try {
      await fs.unlink(this.logPath);
    } catch (error) {
      // 忽略错误
    }
  }

  /**
   * 获取目录大小
   */
  async getDirectorySize(): Promise<number> {
    let size = 0;

    const calculateSize = async (dirPath: string): Promise<void> => {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await calculateSize(fullPath);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          size += stats.size;
        }
      }
    };

    await calculateSize(this.tempDir);
    return size;
  }

  /**
   * 列出所有文件
   */
  async listFiles(): Promise<string[]> {
    const files: string[] = [];

    const listDir = async (dirPath: string): Promise<void> => {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await listDir(fullPath);
        } else if (entry.isFile()) {
          files.push(path.relative(this.tempDir, fullPath));
        }
      }
    };

    await listDir(this.tempDir);
    return files;
  }

  /**
   * 实现异步资源释放接口
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.cleanup();
  }
}

/**
 * 创建测试环境实例
 */
export function createTestEnvironment(config?: TestEnvironmentConfig): TestEnvironment {
  return new TestEnvironment(config);
}

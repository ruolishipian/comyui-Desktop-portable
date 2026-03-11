/**
 * EnvironmentChecker Mock
 * 模拟环境检查器用于测试
 */

import { existsSync, mkdirSync } from 'fs';
import net from 'net';
import path from 'path';
import { CheckType, EnvironmentCheck } from '../../src/types';
import { ConfigManager } from './config-manager.mock';

export class EnvironmentChecker {
  private _checks: EnvironmentCheck[] = [];
  private _configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this._configManager = configManager;
  }

  // 执行所有检查
  public async runAllChecks(): Promise<EnvironmentCheck[]> {
    this._checks = [];

    this._checkComfyUIPath();
    this._checkPythonPath();
    await this._checkPort();
    await this._checkPermissions();
    this._checkCustomDirectories();

    return this._checks;
  }

  // 检查 ComfyUI 路径
  private _checkComfyUIPath(): void {
    const comfyuiPath = this._configManager.get('comfyuiPath');

    if (!comfyuiPath || !existsSync(comfyuiPath)) {
      this._checks.push({
        type: 'error' as CheckType,
        msg: 'ComfyUI路径无效或不存在'
      });
      return;
    }

    const mainPyPath = path.join(comfyuiPath, 'main.py');
    if (!existsSync(mainPyPath)) {
      this._checks.push({
        type: 'error' as CheckType,
        msg: 'ComfyUI路径中未找到main.py文件'
      });
    }
  }

  // 检查 Python 路径
  private _checkPythonPath(): void {
    const pythonPath = this._configManager.get('pythonPath');

    if (!pythonPath || !existsSync(pythonPath)) {
      this._checks.push({
        type: 'error' as CheckType,
        msg: 'Python路径无效或不存在'
      });
    }
  }

  // 检查端口
  private async _checkPort(): Promise<void> {
    const serverConfig = this._configManager.server;
    const port = serverConfig?.port || 8188;

    const isAvailable = await this._checkPortAvailable(port);
    if (!isAvailable) {
      this._checks.push({
        type: 'warn' as CheckType,
        msg: `端口 ${port} 已被占用，将自动尝试其他端口`
      });
    }
  }

  // 检查端口是否可用
  private _checkPortAvailable(port: number): Promise<boolean> {
    return new Promise(resolve => {
      const tester = net
        .createServer()
        .once('error', () => resolve(false))
        .once('listening', () => {
          tester.close();
          resolve(true);
        })
        .listen(port);
    });
  }

  // 查找可用端口
  public async findAvailablePort(startPort: number = 8188, maxPort: number = 8200): Promise<number | null> {
    const portChecks: Promise<{ port: number; available: boolean }>[] = [];

    for (let port = startPort; port <= maxPort; port++) {
      portChecks.push(this._checkPortAvailable(port).then(available => ({ port, available })));
    }

    const results = await Promise.all(portChecks);

    for (const result of results) {
      if (result.available) {
        return result.port;
      }
    }

    return null;
  }

  // 检查权限
  private async _checkPermissions(): Promise<void> {
    try {
      const testFile = path.join(this._configManager.configDir, 'test_permission.tmp');
      const fs = require('fs');
      await fs.promises.writeFile(testFile, 'test');
      await fs.promises.unlink(testFile);
    } catch (err) {
      const error = err as Error;
      this._checks.push({
        type: 'error' as CheckType,
        msg: `配置目录无写入权限：${error.message}`
      });
    }
  }

  // 检查自定义目录
  private _checkCustomDirectories(): void {
    const serverConfig = this._configManager.server;

    if (serverConfig?.modelDir && !existsSync(serverConfig.modelDir)) {
      this._checks.push({
        type: 'warn' as CheckType,
        msg: `自定义模型目录不存在：${serverConfig.modelDir}`
      });
    }

    if (serverConfig?.outputDir && !existsSync(serverConfig.outputDir)) {
      this._checks.push({
        type: 'warn' as CheckType,
        msg: '自定义输出目录不存在，将自动创建'
      });
      mkdirSync(serverConfig.outputDir, { recursive: true });
    }
  }

  // 是否有错误
  public hasErrors(): boolean {
    return this._checks.some(check => check.type === 'error');
  }

  // 是否有警告
  public hasWarnings(): boolean {
    return this._checks.some(check => check.type === 'warn');
  }
}

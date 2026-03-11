/**
 * 环境检查模块
 * 集中管理启动前的环境检查
 */

import fs, { existsSync } from 'fs';
import net from 'net';
import path from 'path';

import { CheckType, EnvironmentCheck } from '../types';

import { configManager } from './config';
import { findPythonPath } from './path-utils';

// 环境检查器
export class EnvironmentChecker {
  private _checks: EnvironmentCheck[] = [];

  // 执行所有检查
  public async runAllChecks(): Promise<EnvironmentCheck[]> {
    this._checks = [];

    this._checkComfyUIPath();
    this._checkPythonPath();
    this._checkFrontend();
    this._checkDatabase();
    this._checkModelDirectories();
    await this._checkPort();
    await this._checkPermissions();
    this._checkCustomDirectories();

    return this._checks;
  }

  // 检查 ComfyUI 路径
  private _checkComfyUIPath(): void {
    const comfyuiPath = configManager.get('comfyuiPath');

    // 便携包模式：自动检测便携包内的 ComfyUI
    if (!comfyuiPath) {
      // 尝试自动检测便携包内的 ComfyUI 目录
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getAppPath } = require('./app-path') as { getAppPath: () => string };
      const appPath = getAppPath();
      const possiblePaths = [
        // 便携包内路径（优先）
        path.join(appPath, 'ComfyUI'),
        path.join(appPath, 'comfyui'),
        // 兼容旧版便携包结构（ComfyUI 在父目录）
        path.join(appPath, '..', 'ComfyUI'),
        path.join(appPath, '..', 'comfyui')
      ];

      for (const possiblePath of possiblePaths) {
        if (existsSync(possiblePath)) {
          const mainPyPath = path.join(possiblePath, 'main.py');
          if (existsSync(mainPyPath)) {
            // 自动设置 ComfyUI 路径
            configManager.set('comfyuiPath', possiblePath);
            this._checks.push({
              type: 'success' as CheckType,
              msg: `便携包模式：自动检测到 ComfyUI (${possiblePath})`
            });
            return;
          }
        }
      }

      // 未找到 ComfyUI，提示用户选择
      this._checks.push({
        type: 'warn' as CheckType,
        msg: '未找到 ComfyUI，请在设置中选择 ComfyUI 目录'
      });
      return;
    }

    // 检查配置的路径是否存在
    if (!existsSync(comfyuiPath)) {
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
    } else {
      this._checks.push({
        type: 'success' as CheckType,
        msg: 'ComfyUI路径检测通过'
      });
    }
  }

  // 检查 Python 路径
  private _checkPythonPath(): void {
    const pythonPath = configManager.get('pythonPath');
    const comfyuiPath = configManager.get('comfyuiPath');

    // 便携包模式：自动检测便携包内的 Python
    if (!pythonPath) {
      // 尝试自动检测便携包内的 Python
      const appPath = process.cwd();
      const possiblePaths: string[] = [];

      // 如果有 ComfyUI 路径,优先检测其父目录下的 python_embeded
      if (comfyuiPath) {
        const comfyuiParent = path.dirname(comfyuiPath);
        possiblePaths.push(
          path.join(comfyuiParent, 'python_embeded', 'python.exe'),
          path.join(comfyuiParent, 'python', 'python.exe'),
          // Linux/macOS
          path.join(comfyuiParent, 'python_embeded', 'bin', 'python3'),
          path.join(comfyuiParent, 'python', 'bin', 'python3')
        );
      }

      // 使用共享函数查找 Python 路径
      const pythonPath = findPythonPath(appPath);
      if (pythonPath) {
        // 自动设置 Python 路径
        configManager.set('pythonPath', pythonPath);
        this._checks.push({
          type: 'success' as CheckType,
          msg: `便携包模式：自动检测到 Python (${pythonPath})`
        });
        return;
      }

      // 未找到 Python，提示用户选择
      this._checks.push({
        type: 'warn' as CheckType,
        msg: '未找到 Python，请在设置中选择 Python 可执行文件'
      });
      return;
    }

    // 检查配置的路径是否存在
    if (!existsSync(pythonPath)) {
      this._checks.push({
        type: 'error' as CheckType,
        msg: 'Python路径无效或不存在'
      });
    } else {
      this._checks.push({
        type: 'success' as CheckType,
        msg: 'Python路径检测通过'
      });
    }
  }

  // 检查端口
  private async _checkPort(): Promise<void> {
    const serverConfig = configManager.server;
    const port = serverConfig.port ?? 8188;

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

  // 查找可用端口（并行检查）
  public async findAvailablePort(startPort: number = 8188, maxPort: number = 8200): Promise<number | null> {
    const portChecks: Promise<{ port: number; available: boolean }>[] = [];

    // 并行检查所有端口
    for (let port = startPort; port <= maxPort; port++) {
      portChecks.push(this._checkPortAvailable(port).then(available => ({ port, available })));
    }

    // 等待所有检查完成
    const results = await Promise.all(portChecks);

    // 返回第一个可用端口
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
      const testFile = path.join(configManager.configDir, 'test_permission.tmp');
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
    const serverConfig = configManager.server;

    // 检查模型目录
    if (serverConfig.modelDir && !existsSync(serverConfig.modelDir)) {
      this._checks.push({
        type: 'warn' as CheckType,
        msg: `自定义模型目录不存在：${serverConfig.modelDir}`
      });
    }

    // 检查输出目录
    if (serverConfig.outputDir && !existsSync(serverConfig.outputDir)) {
      this._checks.push({
        type: 'warn' as CheckType,
        msg: '自定义输出目录不存在，将自动创建'
      });
      // 自动创建
    }
  }

  // 检查前端文件
  private _checkFrontend(): void {
    const comfyuiPath = configManager.get('comfyuiPath');

    // 便携包场景：ComfyUI 路径可能为空或不存在
    // 便携包本身提供前端界面，不需要检查 ComfyUI 目录下的前端文件
    if (!comfyuiPath) {
      this._checks.push({
        type: 'info' as CheckType,
        msg: '便携包模式：前端界面由启动器提供'
      });
      return;
    }

    // 检查默认前端
    const webPath = path.join(comfyuiPath, 'web');
    const indexPath = path.join(webPath, 'index.html');

    if (!existsSync(indexPath)) {
      // 如果 ComfyUI 路径存在但没有前端文件，可能是便携包模式
      this._checks.push({
        type: 'info' as CheckType,
        msg: '未找到前端文件，便携包模式将使用内置界面'
      });
    } else {
      this._checks.push({
        type: 'success' as CheckType,
        msg: '前端文件检测通过'
      });
    }
  }

  // 检查数据库文件
  private _checkDatabase(): void {
    const comfyuiPath = configManager.get('comfyuiPath');
    if (!comfyuiPath) return;

    const userDir = path.join(comfyuiPath, 'user');
    const dbPath = path.join(userDir, 'comfyui.db');

    if (!existsSync(dbPath)) {
      this._checks.push({
        type: 'info' as CheckType,
        msg: '数据库文件不存在，将在首次启动时创建'
      });
    } else {
      this._checks.push({
        type: 'success' as CheckType,
        msg: '数据库文件检测通过'
      });
    }
  }

  // 检查模型目录
  private _checkModelDirectories(): void {
    const comfyuiPath = configManager.get('comfyuiPath');
    if (!comfyuiPath) return;

    const modelsDir = path.join(comfyuiPath, 'models');
    const checkpointsDir = path.join(modelsDir, 'checkpoints');

    if (!existsSync(modelsDir)) {
      this._checks.push({
        type: 'warn' as CheckType,
        msg: '模型目录不存在，将自动创建'
      });
    } else if (!existsSync(checkpointsDir)) {
      this._checks.push({
        type: 'info' as CheckType,
        msg: 'checkpoints目录不存在，建议创建以存放模型文件'
      });
    } else {
      this._checks.push({
        type: 'success' as CheckType,
        msg: '模型目录结构正常'
      });
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

// 导出单例
export const environmentChecker = new EnvironmentChecker();

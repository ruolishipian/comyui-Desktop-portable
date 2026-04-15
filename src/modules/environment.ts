/**
 * 环境检查模块
 * 集中管理启动前的环境检查
 */

import { exec } from 'child_process';
import fs, { existsSync } from 'fs';
import net from 'net';
import path from 'path';
import { promisify } from 'util';

import { CheckType, EnvironmentCheck } from '../types';

import { configManager } from './config';
import { logger } from './logger';
import { findPythonPath } from './path-utils';

const execAsync = promisify(exec);

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
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { detectComfyUIPath } = require('./path-detector') as {
        detectComfyUIPath: (appPath: string) => string | null;
      };
      const appPath = getAppPath();
      const detectedPath = detectComfyUIPath(appPath);

      if (detectedPath) {
        // 自动设置 ComfyUI 路径
        configManager.set('comfyuiPath', detectedPath);
        this._checks.push({
          type: 'success' as CheckType,
          msg: `便携包模式：自动检测到 ComfyUI (${detectedPath})`
        });
        return;
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

  /**
   * 检查并清理占用指定端口的进程
   * 在启动前调用，确保端口可用
   * @param port 要检查的端口
   * @returns 返回清理结果 { cleaned: boolean, pids: number[] }
   */
  public async checkAndCleanPort(port: number): Promise<{ cleaned: boolean; pids: number[]; error?: string }> {
    const isAvailable = await this._checkPortAvailable(port);
    if (isAvailable) {
      logger.info(`端口 ${port} 可用，无需清理`);
      return { cleaned: false, pids: [] };
    }

    logger.warn(`端口 ${port} 已被占用，尝试查找并清理占用进程...`);

    try {
      const pids = await this._findProcessByPort(port);
      if (pids.length === 0) {
        logger.warn(`无法找到占用端口 ${port} 的进程`);
        return { cleaned: false, pids: [], error: '无法找到占用进程' };
      }

      logger.info(`找到占用端口 ${port} 的进程: PID ${pids.join(', ')}`);

      // 尝试终止进程
      const killedPids: number[] = [];
      const failedPids: number[] = [];

      for (const pid of pids) {
        const killed = await this._killProcess(pid);
        if (killed) {
          killedPids.push(pid);
          logger.info(`已终止进程 PID ${pid}`);
        } else {
          failedPids.push(pid);
          logger.warn(`终止进程 PID ${pid} 失败`);
        }
      }

      // 等待端口释放
      if (killedPids.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const portNowAvailable = await this._checkPortAvailable(port);
        if (portNowAvailable) {
          logger.info(`端口 ${port} 已释放`);
          return { cleaned: true, pids: killedPids };
        } else {
          logger.warn(`端口 ${port} 仍被占用`);
          return { cleaned: false, pids: killedPids, error: '端口仍被占用' };
        }
      }

      return {
        cleaned: false,
        pids: killedPids,
        error: failedPids.length > 0 ? `无法终止进程: ${failedPids.join(', ')}` : '未知错误'
      };
    } catch (err) {
      const error = err as Error;
      logger.error(`清理端口 ${port} 时发生错误: ${error.message}`);
      return { cleaned: false, pids: [], error: error.message };
    }
  }

  /**
   * 查找占用指定端口的进程 PID
   * @param port 端口号
   * @returns 占用该端口的进程 PID 列表
   */
  private async _findProcessByPort(port: number): Promise<number[]> {
    const pids: number[] = [];

    try {
      if (process.platform === 'win32') {
        // Windows: 使用 netstat -ano 查找
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        const lines = stdout.split('\n').filter(line => line.trim());

        for (const line of lines) {
          // 解析 netstat 输出，格式如: "  TCP    127.0.0.1:8188    0.0.0.0:0    LISTENING    12345"
          const parts = line.trim().split(/\s+/);
          const pidStr = parts[parts.length - 1] ?? '';
          const pid = parseInt(pidStr, 10);
          if (!isNaN(pid) && pid > 0 && !pids.includes(pid)) {
            pids.push(pid);
          }
        }
      } else {
        // Linux/macOS: 使用 lsof 查找
        try {
          const { stdout } = await execAsync(`lsof -i :${port} -t`);
          const lines = stdout.split('\n').filter(line => line.trim());
          for (const line of lines) {
            const pid = parseInt(line.trim(), 10);
            if (!isNaN(pid) && pid > 0 && !pids.includes(pid)) {
              pids.push(pid);
            }
          }
        } catch {
          // lsof 可能不存在或没有权限，尝试使用 ss
          try {
            const { stdout } = await execAsync(`ss -tlnp | grep :${port}`);
            // 解析 ss 输出，格式如: "LISTEN  0  128  127.0.0.1:8188  *:*  users:(("python",pid=12345,fd=3))"
            const pidMatch = stdout.match(/pid=(\d+)/g);
            if (pidMatch) {
              for (const match of pidMatch) {
                const pid = parseInt(match.replace('pid=', ''), 10);
                if (!isNaN(pid) && pid > 0 && !pids.includes(pid)) {
                  pids.push(pid);
                }
              }
            }
          } catch {
            // ss 也不可用
            logger.warn('无法使用 lsof 或 ss 查找端口占用进程');
          }
        }
      }
    } catch (err) {
      const error = err as Error;
      logger.error(`查找端口 ${port} 占用进程失败: ${error.message}`);
    }

    return pids;
  }

  /**
   * 终止指定进程
   * @param pid 进程 ID
   * @returns 是否成功终止
   */
  private async _killProcess(pid: number): Promise<boolean> {
    try {
      if (process.platform === 'win32') {
        // Windows: 使用 taskkill
        await execAsync(`taskkill /PID ${pid} /F`);
      } else {
        // Linux/macOS: 使用 kill
        try {
          // 先尝试 SIGTERM
          await execAsync(`kill ${pid}`);
          // 等待进程退出
          await new Promise(resolve => setTimeout(resolve, 500));
          // 检查进程是否还存在
          try {
            await execAsync(`kill -0 ${pid}`);
            // 进程还存在，使用 SIGKILL
            await execAsync(`kill -9 ${pid}`);
          } catch {
            // 进程已退出
          }
        } catch {
          // 可能进程已退出
        }
      }
      return true;
    } catch (err) {
      const error = err as Error;
      logger.error(`终止进程 PID ${pid} 失败: ${error.message}`);
      return false;
    }
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

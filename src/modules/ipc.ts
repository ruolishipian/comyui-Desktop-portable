/**
 * IPC 通信模块
 * 集中管理主进程与渲染进程之间的通信
 */

import path from 'path';

import { ipcMain, app, dialog, BrowserWindow } from 'electron';

import { configManager } from './config';
import { typedHandle, IPC_CHANNELS } from './ipc-types';
import { logger } from './logger';
import { ProcessManager } from './process';
import { stateManager } from './state';
import { TerminalManager } from './terminal';
import { TrayManager } from './tray';
import { WindowManager } from './windows';

const UPDATE_CONFIG_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  'comfyuiPath',
  'pythonPath',
  'envArgs',
  'envVars',
  'server',
  'server.port',
  'server.autoStart',
  'server.autoRestart',
  'server.cpuMode',
  'server.listenAll',
  'server.disableCUDA',
  'server.disableIPEX',
  'server.modelDir',
  'server.outputDir',
  'server.customArgs',
  'server.timeout',
  'server.argNames',
  'server.argNames.baseDirectory',
  'server.argNames.outputDirectory',
  'server.argNames.extraModelPathsConfig',
  'server.argNames.disableCudaMalloc',
  'server.argNames.disableIpexOptimize',
  'logs',
  'logs.enable',
  'logs.level',
  'logs.maxSize',
  'logs.keepDays',
  'logs.realtime',
  'tray',
  'tray.minimizeToTray',
  'advanced',
  'advanced.singleInstance',
  'advanced.stdoutThrottle',
  'window',
  'window.width',
  'window.height',
  'window.x',
  'window.y',
  'window.maximized'
]);

function isValidFilePath(filePath: string | undefined): boolean {
  if (filePath === '' || filePath === undefined) return true;
  try {
    const normalized = path.normalize(filePath);
    if (normalized.length > 4096 || normalized.includes('\0')) return false;
    if (path.isAbsolute(normalized)) {
      const resolved = path.resolve(normalized);
      const parentDir = path.dirname(resolved);
      if (!resolved.startsWith(parentDir + path.sep) && resolved !== parentDir) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * 通用的路径选择对话框函数
 * @param event IPC 事件对象
 * @param options 对话框选项
 * @param errorLogPrefix 错误日志前缀
 * @returns 选择的文件路径，取消或出错时返回空字符串
 */
async function showPathDialog(
  event: Electron.IpcMainInvokeEvent,
  options: Electron.OpenDialogOptions,
  errorLogPrefix: string
): Promise<string> {
  try {
    const webContents = event.sender;
    const win = BrowserWindow.fromWebContents(webContents);

    const result =
      win && !win.isDestroyed() ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);

    return result.filePaths[0] ?? '';
  } catch (err) {
    logger.error(`${errorLogPrefix}：${err}`);
    return '';
  }
}

// IPC 管理器
export class IPCManager {
  private _windowManager: WindowManager | null = null;
  private _processManager: ProcessManager | null = null;
  private _trayManager: TrayManager | null = null;
  private _terminalManager: TerminalManager | null = null;

  // 设置依赖
  public setDependencies(
    windowManager: WindowManager,
    processManager: ProcessManager,
    trayManager: TrayManager,
    terminalManager: TerminalManager
  ): void {
    this._windowManager = windowManager;
    this._processManager = processManager;
    this._trayManager = trayManager;
    this._terminalManager = terminalManager;
  }

  // 注册所有 IPC 处理器
  public registerAll(): void {
    // 配置相关
    this._registerConfigHandlers();
    // 进程控制
    this._registerProcessHandlers();
    // 日志相关
    this._registerLogHandlers();
    // 路径选择
    this._registerPathHandlers();
    // 应用控制
    this._registerAppHandlers();
    // 窗口状态
    this._registerWindowStateHandlers();
    // 缓存管理
    this._registerCacheHandlers();
    // 终端
    this._registerTerminalHandlers();
    // 状态查询
    this._registerStatusHandlers();
  }

  // 注册配置处理器
  private _registerConfigHandlers(): void {
    // 获取配置
    typedHandle(IPC_CHANNELS.GET_CONFIG, () => {
      return configManager.getAll();
    });

    typedHandle(IPC_CHANNELS.UPDATE_CONFIG, (_, key, value) => {
      if (typeof key !== 'string' || !UPDATE_CONFIG_ALLOWED_KEYS.has(key)) {
        logger.warn(`UPDATE_CONFIG 拒绝非法键：${String(key)}`);
        return configManager.getAll();
      }

      if (key === 'comfyuiPath' || key === 'pythonPath' || key === 'server.modelDir' || key === 'server.outputDir') {
        if (typeof value === 'string' && !isValidFilePath(value)) {
          logger.warn(`UPDATE_CONFIG 拒绝非法路径值：${key} = ${value}`);
          return configManager.getAll();
        }
      }

      configManager.set(key, value);

      setImmediate(() => {
        this._broadcastStatus();
      });

      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
      logger.info(`更新配置：${String(key)} = ${valueStr}`);

      return configManager.getAll();
    });

    // 重置配置
    typedHandle(IPC_CHANNELS.RESET_CONFIG, async () => {
      configManager.reset();
      await dialog.showMessageBox({
        type: 'info',
        title: '提示',
        message: '配置已重置，应用将重启'
      });
      app.relaunch();
      app.quit();
      return true;
    });
  }

  // 注册进程处理器
  private _registerProcessHandlers(): void {
    // 启动
    typedHandle(IPC_CHANNELS.START_COMFYUI, async () => {
      if (this._processManager) {
        await this._processManager.start();
      }
    });

    // 停止
    typedHandle(IPC_CHANNELS.STOP_COMFYUI, () => {
      if (this._processManager) {
        void this._processManager.stop();
      }
    });

    // 重启
    typedHandle(IPC_CHANNELS.RESTART_COMFYUI, () => {
      if (this._processManager) {
        void this._processManager.restart();
      }
    });
  }

  // 注册日志处理器
  private _registerLogHandlers(): void {
    // 获取日志内容
    typedHandle(IPC_CHANNELS.GET_LOG_CONTENT, async () => {
      return await logger.readLogContent();
    });

    // 清空日志
    typedHandle(IPC_CHANNELS.CLEAR_LOG, async () => {
      return await logger.clearLog();
    });

    // 获取会话日志缓存
    typedHandle(IPC_CHANNELS.GET_SESSION_LOG, () => {
      return logger.getSessionLog();
    });

    // 清空会话日志缓存
    typedHandle(IPC_CHANNELS.CLEAR_SESSION_LOG, () => {
      logger.clearSessionLog();
      return true;
    });

    typedHandle(IPC_CHANNELS.GET_LOG_PAGE, async (_, endLine: number, limit: number) => {
      return await logger.readLogPage(endLine, limit);
    });
  }

  // 注册路径选择处理器
  private _registerPathHandlers(): void {
    // 保存环境路径
    typedHandle(IPC_CHANNELS.SAVE_ENV_PATH, (_, { comfyuiPath, pythonPath, envArgs, envVars }) => {
      if (!isValidFilePath(comfyuiPath) || !isValidFilePath(pythonPath)) {
        logger.warn('SAVE_ENV_PATH 拒绝非法路径');
        return false;
      }

      if (typeof (envArgs as unknown) !== 'string' && envArgs !== undefined) {
        logger.warn('SAVE_ENV_PATH 拒绝非法 envArgs 类型');
        return false;
      }
      if (typeof (envVars as unknown) !== 'string' && envVars !== undefined) {
        logger.warn('SAVE_ENV_PATH 拒绝非法 envVars 类型');
        return false;
      }

      logger.info(`保存环境路径 - comfyuiPath: ${comfyuiPath}`);
      logger.info(`保存环境路径 - pythonPath: ${pythonPath}`);
      logger.info(`保存环境路径 - envArgs: "${envArgs ?? ''}"`);
      logger.info(`保存环境路径 - envVars: "${envVars ?? ''}"`);

      configManager.set('comfyuiPath', comfyuiPath);
      configManager.set('pythonPath', pythonPath);
      configManager.set('envArgs', envArgs ?? '');
      configManager.set('envVars', envVars ?? '');

      const savedEnvArgs = configManager.get('envArgs');
      const savedEnvVars = configManager.get('envVars');
      logger.info(`保存后验证 - envArgs: "${savedEnvArgs}"`);
      logger.info(`保存后验证 - envVars: "${savedEnvVars}"`);

      if (this._windowManager !== null) {
        this._windowManager.getWindow('envSelect')?.close();
      }

      if (this._windowManager !== null) {
        this._windowManager.createMainWindow();
      }
      if (this._trayManager !== null) {
        this._trayManager.create();
      }

      logger.info('环境配置保存成功');
      return true;
    });

    // 选择 ComfyUI 路径
    typedHandle(IPC_CHANNELS.SELECT_COMFYUI_PATH, async event => {
      return showPathDialog(
        event,
        {
          properties: ['openDirectory'],
          title: '选择ComfyUI便携包根目录'
        },
        '选择 ComfyUI 路径失败'
      );
    });

    // 选择 Python 路径
    typedHandle(IPC_CHANNELS.SELECT_PYTHON_PATH, async event => {
      return showPathDialog(
        event,
        {
          properties: ['openFile'],
          title: '选择Python可执行文件',
          filters: [
            { name: 'Python Executable', extensions: ['exe'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        },
        '选择 Python 路径失败'
      );
    });

    // 选择目录
    typedHandle(IPC_CHANNELS.SELECT_DIRECTORY, async (_, title) => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: title ?? '选择文件夹'
      });
      return result.filePaths[0] ?? '';
    });
  }

  // 注册应用控制处理器
  private _registerAppHandlers(): void {
    // 重启应用
    ipcMain.on(IPC_CHANNELS.RESTART_APP, () => {
      app.relaunch();
      app.quit();
    });

    // 关闭当前窗口
    typedHandle(IPC_CHANNELS.CLOSE_WINDOW, event => {
      const webContents = event.sender;
      const win = BrowserWindow.fromWebContents(webContents);
      if (win && !win.isDestroyed()) {
        win.close();
      }
    });

    // 打开设置窗口
    typedHandle(IPC_CHANNELS.OPEN_SETTINGS, () => {
      if (this._windowManager) {
        this._windowManager.createSettingsWindow();
      }
    });

    // 打开日志窗口
    typedHandle(IPC_CHANNELS.OPEN_LOGS, () => {
      if (this._windowManager) {
        this._windowManager.createLogWindow();
      }
    });

    // 退出应用
    ipcMain.on(IPC_CHANNELS.QUIT_APP, () => {
      // 设置退出标志
      globalThis.isQuiting = true;
      // 直接退出，before-quit 事件会处理进程停止
      app.quit();
    });
  }

  // 注册窗口状态处理器
  private _registerWindowStateHandlers(): void {
    // 渲染进程就绪信号
    ipcMain.on(IPC_CHANNELS.RENDERER_READY, event => {
      const webContents = event.sender;
      const win = BrowserWindow.fromWebContents(webContents);
      if (win && this._windowManager) {
        // 根据窗口 ID 确定窗口类型
        const windowTypes: Array<'main' | 'envSelect' | 'log' | 'settings'> = ['main', 'envSelect', 'log', 'settings'];
        for (const type of windowTypes) {
          const targetWin = this._windowManager.getWindow(type);
          if (targetWin && targetWin.webContents === webContents) {
            this._windowManager.setRendererReady(type);
            logger.info(`渲染进程就绪: ${type}`);

            // 发送当前状态到渲染进程
            webContents.send(IPC_CHANNELS.STATUS_UPDATE, stateManager.getStateData());
            break;
          }
        }
      }
    });
  }

  // 注册缓存管理处理器
  private _registerCacheHandlers(): void {
    // 清除浏览器缓存
    typedHandle(IPC_CHANNELS.CLEAR_BROWSER_CACHE, async () => {
      if (this._windowManager) {
        const result = await this._windowManager.clearBrowserCache();
        logger.info(`清除浏览器缓存: ${result ? '成功' : '失败'}`);
        return result;
      }
      return false;
    });

    // 清除存储数据
    typedHandle(IPC_CHANNELS.CLEAR_STORAGE_DATA, async () => {
      if (this._windowManager) {
        const result = await this._windowManager.clearStorageData();
        logger.info(`清除存储数据: ${result ? '成功' : '失败'}`);
        return result;
      }
      return false;
    });
  }

  // 广播状态更新
  private _broadcastStatus(): void {
    if (this._windowManager) {
      this._windowManager.broadcast(IPC_CHANNELS.STATUS_UPDATE, stateManager.getStateData());
    }
  }

  // 注册终端处理器
  private _registerTerminalHandlers(): void {
    ipcMain.on(IPC_CHANNELS.TERMINAL_WRITE, (_event, sessionId: number, data: string) => {
      if (this._terminalManager) {
        this._terminalManager.writeData(sessionId, data);
      }
    });

    ipcMain.on(IPC_CHANNELS.TERMINAL_RESIZE, (_event, sessionId: number, cols: number, rows: number) => {
      if (this._terminalManager) {
        this._terminalManager.resizeSession(sessionId, cols, rows);
      }
    });

    ipcMain.on(IPC_CHANNELS.TERMINAL_KILL, (_event, sessionId: number) => {
      if (this._terminalManager) {
        this._terminalManager.killSession(sessionId);
      }
    });

    ipcMain.handle(IPC_CHANNELS.TERMINAL_CREATE, (event, cols: number, rows: number) => {
      if (this._terminalManager) {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win && !win.isDestroyed()) {
          return this._terminalManager.createPtySession(win.id, cols, rows);
        }
      }
      return null;
    });
  }

  private _registerStatusHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.GET_STATUS, () => {
      return stateManager.getStateData();
    });
  }
}

// 导出单例
export const ipcManager = new IPCManager();

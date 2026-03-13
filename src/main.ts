/**
 * ComfyUI 便携桌面版 - 主入口
 * 模块化重构版本 - TypeScript
 */

import fs from 'fs';
import path from 'path';

import { app, BrowserWindow, dialog } from 'electron';

import { IPC_CHANNELS } from './constants/ipc-channels';
import {
  configManager,
  logger,
  stateManager,
  Status,
  processManager,
  windowManager,
  WindowType,
  trayManager,
  ipcManager,
  proxyManager,
  handleError
} from './modules';
import { StateData } from './types';

// 禁用 GPU 沙箱（解决权限问题）
// 注意：这些方法需要在 app ready 之前调用
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('no-sandbox');

// 全局退出标记
declare global {
  // eslint-disable-next-line no-var
  var isQuiting: boolean;
}

global.isQuiting = false;

// ========== 初始化函数 ==========

/**
 * 设置 Electron 缓存目录（解决权限问题）
 */
function setupElectronCache(): void {
  // 获取应用根目录（可执行文件所在目录）
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getAppPath } = require('./modules/app-path') as { getAppPath: () => string };
  const appPath = getAppPath();

  console.log('[Main] 应用根目录:', appPath);

  const userDataPath = path.join(appPath, 'data');
  const cachePath = path.join(userDataPath, 'cache');
  const gpuCachePath = path.join(userDataPath, 'gpucache');

  // 确保目录存在
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath, { recursive: true });
  }
  if (!fs.existsSync(gpuCachePath)) {
    fs.mkdirSync(gpuCachePath, { recursive: true });
  }

  console.log('[Main] 缓存目录:', userDataPath);

  // 设置 app 路径
  try {
    app.setPath('userData', userDataPath);
    app.setPath('cache', cachePath);
    app.setPath('gpuCache', gpuCachePath);
  } catch (err) {
    // 忽略错误，使用默认路径
    console.warn('设置缓存目录失败，使用默认路径');
  }
}

/**
 * 设置控制台编码（解决中文乱码）
 */
function setupConsoleEncoding(): void {
  // Windows 下设置控制台编码为 UTF-8
  if (process.platform === 'win32') {
    // 设置控制台代码页为 UTF-8
    process.stdout.setDefaultEncoding('utf8');
    process.stderr.setDefaultEncoding('utf8');
  }
}

/**
 * 初始化所有模块
 */
function initializeModules(): void {
  // 1. 初始化配置
  configManager.init();

  // 2. 初始化日志
  logger.init();

  // 3. 初始化代理管理器
  void proxyManager.init();

  // 4. 设置模块依赖关系
  setupDependencies();

  // 5. 注册 IPC 处理器
  ipcManager.registerAll();

  // 6. 设置状态监听
  setupStateListeners();

  logger.info('ComfyUI便携桌面版启动（模块化版本 - TypeScript）');
}

/**
 * 设置模块依赖关系
 */
function setupDependencies(): void {
  // 进程管理器 -> 状态变更回调
  processManager.setOnStatusChange((data: StateData) => {
    handleStatusChange(data);
  });

  // 窗口管理器 -> 事件回调
  windowManager.setOnWindowEvent((event: string, windowType: WindowType | null) => {
    // 处理窗口事件
    handleWindowEvent(event, windowType);

    // 日志窗口创建时设置引用
    if (event === 'created' && windowType === 'log') {
      const logWindow = windowManager.getWindow('log');
      logger.setLogWindow(logWindow ?? null);
    }
  });

  // 托盘管理器 -> 依赖
  trayManager.setDependencies(windowManager, processManager);

  // IPC 管理器 -> 依赖
  ipcManager.setDependencies(windowManager, processManager, trayManager);
}

/**
 * 设置状态监听
 */
function setupStateListeners(): void {
  stateManager.addListener((data: StateData) => {
    // 广播状态到所有窗口
    windowManager.broadcast(IPC_CHANNELS.STATUS_UPDATE, data);

    // 更新主窗口标题
    windowManager.updateTitle('main', `ComfyUI桌面-便携包 - ${data.status.toUpperCase()}`);
  });
}

/**
 * 处理状态变更
 */
function handleStatusChange(data: StateData): void {
  const { status, port } = data;

  // 根据状态加载不同页面
  if (status === Status.RUNNING && port) {
    windowManager.loadPage('main', `http://localhost:${port}`);
  } else if (status === Status.STOPPED || status === Status.STARTING) {
    windowManager.loadPage('main', 'loading.html');
  } else if (status === Status.FAILED) {
    windowManager.loadPage('main', 'error.html');
  }
}

/**
 * 处理窗口事件
 */
function handleWindowEvent(event: string, windowType: WindowType | null): void {
  console.log(`[Debug] Window event: ${event}, type: ${windowType}`);
  switch (event) {
    case 'ready':
      if (windowType === 'main') {
        // 主窗口准备好后，检查是否自动启动
        // 注意：需要检查当前状态，防止在启动过程中重复启动
        const autoStart = configManager.server.autoStart ?? false;
        const currentStatus = stateManager.status;
        console.log('[Debug] autoStart:', autoStart, 'currentStatus:', currentStatus);

        // 只有在 stopped 状态下才自动启动
        // 注意：failed 状态不应该自动启动，否则会形成无限重启循环
        if (autoStart && currentStatus === 'stopped') {
          console.log('[Debug] Calling processManager.start()');
          void processManager.start();
        } else if (autoStart && currentStatus === 'failed') {
          console.log('[Debug] Skipped auto-start due to failed status (prevents infinite restart loop)');
        } else if (autoStart) {
          console.log('[Debug] Skipped auto-start, current status:', currentStatus);
        }
      }
      break;

    case 'main-closing':
      // 主窗口关闭时，触发应用退出流程
      // app.quit() 会触发 before-quit 事件，在那里会优雅停止 ComfyUI 进程
      app.quit();
      break;

    case 'reset-config':
      // 重置配置后重启应用
      app.relaunch();
      app.quit();
      break;
  }
}

/**
 * 设置单实例运行
 */
function setupSingleInstance(): void {
  const singleInstance = configManager.advanced.singleInstance ?? true;
  if (!singleInstance) return;

  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    logger.info('应用已在运行中，退出当前实例');
    app.quit();
    return;
  }

  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    logger.info('检测到第二个实例启动请求');

    // 激活已有窗口
    windowManager.focusWindow('main');

    // 显示提示
    dialog
      .showMessageBox({
        type: 'info',
        title: '提示',
        message: 'ComfyUI 便携桌面版已在运行中',
        detail: '已为您激活现有窗口',
        buttons: ['确定']
      })
      .catch((err: unknown) => {
        const error = err as Error;
        logger.error(`显示对话框失败: ${error.message}`);
      });
  });
}

// ========== 应用生命周期 ==========

// 在 app ready 之前设置缓存目录
setupElectronCache();
setupConsoleEncoding();

// 应用准备就绪
void app
  .whenReady()
  .then(async () => {
    // 初始化模块
    initializeModules();

    // 设置单实例
    setupSingleInstance();

    // 标记 IPC 就绪
    stateManager.isIpcReady = true;

    // 清除浏览器缓存（防止旧的 JS 文件缓存导致错误）
    try {
      await windowManager.clearAllCache();
      logger.info('启动时已清除浏览器缓存');
    } catch (err) {
      const error = err as Error;
      logger.error(`清除浏览器缓存失败: ${error.message}`);
    }

    // 调试：输出配置路径
    console.log('[Debug] comfyuiPath:', configManager.get('comfyuiPath'));
    console.log('[Debug] pythonPath:', configManager.get('pythonPath'));

    // 根据配置状态创建窗口
    const isConfigured = configManager.isEnvironmentConfigured();
    console.log('[Debug] isEnvironmentConfigured:', isConfigured);

    if (isConfigured) {
      windowManager.createMainWindow();
      trayManager.create();
    } else {
      windowManager.createEnvSelectWindow();
    }
  })
  .catch((error: Error) => {
    logger.error(`应用启动失败: ${error.message}`);
    dialog.showErrorBox('启动失败', `应用启动失败：${error.message}\n请重启应用`);
    app.exit(2020);
  });

// 应用即将退出 - 优化退出速度
app.on('before-quit', event => {
  console.log('[Debug] before-quit event triggered, isQuiting:', global.isQuiting);

  // 避免重复处理（但如果已经标记为退出，仍然需要执行退出逻辑）
  if (global.isQuiting) {
    console.log('[Debug] Already quiting, but still need to check if we should stop ComfyUI');
    // 不要直接返回，继续检查是否需要停止 ComfyUI
  }

  // 清空会话日志缓存
  logger.clearSessionLog();

  // 如果 ComfyUI 正在运行，需要先优雅停止
  if (stateManager.status === 'running' || stateManager.status === 'starting' || stateManager.status === 'stopping') {
    event.preventDefault();
    global.isQuiting = true;

    console.log('[Debug] ComfyUI is running, stopping...');
    logger.info('正在关闭 ComfyUI...');

    // 1. 通知前端应用即将关闭
    windowManager.broadcast(IPC_CHANNELS.APP_CLOSING, null);

    // 2. 停止进程
    processManager.stop();

    // 3. 等待进程退出（最多等待 3 秒，从 5 秒优化）
    const maxWait = 3000;
    const startTime = Date.now();

    const checkAndExit = (): void => {
      const status = stateManager.status;
      const elapsed = Date.now() - startTime;

      if (status === 'stopped' || status === 'failed' || elapsed >= maxWait) {
        if (elapsed >= maxWait) {
          logger.warn('等待进程退出超时，强制退出');
          // 超时后强制杀死进程
          processManager.forceKill();
        } else {
          logger.info(`进程已退出，耗时 ${elapsed}ms`);
        }

        // 4. 关闭所有窗口并退出
        logger.info('ComfyUI 便携桌面版退出');
        windowManager.closeAll();
        app.exit(0);
      } else {
        // 继续等待（缩短检查间隔，从 100ms 优化到 50ms）
        setTimeout(checkAndExit, 50);
      }
    };

    // 开始检查
    setTimeout(checkAndExit, 50);
  } else {
    global.isQuiting = true;
    logger.info('ComfyUI 便携桌面版开始退出');
    // 如果 ComfyUI 没有在运行，直接退出
    windowManager.closeAll();
    app.exit(0);
  }
});

// 所有窗口关闭
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS 激活应用
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.createMainWindow();
  }
});

// 未捕获异常处理
process.on('uncaughtException', (err: Error) => {
  // EPIPE 错误通常发生在进程退出时向已关闭的管道写入数据
  // 这不是致命错误，可以忽略
  if (err.message.includes('EPIPE') || err.message.includes('broken pipe')) {
    logger.warn(`忽略 EPIPE 错误: ${err.message}`);
    return;
  }

  handleError(err);
  dialog.showErrorBox('严重错误', `应用发生未捕获异常：${err.message}\n请重启应用`);
});

// 未处理的 Promise 拒绝
process.on('unhandledRejection', (reason: unknown) => {
  handleError(reason);
});

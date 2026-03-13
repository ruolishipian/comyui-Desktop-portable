/**
 * 窗口管理模块
 * 集中管理所有窗口的创建、销毁、状态
 */

import * as fs from 'fs';

import { BrowserWindow, dialog, Menu, app, nativeImage, NativeImage, session } from 'electron';

import { WindowType, WindowConfig } from '../types';

import { configManager } from './config';
import { createFileOperationMenuItems } from './menu-utils';
import { PATHS } from './paths';
import { stateManager } from './state';

// 获取应用图标
function getAppIcon(): NativeImage | undefined {
  const iconPath = PATHS.APP_ICON();
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }
  return undefined;
}

// 窗口事件回调类型
export type WindowEventCallback = (event: string, windowType: WindowType | null) => void;

// 消息队列项类型
interface QueuedMessage {
  channel: string;
  data: unknown;
}

// 窗口管理器
export class WindowManager {
  private _windows: Map<WindowType, BrowserWindow> = new Map();
  private _onWindowEvent: WindowEventCallback | null = null;

  // 消息队列：窗口未准备好时缓存消息
  private _messageQueue: Map<WindowType, QueuedMessage[]> = new Map();
  // 渲染进程就绪状态
  private _rendererReady: Map<WindowType, boolean> = new Map();

  // 设置窗口事件回调
  public setOnWindowEvent(callback: WindowEventCallback): void {
    this._onWindowEvent = callback;
  }

  // 获取窗口
  public getWindow(type: WindowType): BrowserWindow | undefined {
    return this._windows.get(type);
  }

  // 检查窗口是否存在且未销毁
  public isWindowValid(type: WindowType): boolean {
    const win = this._windows.get(type);
    return win !== undefined && !win.isDestroyed();
  }

  // 聚焦窗口
  public focusWindow(type: WindowType): void {
    const win = this._windows.get(type);
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) {
        win.restore();
      }
      win.show();
      win.focus();
    }
  }

  // 创建环境选择窗口
  public createEnvSelectWindow(): void {
    if (this.isWindowValid('envSelect')) {
      this.focusWindow('envSelect');
      return;
    }

    const win = new BrowserWindow({
      width: 600,
      height: 450,
      resizable: false,
      center: true,
      icon: getAppIcon(),
      webPreferences: {
        preload: PATHS.PRELOAD_JS,
        nodeIntegration: false,
        contextIsolation: true
      },
      title: 'ComfyUI 便携环境配置',
      show: false,
      autoHideMenuBar: true
    });

    void win.loadFile(PATHS.SELECT_ENV_HTML());
    win.on('ready-to-show', () => win.show());
    win.on('closed', () => {
      this._windows.delete('envSelect');
      this._clearWindowState('envSelect');
      this._notifyEvent('closed', 'envSelect');
    });
    // 阻止未配置时关闭
    const handleClose = (e: Electron.Event) => {
      if (!configManager.isEnvironmentConfigured()) {
        e.preventDefault();
        void dialog
          .showMessageBox(win, {
            type: 'warning',
            title: '提示',
            message: '尚未配置 ComfyUI 环境',
            detail: '必须选择 ComfyUI 便携包和 Python 环境才能继续使用。',
            buttons: ['继续配置', '退出应用'],
            defaultId: 0,
            cancelId: 0
          })
          .then(result => {
            if (result.response === 1) {
              // 用户选择退出应用，移除监听器后退出
              win.removeListener('close', handleClose);
              app.quit();
            }
          });
      }
    };
    win.on('close', handleClose);

    this._windows.set('envSelect', win);
    this._notifyEvent('created', 'envSelect');
  }

  // 创建主窗口
  public createMainWindow(): void {
    if (this.isWindowValid('main')) {
      this.focusWindow('main');
      return;
    }

    const windowConfig = configManager.window;

    const win = new BrowserWindow({
      width: windowConfig.width ?? 1280,
      height: windowConfig.height ?? 720,
      x: windowConfig.x ?? undefined,
      y: windowConfig.y ?? undefined,
      center: windowConfig.x === null && windowConfig.y === null,
      icon: getAppIcon(),
      webPreferences: {
        preload: PATHS.PRELOAD_JS,
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false, // 禁用同源策略，确保资源正常加载（与旧版本一致）
        webviewTag: true, // 支持 webview 标签，提高插件兼容性
        devTools: true // 显式启用开发者工具
      },
      show: false,
      title: 'ComfyUI桌面-便携包',
      autoHideMenuBar: true
    });

    if (windowConfig.maximized) {
      win.maximize();
    }

    void win.loadFile(PATHS.LOADING_HTML());

    // 窗口关闭逻辑 - 优化响应速度
    win.on('close', e => {
      console.log('[Debug] Window close event, isQuiting:', global.isQuiting);

      // 如果已经在退出流程中，允许关闭
      if (global.isQuiting) {
        console.log('[Debug] Already quiting, allowing close');
        return;
      }

      // 阻止默认关闭行为
      e.preventDefault();

      // 立即标记为退出状态，防止重复触发
      global.isQuiting = true;
      console.log('[Debug] Set isQuiting to true');

      // 异步保存窗口状态（不阻塞关闭流程）
      if (!win.isDestroyed()) {
        const size = win.getSize();
        const position = win.getPosition();
        const newConfig: WindowConfig = {
          width: size[0],
          height: size[1],
          x: position[0],
          y: position[1],
          maximized: win.isMaximized()
        };
        // 异步保存，不等待完成
        void configManager.set('window', newConfig);
      }

      // 检查是否启用最小化到托盘
      const minimizeToTray = configManager.tray.minimizeToTray ?? false;

      if (minimizeToTray) {
        // 最小化到托盘：隐藏窗口而不是关闭
        global.isQuiting = false; // 重置退出标记
        win.hide();
        return;
      }

      // 不最小化到托盘：立即触发退出流程
      // 先隐藏窗口，给用户即时反馈
      win.hide();

      // 通知主进程窗口正在关闭（主进程会调用 app.quit()）
      this._notifyEvent('main-closing', 'main');
    });

    win.on('ready-to-show', () => {
      win.show();
    });

    // 不拦截任何请求，让浏览器自然处理 404 错误
    // 浏览器会忽略加载失败的资源，这与在普通浏览器中的行为一致

    // 页面加载完成后触发 ready 事件
    win.webContents.on('did-finish-load', () => {
      // 暂时禁用CSS注入，避免干扰ComfyUI原生布局
      // 如果后续发现特定插件有布局问题，可以针对性修复
      // this._injectLayoutFixCSS(win);
      this._notifyEvent('ready', 'main');
    });

    // 右键菜单
    win.webContents.on('context-menu', () => {
      this._showContextMenu(win);
    });

    this._windows.set('main', win);
    this._notifyEvent('created', 'main');
  }

  // 创建日志窗口
  public createLogWindow(): void {
    if (this.isWindowValid('log')) {
      this.focusWindow('log');
      return;
    }

    const mainWindow = this.getWindow('main');

    const win = new BrowserWindow({
      width: 800,
      height: 600,
      parent: mainWindow ?? undefined,
      modal: false,
      icon: getAppIcon(),
      webPreferences: {
        preload: PATHS.PRELOAD_JS,
        nodeIntegration: false,
        contextIsolation: true
      },
      title: 'ComfyUI 实时日志',
      show: false,
      autoHideMenuBar: true
    });

    void win.loadFile(PATHS.LOG_HTML());
    win.on('ready-to-show', () => win.show());
    win.on('closed', () => {
      this._windows.delete('log');
      this._clearWindowState('log');
      this._notifyEvent('closed', 'log');
    });

    this._windows.set('log', win);
    this._notifyEvent('created', 'log');
  }

  // 创建设置窗口
  public createSettingsWindow(): void {
    if (this.isWindowValid('settings')) {
      this.focusWindow('settings');
      return;
    }

    const mainWindow = this.getWindow('main');

    const win = new BrowserWindow({
      width: 700,
      height: 650,
      parent: mainWindow ?? undefined,
      modal: true,
      icon: getAppIcon(),
      webPreferences: {
        preload: PATHS.PRELOAD_JS,
        nodeIntegration: false,
        contextIsolation: true
      },
      title: 'ComfyUI 设置',
      show: false,
      resizable: false,
      autoHideMenuBar: true
    });

    void win.loadFile(PATHS.SETTINGS_HTML());
    win.on('ready-to-show', () => win.show());
    win.on('closed', () => {
      this._windows.delete('settings');
      this._clearWindowState('settings');
      this._notifyEvent('closed', 'settings');
    });

    this._windows.set('settings', win);
    this._notifyEvent('created', 'settings');
  }

  // 显示右键菜单
  private _showContextMenu(win: BrowserWindow): void {
    // 延迟加载避免循环依赖
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { processManager } = require('./process') as { processManager: import('./process').ProcessManager };
    const status = stateManager.status;

    const menu = Menu.buildFromTemplate([
      {
        label: status === 'running' ? '停止 ComfyUI' : '启动 ComfyUI',
        click: () => (status === 'running' ? processManager.stop() : void processManager.start())
      },
      {
        label: '重启 ComfyUI',
        click: () => void processManager.restart()
        // 重启功能在任何时候都可用
      },
      { type: 'separator' },
      {
        label: '查看实时日志',
        click: () => this.createLogWindow()
      },
      {
        label: '设置',
        click: () => this.createSettingsWindow()
      },
      {
        label: '重新选择环境',
        click: () => this.createEnvSelectWindow()
      },
      ...createFileOperationMenuItems(),
      {
        label: '刷新页面',
        click: () => {
          if (!win.isDestroyed()) win.reload();
        }
      },
      {
        label: '强制刷新（清除缓存）',
        click: () => {
          if (!win.isDestroyed()) win.webContents.reloadIgnoringCache();
        }
      },
      {
        label: '重置所有配置',
        click: () => {
          void this.resetConfig();
        }
      }
    ]);
    menu.popup();
  }

  // 重置配置
  public async resetConfig(): Promise<void> {
    const mainWindow = this.getWindow('main');
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: '警告',
      message: '确定要重置所有配置吗？',
      detail: '这将清除所有路径、端口、参数等设置，恢复到初始状态',
      buttons: ['取消', '确认重置'],
      defaultId: 0,
      cancelId: 0
    });

    if (result.response === 1) {
      configManager.reset();
      await dialog.showMessageBox({
        type: 'info',
        title: '提示',
        message: '配置已重置，应用将重启并进入环境配置界面'
      });
      this._notifyEvent('reset-config', null);
    }
  }

  // 加载页面
  public loadPage(windowType: WindowType, page: string): void {
    const win = this._windows.get(windowType);
    if (win && !win.isDestroyed()) {
      if (page.startsWith('http')) {
        void win.loadURL(page);
      } else {
        void win.loadFile(PATHS.ASSETS_DIR(page));
      }
    }
  }

  // 更新窗口标题
  public updateTitle(windowType: WindowType, title: string): void {
    const win = this._windows.get(windowType);
    if (win && !win.isDestroyed()) {
      win.setTitle(title);
    }
  }

  // 发送消息到窗口（带消息队列）
  public sendToWindow(windowType: WindowType, channel: string, data: unknown): void {
    const win = this._windows.get(windowType);
    const isReady = this._rendererReady.get(windowType);

    // 窗口不存在或已销毁，直接返回
    if (!win || win.isDestroyed()) return;

    // 渲染进程未就绪，加入队列
    if (!isReady) {
      if (!this._messageQueue.has(windowType)) {
        this._messageQueue.set(windowType, []);
      }
      const queue = this._messageQueue.get(windowType);
      if (queue) {
        queue.push({ channel, data });
      }
      return;
    }

    // 先刷新队列中的消息
    this._flushQueue(windowType);

    // 发送当前消息
    win.webContents.send(channel, data);
  }

  // 设置渲染进程就绪状态
  public setRendererReady(windowType: WindowType): void {
    this._rendererReady.set(windowType, true);
    this._flushQueue(windowType);
  }

  // 刷新消息队列
  private _flushQueue(windowType: WindowType): void {
    const win = this._windows.get(windowType);
    const queue = this._messageQueue.get(windowType) ?? [];

    while (queue.length > 0 && win && !win.isDestroyed()) {
      const msg = queue.shift();
      if (msg) {
        win.webContents.send(msg.channel, msg.data);
      }
    }
  }

  // 清除窗口的就绪状态和消息队列
  private _clearWindowState(windowType: WindowType): void {
    this._rendererReady.delete(windowType);
    this._messageQueue.delete(windowType);
  }

  // 广播消息到所有窗口
  public broadcast(channel: string, data: unknown): void {
    this._windows.forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data);
      }
    });
  }

  // 通知事件
  private _notifyEvent(event: string, windowType: WindowType | null): void {
    if (this._onWindowEvent) {
      this._onWindowEvent(event, windowType);
    }
  }

  // 关闭所有窗口
  public closeAll(): void {
    this._windows.forEach(win => {
      if (!win.isDestroyed()) {
        win.close();
      }
    });
    this._windows.clear();
  }

  // 清除浏览器缓存
  public async clearBrowserCache(): Promise<boolean> {
    try {
      const ses = session.defaultSession;
      await ses.clearCache();
      console.log('[WindowManager] 浏览器缓存已清除');
      return true;
    } catch (err) {
      console.error('[WindowManager] 清除浏览器缓存失败:', err);
      return false;
    }
  }

  // 清除存储数据（包括 localStorage, sessionStorage, indexedDB 等）
  public async clearStorageData(): Promise<boolean> {
    try {
      const ses = session.defaultSession;
      await ses.clearStorageData({
        storages: ['localstorage', 'indexdb', 'serviceworkers', 'cachestorage']
      });
      console.log('[WindowManager] 存储数据已清除');
      return true;
    } catch (err) {
      console.error('[WindowManager] 清除存储数据失败:', err);
      return false;
    }
  }

  // 清除所有缓存（浏览器缓存 + 存储数据）
  public async clearAllCache(): Promise<boolean> {
    try {
      await this.clearBrowserCache();
      await this.clearStorageData();
      console.log('[WindowManager] 所有缓存已清除');
      return true;
    } catch (err) {
      console.error('[WindowManager] 清除所有缓存失败:', err);
      return false;
    }
  }

  // 注入 CSS 修复插件布局问题（已禁用，避免干扰原生布局）
  // 如果后续发现特定插件有布局问题，可以取消注释此方法
  /*
  private _injectLayoutFixCSS(win: BrowserWindow): void {
    const css = `
      ... CSS代码已省略 ...
    `;

    win.webContents.insertCSS(css).catch(err => {
      console.error('[WindowManager] Failed to inject layout fix CSS:', err);
    });
  }
  */
}

// 导出单例
export const windowManager = new WindowManager();

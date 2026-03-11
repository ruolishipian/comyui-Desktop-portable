/**
 * 托盘管理模块
 * 集中管理系统托盘的创建、菜单、状态更新
 */

import fsSync from 'fs';

import { Tray, Menu, app } from 'electron';

import { logger } from './logger';
import { createFileOperationMenuItems } from './menu-utils';
import { PATHS } from './paths';
import { ProcessManager } from './process';
import { stateManager } from './state';
import { WindowManager } from './windows';

// 托盘管理器
export class TrayManager {
  private _tray: Tray | null = null;
  private _updateInterval: NodeJS.Timeout | null = null;
  private _windowManager: WindowManager | null = null;
  private _processManager: ProcessManager | null = null;

  // 设置依赖
  public setDependencies(windowManager: WindowManager, processManager: ProcessManager): void {
    this._windowManager = windowManager;
    this._processManager = processManager;
  }

  // 创建托盘
  public create(): void {
    if (this._tray) return;

    // 查找图标
    const iconPath = this._findIcon();
    if (iconPath === null || iconPath === '') {
      logger.warn('托盘图标文件不存在，跳过托盘创建');
      return;
    }

    this._tray = new Tray(iconPath);
    this._updateMenu();

    // 定时更新菜单
    this._updateInterval = setInterval(() => {
      this._updateMenu();
    }, 1000);

    // 点击事件
    this._tray.on('click', () => {
      if (this._windowManager) {
        const mainWindow = this._windowManager.getWindow('main');
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        }
      }
    });

    logger.info('系统托盘已创建');
  }

  // 查找图标文件
  private _findIcon(): string | null {
    const iconPaths = [PATHS.TRAY_ICON(), PATHS.APP_ICON()];

    for (const iconPath of iconPaths) {
      if (fsSync.existsSync(iconPath)) {
        return iconPath;
      }
    }
    return null;
  }

  // 更新菜单
  private _updateMenu(): void {
    if (!this._tray) return;

    const status = stateManager.status;
    const menu = Menu.buildFromTemplate([
      {
        label: status === 'running' ? '停止 ComfyUI' : '启动 ComfyUI',
        click: () => {
          if (this._processManager !== null) {
            if (status === 'running') {
              this._processManager.stop();
            } else {
              void this._processManager.start();
            }
          }
        }
      },
      {
        label: '重启 ComfyUI',
        click: () => {
          if (this._processManager !== null) {
            void this._processManager.restart();
          }
        }
        // 重启功能在任何时候都可用
      },
      { type: 'separator' },
      {
        label: '查看实时日志',
        click: () => {
          if (this._windowManager) {
            this._windowManager.createLogWindow();
          }
        }
      },
      {
        label: '设置',
        click: () => {
          if (this._windowManager) {
            this._windowManager.createSettingsWindow();
          }
        }
      },
      {
        label: '重新选择环境',
        click: () => {
          if (this._windowManager) {
            this._windowManager.createEnvSelectWindow();
          }
        }
      },
      ...createFileOperationMenuItems(),
      {
        label: '显示窗口',
        click: () => {
          if (this._windowManager) {
            this._windowManager.focusWindow('main');
          }
        }
      },
      {
        label: '重置所有配置',
        click: () => {
          if (this._windowManager !== null) {
            void this._windowManager.resetConfig();
          }
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          this._quit();
        }
      }
    ]);

    this._tray.setContextMenu(menu);
    this._tray.setToolTip(`ComfyUI - ${status.toUpperCase()}`);
  }

  // 退出应用
  private _quit(): void {
    global.isQuiting = true;
    // 直接退出，before-quit 事件会处理进程停止
    app.quit();
  }

  // 销毁托盘
  public destroy(): void {
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
      this._updateInterval = null;
    }
    if (this._tray) {
      this._tray.destroy();
      this._tray = null;
    }
  }
}

// 导出单例
export const trayManager = new TrayManager();

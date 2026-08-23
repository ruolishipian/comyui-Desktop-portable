/**
 * 托盘管理模块
 * 集中管理系统托盘的创建、菜单、状态更新
 */

import fsSync from 'fs';

import { Tray, Menu, app } from 'electron';

import { logger } from './logger';
import { createComfyUIControlMenuItems, createCommonNavMenuItems, createFileOperationMenuItems, createResetConfigMenuItem, createQuitMenuItem } from './menu-utils';
import { PATHS } from './paths';
import { ProcessManager } from './process';
import { stateManager } from './state';
import { TerminalManager } from './terminal';
import { WindowManager } from './windows';

// 托盘管理器
export class TrayManager {
  private _tray: Tray | null = null;

  private _windowManager: WindowManager | null = null;
  private _processManager: ProcessManager | null = null;
  private _terminalManager: TerminalManager | null = null;

  public setDependencies(
    windowManager: WindowManager,
    processManager: ProcessManager,
    terminalManager: TerminalManager
  ): void {
    this._windowManager = windowManager;
    this._processManager = processManager;
    this._terminalManager = terminalManager;
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

    // 监听状态变更更新菜单（替代定时器轮询）
    stateManager.addListener(() => this._updateMenu());

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

    logger.info('[TrayManager] Searching for tray icon...');
    logger.info(`[TrayManager] process.resourcesPath: ${process.resourcesPath}`);
    logger.info(`[TrayManager] app.isPackaged: ${app.isPackaged}`);

    for (const iconPath of iconPaths) {
      logger.info(`[TrayManager] Checking icon path: ${iconPath}`);
      if (fsSync.existsSync(iconPath)) {
        logger.info(`[TrayManager] Found icon at: ${iconPath}`);
        return iconPath;
      }
      logger.warn(`[TrayManager] Icon not found at: ${iconPath}`);
    }

    logger.error('[TrayManager] No icon found in any location');
    return null;
  }

  // 更新菜单
  private _updateMenu(): void {
    if (!this._tray) return;

    const status = stateManager.status;
    const context = {
      windowManager: this._windowManager,
      processManager: this._processManager,
      terminalManager: this._terminalManager
    };

    const menu = Menu.buildFromTemplate([
      ...createComfyUIControlMenuItems(context as Parameters<typeof createComfyUIControlMenuItems>[0]),
      ...createCommonNavMenuItems(context as Parameters<typeof createCommonNavMenuItems>[0]),
      ...createFileOperationMenuItems(),
      {
        label: '显示窗口',
        click: () => {
          if (this._windowManager) {
            this._windowManager.focusWindow('main');
          }
        }
      },
      createResetConfigMenuItem(context as Parameters<typeof createResetConfigMenuItem>[0]),
      { type: 'separator' },
      createQuitMenuItem()
    ]);

    this._tray.setContextMenu(menu);
    this._tray.setToolTip(`ComfyUI - ${status.toUpperCase()}`);
  }


  // 销毁托盘
  public destroy(): void {

    if (this._tray) {
      this._tray.destroy();
      this._tray = null;
    }
  }
}

// 导出单例
export const trayManager = new TrayManager();

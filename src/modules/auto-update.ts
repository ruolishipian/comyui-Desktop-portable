/**
 * 自动更新模块
 * 基于 electron-updater，从 GitHub Releases 拉取更新
 *
 * 策略：
 * - 启动时检查更新（延迟 5s，避免影响启动速度）
 * - 之后每 30min 检查一次
 * - Windows: 启动时安装待更新（避免关机时安装损坏）
 * - 便携版（ZIP）: 下载后提示用户手动重启替换
 */

import { BrowserWindow, dialog } from 'electron';
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';

import { logger } from './logger';

export class AutoUpdateManager {
  private _initialized = false;
  private _checkTimer: ReturnType<typeof setInterval> | null = null;
  private static readonly STARTUP_DELAY_MS = 5000;
  private static readonly CHECK_INTERVAL_MS = 30 * 60 * 1000;

  public get initialized(): boolean {
    return this._initialized;
  }

  public init(): void {
    if (this._initialized) return;

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'Comfy-Org',
      repo: 'comyui-Desktop-portable'
    });

    autoUpdater.on('checking-for-update', () => {
      logger.info('自动更新: 正在检查更新...');
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      logger.info(`自动更新: 发现新版本 v${info.version}`);
    });

    autoUpdater.on('update-not-available', () => {
      logger.info('自动更新: 当前已是最新版本');
    });

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      const transferred = (progress.transferred / 1024 / 1024).toFixed(1);
      const total = (progress.total / 1024 / 1024).toFixed(1);
      logger.info(`自动更新: 下载进度 ${progress.percent.toFixed(1)}% (${transferred}MB / ${total}MB)`);
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      logger.info(`自动更新: v${info.version} 已下载完成`);
      this._notifyUpdateReady(info);
    });

    autoUpdater.on('error', (err: Error) => {
      logger.warn(`自动更新: ${err.message}`);
    });

    this._initialized = true;

    setTimeout(() => {
      void this.checkForUpdate();
    }, AutoUpdateManager.STARTUP_DELAY_MS);

    this._checkTimer = setInterval(() => {
      void this.checkForUpdate();
    }, AutoUpdateManager.CHECK_INTERVAL_MS);

    logger.info('自动更新模块已初始化');
  }

  public async checkForUpdate(): Promise<void> {
    if (!this._initialized) return;
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      const error = err as Error;
      logger.warn(`自动更新检查失败: ${error.message}`);
    }
  }

  public async downloadUpdate(): Promise<void> {
    if (!this._initialized) return;
    try {
      await autoUpdater.downloadUpdate();
    } catch (err) {
      const error = err as Error;
      logger.warn(`自动更新下载失败: ${error.message}`);
    }
  }

  public quitAndInstall(): void {
    autoUpdater.quitAndInstall();
  }

  private _notifyUpdateReady(info: UpdateInfo): void {
    const windows = BrowserWindow.getAllWindows();
    const mainWindow = windows.find(w => !w.isDestroyed());

    if (!mainWindow) return;

    void dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '更新可用',
      message: `ComfyUI 便携桌面版 v${info.version} 已下载完成`,
      detail: '重启应用以完成更新。当前版本的所有工作将被保留。',
      buttons: ['稍后重启', '立即重启'],
      defaultId: 1,
      cancelId: 0
    }).then(result => {
      if (result.response === 1) {
        this.quitAndInstall();
      }
    });
  }

  public destroy(): void {
    if (this._checkTimer) {
      clearInterval(this._checkTimer);
      this._checkTimer = null;
    }
    this._initialized = false;
    logger.info('自动更新模块已销毁');
  }
}

export const autoUpdateManager = new AutoUpdateManager();

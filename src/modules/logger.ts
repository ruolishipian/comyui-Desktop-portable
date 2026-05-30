/**
 * 日志管理模块
 * 集中管理日志记录、轮转、清理
 * 统一单通道写入，级别判断由 log-parser 负责
 */

import fs from 'fs';
import path from 'path';

import { app, BrowserWindow } from 'electron';

import { IPC_CHANNELS } from '../constants/ipc-channels';
import { LogLevel } from '../types';

import { configManager } from './config';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2
};

export class Logger {
  private _buffer: string = '';
  private _timer: NodeJS.Timeout | null = null;
  private _logWindow: BrowserWindow | null = null;
  private _initialized: boolean = false;
  private _maxBufferSize: number = 1024 * 1024;
  private _writeQueue: string[] = [];
  private _isWriting: boolean = false;
  private _lastRotateCheck: number = 0;
  private readonly _rotateCheckInterval: number = 60000;

  private _comfyUILogFile: string = '';
  private _comfyUIWriteQueue: string[] = [];
  private _isComfyUIWriting: boolean = false;
  private _lastComfyUIRotateCheck: number = 0;
  private readonly _comfyUIRotateCheckInterval: number = 60000;
  private readonly _comfyUILogMaxSize: number = 50 * 1024 * 1024;

  private _sessionLogCache: string = '';
  private readonly _maxSessionLogSize: number = 5 * 1024 * 1024;

  public init(): void {
    this._initialized = true;

    const logsDir = configManager.logsDir;
    if (logsDir && !fs.existsSync(logsDir)) {
      try {
        fs.mkdirSync(logsDir, { recursive: true });
        console.log(`[Logger] 创建日志目录: ${logsDir}`);
      } catch (err) {
        console.error('[Logger] 创建日志目录失败:', err);
      }
    }

    this._comfyUILogFile = path.join(configManager.logsDir, 'comfyui-output.log');

    const todayLogFile = this.getTodayLogFile();
    if (!fs.existsSync(todayLogFile)) {
      try {
        fs.writeFileSync(todayLogFile, '', 'utf8');
        console.log(`[Logger] 创建日志文件: ${todayLogFile}`);
      } catch (err) {
        console.error('[Logger] 创建日志文件失败:', err);
      }
    }

    this._rotateLogs();
    void this._cleanOldComfyUILogs();
  }

  private _rotateLogs(): void {
    try {
      const logConfig = configManager.logs;
      const keepDays = logConfig.keepDays ?? 7;
      const maxFiles = 50;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);

      const logsDir = configManager.logsDir;
      if (!fs.existsSync(logsDir)) {
        return;
      }

      const logFiles = fs.readdirSync(logsDir);
      const logFileInfos = logFiles
        .filter(file => file.endsWith('.log'))
        .map(file => {
          const filePath = path.join(logsDir, file);
          try {
            const stat = fs.statSync(filePath);
            return {
              name: file,
              path: filePath,
              mtime: stat.mtime.getTime(),
              isFile: stat.isFile()
            };
          } catch {
            return null;
          }
        })
        .filter((info): info is NonNullable<typeof info> => info !== null && info.isFile)
        .sort((a, b) => b.mtime - a.mtime);

      let deletedCount = 0;

      if (logFileInfos.length > maxFiles) {
        const filesToDelete = logFileInfos.slice(maxFiles);
        filesToDelete.forEach(file => {
          try {
            fs.unlinkSync(file.path);
            deletedCount++;
          } catch {
            // 忽略
          }
        });
      }

      logFileInfos.forEach(file => {
        if (file.mtime < cutoffDate.getTime()) {
          try {
            fs.unlinkSync(file.path);
            deletedCount++;
          } catch {
            // 忽略
          }
        }
      });

      if (deletedCount > 0) {
        console.log(`日志轮转完成，删除了 ${deletedCount} 个日志文件`);
      }
    } catch (err) {
      console.warn('日志轮转失败:', err);
    }
  }

  public setLogWindow(window: BrowserWindow | null): void {
    this._logWindow = window;
  }

  public getTodayLogFile(): string {
    const date = new Date().toISOString().slice(0, 10);
    return path.join(configManager.logsDir, `comfyui-${date}.log`);
  }

  /**
   * 统一日志写入入口
   * 级别判断已由 log-parser 完成，此处仅做级别过滤和格式化
   */
  public log(content: string, level: LogLevel = 'info'): void {
    if (!this._initialized) return;

    const logConfig = configManager.logs;
    if (!logConfig.enable) return;

    const configLevel = logConfig.level ?? 'info';
    if (LOG_LEVEL_PRIORITY[level] > LOG_LEVEL_PRIORITY[configLevel]) {
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    const logLine = `[${timestamp}] [${level}] ${content}\n`;

    if (this._sessionLogCache.length < this._maxSessionLogSize) {
      this._sessionLogCache += logLine;
    } else {
      const cacheLines = this._sessionLogCache.split('\n');
      const keepLines = Math.floor(cacheLines.length * 0.8);
      this._sessionLogCache = cacheLines.slice(-keepLines).join('\n') + logLine;
    }

    if (this._buffer.length < this._maxBufferSize) {
      this._buffer += logLine;
    } else {
      this._flushBuffer();
      this._buffer = logLine;
    }
    this._scheduleFlush();

    this._queueWrite(logLine);

    // 同时写入 ComfyUI 独立日志（原始内容，无级别标签）
    this._queueComfyUIWrite(`[${timestamp}] ${content}\n`);

    if (!app.isPackaged) {
      console.log(logLine.trim());
    }
  }

  public error(content: string): void {
    this.log(content, 'error');
  }

  public warn(content: string): void {
    this.log(content, 'warn');
  }

  public info(content: string): void {
    this.log(content, 'info');
  }

  private _scheduleFlush(): void {
    if (this._timer) return;

    const throttle = configManager.advanced.stdoutThrottle ?? 100;
    this._timer = setTimeout(() => {
      this._flushBuffer();
      this._timer = null;
    }, throttle);
  }

  private _flushBuffer(): void {
    if (!this._buffer) return;

    if (this._logWindow && !this._logWindow.isDestroyed() && this._logWindow.isVisible()) {
      const logConfig = configManager.logs;
      if (logConfig.realtime) {
        this._logWindow.webContents.send(IPC_CHANNELS.LOG_UPDATE, this._buffer);
      }
    }

    this._buffer = '';
  }

  private async _writeToFile(logLine: string): Promise<void> {
    try {
      const now = Date.now();
      if (now - this._lastRotateCheck > this._rotateCheckInterval) {
        await this._rotateLogFile();
        this._lastRotateCheck = now;
      }

      await fs.promises.appendFile(this.getTodayLogFile(), logLine, 'utf8');
    } catch (err) {
      const error = err as Error;
      console.error('[Logger] 写入失败:', error.message);
    }
  }

  private _queueWrite(logLine: string): void {
    this._writeQueue.push(logLine);
    if (!this._isWriting) {
      void this._processWriteQueue();
    }
  }

  private async _processWriteQueue(): Promise<void> {
    if (this._writeQueue.length === 0) {
      this._isWriting = false;
      return;
    }

    this._isWriting = true;
    const logLine = this._writeQueue.shift();

    if (logLine !== undefined) {
      await this._writeToFile(logLine);
    }

    void setImmediate(() => {
      void this._processWriteQueue();
    });
  }

  private async _rotateLogFile(): Promise<void> {
    const logFile = this.getTodayLogFile();
    const logConfig = configManager.logs;

    try {
      const stats = await fs.promises.stat(logFile);
      const maxSize = logConfig.maxSize ?? 10 * 1024 * 1024;
      if (stats.size > maxSize) {
        const timestamp = Date.now();
        await fs.promises.rename(logFile, `${logFile}.${timestamp}`);
        await this._cleanOldLogs();
      }
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code !== 'ENOENT') {
        console.error('[Logger] 轮转失败:', error.message);
      }
    }
  }

  private async _cleanOldLogs(): Promise<void> {
    const logConfig = configManager.logs;
    const keepDays = logConfig.keepDays ?? 7;
    const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;

    try {
      const files = await fs.promises.readdir(configManager.logsDir);
      for (const file of files) {
        if (file.startsWith('comfyui-') && (file.endsWith('.log') || file.includes('.log.'))) {
          const filePath = path.join(configManager.logsDir, file);
          const stats = await fs.promises.stat(filePath);
          if (stats.ctimeMs < cutoff) {
            await fs.promises.unlink(filePath);
          }
        }
      }
    } catch (err) {
      const error = err as Error;
      console.error('[Logger] 清理过期日志失败:', error.message);
    }
  }

  public async readLogContent(): Promise<string> {
    const logFile = this.getTodayLogFile();
    try {
      return await fs.promises.readFile(logFile, 'utf8');
    } catch (err) {
      const error = err as Error;
      return `[日志] 读取失败：${error.message}`;
    }
  }

  public async clearLog(): Promise<boolean> {
    const logFile = this.getTodayLogFile();
    try {
      await fs.promises.writeFile(logFile, '', 'utf8');
      this.info('日志已清空');
      return true;
    } catch (err) {
      const error = err as Error;
      this.error(`清空日志失败：${error.message}`);
      return false;
    }
  }

  // ========== ComfyUI 独立日志 ==========

  private _queueComfyUIWrite(line: string): void {
    this._comfyUIWriteQueue.push(line);
    if (!this._isComfyUIWriting) {
      void this._processComfyUIWriteQueue();
    }
  }

  private async _processComfyUIWriteQueue(): Promise<void> {
    if (this._comfyUIWriteQueue.length === 0) {
      this._isComfyUIWriting = false;
      return;
    }

    this._isComfyUIWriting = true;
    const line = this._comfyUIWriteQueue.shift();

    if (line !== undefined && this._comfyUILogFile) {
      try {
        const now = Date.now();
        if (now - this._lastComfyUIRotateCheck > this._comfyUIRotateCheckInterval) {
          await this._rotateComfyUILogFile();
          this._lastComfyUIRotateCheck = now;
        }

        await fs.promises.appendFile(this._comfyUILogFile, line, 'utf8');
      } catch (err) {
        const error = err as Error;
        console.error('[Logger] ComfyUI 日志写入失败:', error.message);
      }
    }

    void setImmediate(() => {
      void this._processComfyUIWriteQueue();
    });
  }

  private async _rotateComfyUILogFile(): Promise<void> {
    if (!this._comfyUILogFile) return;

    try {
      const stats = await fs.promises.stat(this._comfyUILogFile);
      if (stats.size > this._comfyUILogMaxSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = this._comfyUILogFile.replace('.log', `_${timestamp}.log`);

        await fs.promises.rename(this._comfyUILogFile, rotatedFile);
        console.log(`[Logger] ComfyUI 日志轮转: ${path.basename(this._comfyUILogFile)} -> ${path.basename(rotatedFile)}`);

        await fs.promises.writeFile(this._comfyUILogFile, '', 'utf8');
        await this._cleanOldComfyUILogs();
      }
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code !== 'ENOENT') {
        console.error('[Logger] ComfyUI 日志轮转失败:', error.message);
      }
    }
  }

  private async _cleanOldComfyUILogs(): Promise<void> {
    const logConfig = configManager.logs;
    const keepDays = logConfig.keepDays ?? 7;
    const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
    const maxFiles = 10;

    try {
      const logsDir = configManager.logsDir;
      const files = await fs.promises.readdir(logsDir);
      const comfyUILogs: Array<{ name: string; path: string; mtime: number }> = [];
      for (const file of files) {
        if (file.startsWith('comfyui-output_') && file.endsWith('.log')) {
          const filePath = path.join(logsDir, file);
          const stats = await fs.promises.stat(filePath);
          comfyUILogs.push({
            name: file,
            path: filePath,
            mtime: stats.mtime.getTime()
          });
        }
      }

      comfyUILogs.sort((a, b) => b.mtime - a.mtime);

      let deletedCount = 0;

      if (comfyUILogs.length > maxFiles) {
        const filesToDelete = comfyUILogs.slice(maxFiles);
        for (const file of filesToDelete) {
          await fs.promises.unlink(file.path);
          deletedCount++;
        }
      }

      for (const file of comfyUILogs) {
        if (file.mtime < cutoff) {
          try {
            await fs.promises.unlink(file.path);
            deletedCount++;
          } catch {
            // 忽略
          }
        }
      }

      if (deletedCount > 0) {
        console.log(`[Logger] 清理 ComfyUI 旧日志完成，删除了 ${deletedCount} 个文件`);
      }
    } catch (err) {
      const error = err as Error;
      console.error('[Logger] 清理 ComfyUI 旧日志失败:', error.message);
    }
  }

  public async readComfyUILogContent(): Promise<string> {
    if (!this._comfyUILogFile) return '';
    try {
      return await fs.promises.readFile(this._comfyUILogFile, 'utf8');
    } catch (err) {
      const error = err as Error;
      return `[日志] 读取失败：${error.message}`;
    }
  }

  public async clearComfyUILog(): Promise<boolean> {
    if (!this._comfyUILogFile) return false;
    try {
      await fs.promises.writeFile(this._comfyUILogFile, '', 'utf8');
      return true;
    } catch (err) {
      const error = err as Error;
      this.error(`清空 ComfyUI 日志失败：${error.message}`);
      return false;
    }
  }

  // ========== 会话日志管理 ==========

  public getSessionLog(): string {
    return this._sessionLogCache;
  }

  public clearSessionLog(): void {
    this._sessionLogCache = '';
  }
}

export const logger = new Logger();

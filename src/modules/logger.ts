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
  private _lastRotateCheck: number = 0;
  private readonly _rotateCheckInterval: number = 60000;
  private _writeStream: fs.WriteStream | null = null;
  private _currentLogFile: string = '';
  private _pendingWrite: string = '';
  private _writeTimer: NodeJS.Timeout | null = null;
  private readonly _writeFlushInterval: number = 500;
  private readonly _maxPendingSize: number = 64 * 1024;
  private readonly _maxIpcChunkSize: number = 32 * 1024;
  private _highFreqCount: number = 0;
  private _highFreqWindowStart: number = 0;
  private readonly _highFreqThreshold: number = 200;
  private readonly _highFreqWindowMs: number = 1000;
  private _isHighFreqMode: boolean = false;

  private _comfyUILogFile: string = '';
  private _lastComfyUIRotateCheck: number = 0;
  private readonly _comfyUIRotateCheckInterval: number = 60000;
  private readonly _comfyUILogMaxSize: number = 50 * 1024 * 1024;
  private _comfyUIWriteStream: fs.WriteStream | null = null;
  private _comfyUIPendingWrite: string = '';
  private _comfyUIWriteTimer: NodeJS.Timeout | null = null;
  private readonly _comfyUIWriteFlushInterval: number = 500;

  private _sessionLogCache: string[] = [];
  private _sessionLogSize: number = 0;
  private readonly _maxSessionLogSize: number = 5 * 1024 * 1024;

  public async init(): Promise<void> {
    this._initialized = true;

    const logsDir = configManager.logsDir;
    if (logsDir) {
      try {
        await fs.promises.access(logsDir);
      } catch {
        try {
          await fs.promises.mkdir(logsDir, { recursive: true });
          console.log(`[Logger] 创建日志目录: ${logsDir}`);
        } catch (err) {
          console.error('[Logger] 创建日志目录失败:', err);
        }
      }
    }

    this._comfyUILogFile = path.join(configManager.logsDir, 'comfyui-output.log');

    const todayLogFile = this.getTodayLogFile();
    try {
      await fs.promises.access(todayLogFile);
    } catch {
      try {
        await fs.promises.writeFile(todayLogFile, '', 'utf8');
        console.log(`[Logger] 创建日志文件: ${todayLogFile}`);
      } catch (err) {
        console.error('[Logger] 创建日志文件失败:', err);
      }
    }

    this._openWriteStream(todayLogFile);
    this._openComfyUIWriteStream(this._comfyUILogFile);

    void this._rotateLogs();
    void this._cleanOldComfyUILogs();
  }

  private _openWriteStream(logFile: string): void {
    if (this._writeStream) {
      this._flushPendingWrite();
      this._writeStream.end();
    }
    this._currentLogFile = logFile;
    this._writeStream = fs.createWriteStream(logFile, { flags: 'a', encoding: 'utf8' });
    this._writeStream.on('error', (err) => {
      console.error('[Logger] 写入流错误:', err.message);
    });
  }

  private _openComfyUIWriteStream(logFile: string): void {
    if (this._comfyUIWriteStream) {
      this._flushComfyUIPendingWrite();
      this._comfyUIWriteStream.end();
    }
    this._comfyUIWriteStream = fs.createWriteStream(logFile, { flags: 'a', encoding: 'utf8' });
    this._comfyUIWriteStream.on('error', (err) => {
      console.error('[Logger] ComfyUI 写入流错误:', err.message);
    });
  }

  private async _rotateLogs(): Promise<void> {
    try {
      const logConfig = configManager.logs;
      const keepDays = logConfig.keepDays ?? 7;
      const maxFiles = 50;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);

      const logsDir = configManager.logsDir;
      try {
        await fs.promises.access(logsDir);
      } catch {
        return;
      }

      const logFiles = await fs.promises.readdir(logsDir);
      const logFileInfos: Array<{ name: string; filePath: string; mtime: number }> = [];

      for (const file of logFiles) {
        if (!file.endsWith('.log')) continue;
        const filePath = path.join(logsDir, file);
        try {
          const stat = await fs.promises.stat(filePath);
          if (stat.isFile()) {
            logFileInfos.push({
              name: file,
              filePath,
              mtime: stat.mtime.getTime()
            });
          }
        } catch {
          // 忽略
        }
      }

      logFileInfos.sort((a, b) => b.mtime - a.mtime);

      let deletedCount = 0;

      if (logFileInfos.length > maxFiles) {
        const filesToDelete = logFileInfos.slice(maxFiles);
        for (const file of filesToDelete) {
          try {
            await fs.promises.unlink(file.filePath);
            deletedCount++;
          } catch {
            // 忽略
          }
        }
      }

      for (const file of logFileInfos) {
        if (file.mtime < cutoffDate.getTime()) {
          try {
            await fs.promises.unlink(file.filePath);
            deletedCount++;
          } catch {
            // 忽略
          }
        }
      }

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

    const now = Date.now();
    if (now - this._highFreqWindowStart > this._highFreqWindowMs) {
      if (this._isHighFreqMode && this._highFreqCount < this._highFreqThreshold) {
        this._isHighFreqMode = false;
      }
      this._highFreqCount = 0;
      this._highFreqWindowStart = now;
    }
    this._highFreqCount++;

    if (this._highFreqCount >= this._highFreqThreshold) {
      this._isHighFreqMode = true;
    }

    if (this._isHighFreqMode && level === 'info') {
      const skipRate = Math.min(Math.floor(this._highFreqCount / this._highFreqThreshold), 10);
      if (skipRate > 1 && this._highFreqCount % skipRate !== 0) {
        this._appendPendingWrite(`[${new Date().toLocaleTimeString()}] [${level}] ${content}\n`);
        this._appendComfyUIPendingWrite(`[${new Date().toLocaleTimeString()}] ${content}\n`);
        return;
      }
    }

    const timestamp = new Date().toLocaleTimeString();
    const logLine = `[${timestamp}] [${level}] ${content}\n`;

    if (this._sessionLogSize + logLine.length < this._maxSessionLogSize) {
      this._sessionLogCache.push(logLine);
      this._sessionLogSize += logLine.length;
    } else {
      const keepCount = Math.floor(this._sessionLogCache.length * 0.8);
      this._sessionLogCache = this._sessionLogCache.slice(-keepCount);
      this._sessionLogSize = this._sessionLogCache.reduce((sum, line) => sum + line.length, 0);
      this._sessionLogCache.push(logLine);
      this._sessionLogSize += logLine.length;
    }

    if (this._buffer.length < this._maxBufferSize) {
      this._buffer += logLine;
    } else {
      this._flushBuffer();
      this._buffer = logLine;
    }
    this._scheduleFlush();

    this._appendPendingWrite(logLine);

    this._appendComfyUIPendingWrite(`[${timestamp}] ${content}\n`);

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
        if (this._buffer.length <= this._maxIpcChunkSize) {
          this._logWindow.webContents.send(IPC_CHANNELS.LOG_UPDATE, this._buffer);
        } else {
          let offset = 0;
          while (offset < this._buffer.length) {
            let end = offset + this._maxIpcChunkSize;
            if (end < this._buffer.length) {
              const lastNewline = this._buffer.lastIndexOf('\n', end);
              if (lastNewline > offset) {
                end = lastNewline + 1;
              }
            } else {
              end = this._buffer.length;
            }
            const chunk = this._buffer.substring(offset, end);
            if (chunk) {
              this._logWindow.webContents.send(IPC_CHANNELS.LOG_UPDATE, chunk);
            }
            offset = end;
          }
        }
      }
    }

    this._buffer = '';
  }

  private _appendPendingWrite(logLine: string): void {
    this._pendingWrite += logLine;
    if (this._pendingWrite.length >= this._maxPendingSize) {
      this._flushPendingWrite();
    } else if (!this._writeTimer) {
      this._writeTimer = setTimeout(() => {
        this._flushPendingWrite();
      }, this._writeFlushInterval);
    }
  }

  private _flushPendingWrite(): void {
    if (this._writeTimer) {
      clearTimeout(this._writeTimer);
      this._writeTimer = null;
    }
    if (!this._pendingWrite || !this._writeStream) return;

    const now = Date.now();
    if (now - this._lastRotateCheck > this._rotateCheckInterval) {
      this._lastRotateCheck = now;
      void this._rotateLogFile();
    }

    this._writeStream.write(this._pendingWrite);
    this._pendingWrite = '';
  }

  private async _rotateLogFile(): Promise<void> {
    const logFile = this.getTodayLogFile();
    const logConfig = configManager.logs;

    try {
      if (logFile !== this._currentLogFile) {
        this._flushPendingWrite();
        this._openWriteStream(logFile);
        return;
      }

      const stats = await fs.promises.stat(logFile);
      const maxSize = logConfig.maxSize ?? 10 * 1024 * 1024;
      if (stats.size > maxSize) {
        this._flushPendingWrite();
        const timestamp = Date.now();
        await fs.promises.rename(logFile, `${logFile}.${timestamp}`);
        this._openWriteStream(logFile);
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
      const stats = await fs.promises.stat(logFile);
      const maxReadSize = 2 * 1024 * 1024;
      if (stats.size > maxReadSize) {
        const handle = await fs.promises.open(logFile, 'r');
        const start = stats.size - maxReadSize;
        const buffer = Buffer.alloc(maxReadSize);
        await handle.read(buffer, 0, maxReadSize, start);
        await handle.close();
        const content = buffer.toString('utf8');
        const firstNewline = content.indexOf('\n');
        return firstNewline >= 0 ? content.slice(firstNewline + 1) : content;
      }
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

  private _appendComfyUIPendingWrite(line: string): void {
    this._comfyUIPendingWrite += line;
    if (this._comfyUIPendingWrite.length >= this._maxPendingSize) {
      this._flushComfyUIPendingWrite();
    } else if (!this._comfyUIWriteTimer) {
      this._comfyUIWriteTimer = setTimeout(() => {
        this._flushComfyUIPendingWrite();
      }, this._comfyUIWriteFlushInterval);
    }
  }

  private _flushComfyUIPendingWrite(): void {
    if (this._comfyUIWriteTimer) {
      clearTimeout(this._comfyUIWriteTimer);
      this._comfyUIWriteTimer = null;
    }
    if (!this._comfyUIPendingWrite || !this._comfyUIWriteStream) return;

    const now = Date.now();
    if (now - this._lastComfyUIRotateCheck > this._comfyUIRotateCheckInterval) {
      this._lastComfyUIRotateCheck = now;
      void this._rotateComfyUILogFile();
    }

    this._comfyUIWriteStream.write(this._comfyUIPendingWrite);
    this._comfyUIPendingWrite = '';
  }

  private async _rotateComfyUILogFile(): Promise<void> {
    if (!this._comfyUILogFile) return;

    try {
      const stats = await fs.promises.stat(this._comfyUILogFile);
      if (stats.size > this._comfyUILogMaxSize) {
        this._flushComfyUIPendingWrite();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = this._comfyUILogFile.replace('.log', `_${timestamp}.log`);

        await fs.promises.rename(this._comfyUILogFile, rotatedFile);
        console.log(`[Logger] ComfyUI 日志轮转: ${path.basename(this._comfyUILogFile)} -> ${path.basename(rotatedFile)}`);

        this._openComfyUIWriteStream(this._comfyUILogFile);
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
      const stats = await fs.promises.stat(this._comfyUILogFile);
      const maxReadSize = 2 * 1024 * 1024;
      if (stats.size > maxReadSize) {
        const handle = await fs.promises.open(this._comfyUILogFile, 'r');
        const start = stats.size - maxReadSize;
        const buffer = Buffer.alloc(maxReadSize);
        await handle.read(buffer, 0, maxReadSize, start);
        await handle.close();
        const content = buffer.toString('utf8');
        const firstNewline = content.indexOf('\n');
        return firstNewline >= 0 ? content.slice(firstNewline + 1) : content;
      }
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
    return this._sessionLogCache.join('');
  }

  public clearSessionLog(): void {
    this._sessionLogCache = [];
    this._sessionLogSize = 0;
  }
}

export const logger = new Logger();

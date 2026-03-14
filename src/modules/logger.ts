/**
 * 日志管理模块
 * 集中管理日志记录、轮转、清理
 */

import fs from 'fs';
import path from 'path';

import { app, BrowserWindow } from 'electron';

import { IPC_CHANNELS } from '../constants/ipc-channels';
import { LogLevel } from '../types';

import { configManager } from './config';

// 日志级别优先级
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2
};

// ANSI 转义码正则表达式
const ANSI_CODES_REGEX = /[\u001B\u009B][#();?[]*(?:\d{1,4}(?:;\d{0,4})*)?[\d<=>A-ORZcf-nqry]/g;

// 日志管理器
export class Logger {
  private _buffer: string = '';
  private _timer: NodeJS.Timeout | null = null;
  private _logWindow: BrowserWindow | null = null;
  private _initialized: boolean = false;
  private _maxBufferSize: number = 1024 * 1024; // 1MB 缓冲区上限
  private _writeQueue: string[] = [];
  private _isWriting: boolean = false;
  private _lastRotateCheck: number = 0;
  private readonly _rotateCheckInterval: number = 60000; // 1分钟检查一次轮转

  // ComfyUI 独立日志文件
  private _comfyUILogFile: string = '';
  private _comfyUIWriteQueue: string[] = [];
  private _isComfyUIWriting: boolean = false;

  // 会话日志缓存 - 存储本次会话的所有日志
  private _sessionLogCache: string = '';
  private readonly _maxSessionLogSize: number = 5 * 1024 * 1024; // 5MB 会话日志上限

  // 清理 ANSI 转义码
  private _removeAnsiCodes(text: string): string {
    return text.replace(ANSI_CODES_REGEX, '');
  }

  // 初始化
  public init(): void {
    this._initialized = true;

    // 确保日志目录存在
    const logsDir = configManager.logsDir;
    if (logsDir && !fs.existsSync(logsDir)) {
      try {
        fs.mkdirSync(logsDir, { recursive: true });
        console.log(`[Logger] 创建日志目录: ${logsDir}`);
      } catch (err) {
        console.error('[Logger] 创建日志目录失败:', err);
      }
    }

    // 初始化 ComfyUI 独立日志文件
    this._comfyUILogFile = path.join(configManager.logsDir, 'comfyui-output.log');

    // 确保今日日志文件存在
    const todayLogFile = this.getTodayLogFile();
    if (!fs.existsSync(todayLogFile)) {
      try {
        fs.writeFileSync(todayLogFile, '', 'utf8');
        console.log(`[Logger] 创建日志文件: ${todayLogFile}`);
      } catch (err) {
        console.error('[Logger] 创建日志文件失败:', err);
      }
    }

    // 启动时执行日志轮转
    this._rotateLogs();
  }

  // 日志轮转 - 删除过期日志和超出数量的日志
  private _rotateLogs(): void {
    try {
      const logConfig = configManager.logs;
      const keepDays = logConfig.keepDays ?? 7;
      const maxFiles = 50; // 最多保留50个日志文件
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
        .sort((a, b) => b.mtime - a.mtime); // 按修改时间降序

      let deletedCount = 0;

      // 1. 删除超过数量的日志（保留最新的 maxFiles 个）
      if (logFileInfos.length > maxFiles) {
        const filesToDelete = logFileInfos.slice(maxFiles);
        filesToDelete.forEach(file => {
          try {
            fs.unlinkSync(file.path);
            deletedCount++;
          } catch {
            // 忽略单个文件删除错误
          }
        });
      }

      // 2. 删除超过天数的日志
      logFileInfos.forEach(file => {
        if (file.mtime < cutoffDate.getTime()) {
          try {
            fs.unlinkSync(file.path);
            deletedCount++;
          } catch {
            // 忽略单个文件删除错误
          }
        }
      });

      if (deletedCount > 0) {
        console.log(`日志轮转完成，删除了 ${deletedCount} 个日志文件`);
      }
    } catch (err) {
      // 忽略轮转错误，不影响正常使用
      console.warn('日志轮转失败:', err);
    }
  }

  // 设置日志窗口引用
  public setLogWindow(window: BrowserWindow | null): void {
    this._logWindow = window;
  }

  // 获取今日日志文件路径
  public getTodayLogFile(): string {
    const date = new Date().toISOString().slice(0, 10);
    return path.join(configManager.logsDir, `comfyui-${date}.log`);
  }

  // 写入日志
  public log(content: string, level: LogLevel = 'info'): void {
    if (!this._initialized) return;

    const logConfig = configManager.logs;
    if (!logConfig.enable) return;

    // 检查日志级别（如果未配置则默认为 info）
    const configLevel = logConfig.level ?? 'info';
    if (LOG_LEVEL_PRIORITY[level] > LOG_LEVEL_PRIORITY[configLevel]) {
      return;
    }

    // 清理 ANSI 转义码
    const cleanContent = this._removeAnsiCodes(content);

    // 处理多行输出：为每一行都添加时间戳
    const timestamp = new Date().toLocaleTimeString();
    const lines = cleanContent.split('\n');
    const logLine = lines.map(line => `[${timestamp}] [${level}] ${line}`).join('\n') + '\n';

    // 更新会话日志缓存
    if (this._sessionLogCache.length < this._maxSessionLogSize) {
      this._sessionLogCache += logLine;
    } else {
      // 会话缓存已满,删除最旧的日志
      const lines = this._sessionLogCache.split('\n');
      const keepLines = Math.floor(lines.length * 0.8); // 保留80%
      this._sessionLogCache = lines.slice(-keepLines).join('\n') + logLine;
    }

    // 节流处理 - 限制缓冲区大小
    if (this._buffer.length < this._maxBufferSize) {
      this._buffer += logLine;
    } else {
      // 缓冲区已满，强制刷新
      this._flushBuffer();
      this._buffer = logLine;
    }
    this._scheduleFlush();

    // 异步写入文件（使用队列）
    this._queueWrite(logLine);

    // 开发模式输出到控制台
    if (!app.isPackaged) {
      console.log(logLine.trim());
    }
  }

  // 快捷方法
  public error(content: string): void {
    this.log(content, 'error');
  }

  public warn(content: string): void {
    this.log(content, 'warn');
  }

  public info(content: string): void {
    this.log(content, 'info');
  }

  // 调度刷新缓冲区
  private _scheduleFlush(): void {
    if (this._timer) return;

    const throttle = configManager.advanced.stdoutThrottle ?? 100;
    this._timer = setTimeout(() => {
      this._flushBuffer();
      this._timer = null;
    }, throttle);
  }

  // 刷新缓冲区
  private _flushBuffer(): void {
    if (!this._buffer) return;

    // 推送到日志窗口
    if (this._logWindow && !this._logWindow.isDestroyed() && this._logWindow.isVisible()) {
      const logConfig = configManager.logs;
      if (logConfig.realtime) {
        this._logWindow.webContents.send(IPC_CHANNELS.LOG_UPDATE, this._buffer);
      }
    }

    this._buffer = '';
  }

  // 写入文件
  private async _writeToFile(logLine: string): Promise<void> {
    try {
      // 减少轮转检查频率
      const now = Date.now();
      if (now - this._lastRotateCheck > this._rotateCheckInterval) {
        await this._rotateLogFile();
        this._lastRotateCheck = now;
      }

      // 使用异步写入
      await fs.promises.appendFile(this.getTodayLogFile(), logLine, 'utf8');
    } catch (err) {
      const error = err as Error;
      console.error('[Logger] 写入失败:', error.message);
    }
  }

  // 队列写入（避免并发写入）
  private _queueWrite(logLine: string): void {
    this._writeQueue.push(logLine);
    if (!this._isWriting) {
      void this._processWriteQueue();
    }
  }

  // 处理写入队列
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

    // 继续处理队列
    void setImmediate(() => {
      void this._processWriteQueue();
    });
  }

  // 日志轮转
  private async _rotateLogFile(): Promise<void> {
    const logFile = this.getTodayLogFile();
    const logConfig = configManager.logs;

    try {
      const stats = await fs.promises.stat(logFile);
      const maxSize = logConfig.maxSize ?? 10 * 1024 * 1024; // 默认 10MB
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

  // 清理过期日志
  private async _cleanOldLogs(): Promise<void> {
    const logConfig = configManager.logs;
    const keepDays = logConfig.keepDays ?? 7; // 默认保留 7 天
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

  // 读取日志内容
  public async readLogContent(): Promise<string> {
    const logFile = this.getTodayLogFile();
    try {
      return await fs.promises.readFile(logFile, 'utf8');
    } catch (err) {
      const error = err as Error;
      return `[日志] 读取失败：${error.message}`;
    }
  }

  // 清空日志
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

  // 记录 ComfyUI 输出（独立日志文件）
  public logComfyUIOutput(data: string): void {
    if (!this._initialized || !this._comfyUILogFile) return;

    const cleanData = this._removeAnsiCodes(data);
    // 处理多行输出：为每一行都添加时间戳
    const timestamp = new Date().toLocaleTimeString();
    const lines = cleanData.split('\n');
    const line = lines.map(l => `[${timestamp}] ${l}`).join('\n') + '\n';

    // 加入队列
    this._comfyUIWriteQueue.push(line);
    if (!this._isComfyUIWriting) {
      void this._processComfyUIWriteQueue();
    }
  }

  // 处理 ComfyUI 日志写入队列
  private async _processComfyUIWriteQueue(): Promise<void> {
    if (this._comfyUIWriteQueue.length === 0) {
      this._isComfyUIWriting = false;
      return;
    }

    this._isComfyUIWriting = true;
    const line = this._comfyUIWriteQueue.shift();

    if (line !== undefined && this._comfyUILogFile) {
      try {
        await fs.promises.appendFile(this._comfyUILogFile, line, 'utf8');
      } catch (err) {
        const error = err as Error;
        console.error('[Logger] ComfyUI 日志写入失败:', error.message);
      }
    }

    // 继续处理队列
    void setImmediate(() => {
      void this._processComfyUIWriteQueue();
    });
  }

  // 读取 ComfyUI 日志内容
  public async readComfyUILogContent(): Promise<string> {
    if (!this._comfyUILogFile) return '';
    try {
      return await fs.promises.readFile(this._comfyUILogFile, 'utf8');
    } catch (err) {
      const error = err as Error;
      return `[日志] 读取失败：${error.message}`;
    }
  }

  // 清空 ComfyUI 日志
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

  // 获取会话日志缓存
  public getSessionLog(): string {
    return this._sessionLogCache;
  }

  // 清空会话日志缓存（应用退出时调用）
  public clearSessionLog(): void {
    this._sessionLogCache = '';
  }
}

// 导出单例
export const logger = new Logger();

/**
 * 错误处理模块
 * 提供统一的错误处理机制
 */

import { app, dialog } from 'electron';

import { logger } from './logger';

// 致命错误处理选项
export interface FatalErrorOptions {
  message: string;
  error?: unknown;
  title?: string;
  exitCode?: number;
}

// 错误处理类
export class FatalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalError';
  }

  // 处理致命错误
  public static handle(options: FatalErrorOptions): never {
    const { message, error, title, exitCode } = options;

    // 记录错误日志
    if (error instanceof Error) {
      logger.error(`${message}: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
    } else {
      logger.error(message);
    }

    // 显示错误对话框
    if (title && message) {
      dialog.showErrorBox(title, message);
    }

    // 退出应用
    app.exit(exitCode ?? 1);

    // 抛出错误（实际上不会执行到这里）
    throw error ?? new Error(message);
  }
}

// 错误类型枚举
export enum ErrorType {
  CONFIG = 'CONFIG_ERROR',
  ENVIRONMENT = 'ENVIRONMENT_ERROR',
  PROCESS = 'PROCESS_ERROR',
  NETWORK = 'NETWORK_ERROR',
  FILE = 'FILE_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

// 应用错误类
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly isFatal: boolean;

  constructor(type: ErrorType, message: string, isFatal: boolean = false) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.isFatal = isFatal;
  }

  // 创建配置错误
  public static config(message: string, isFatal: boolean = false): AppError {
    return new AppError(ErrorType.CONFIG, message, isFatal);
  }

  // 创建环境错误
  public static environment(message: string, isFatal: boolean = false): AppError {
    return new AppError(ErrorType.ENVIRONMENT, message, isFatal);
  }

  // 创建进程错误
  public static process(message: string, isFatal: boolean = false): AppError {
    return new AppError(ErrorType.PROCESS, message, isFatal);
  }

  // 创建网络错误
  public static network(message: string, isFatal: boolean = false): AppError {
    return new AppError(ErrorType.NETWORK, message, isFatal);
  }

  // 创建文件错误
  public static file(message: string, isFatal: boolean = false): AppError {
    return new AppError(ErrorType.FILE, message, isFatal);
  }
}

// 错误处理器
export class ErrorHandler {
  // 处理应用错误
  public static handle(error: unknown): void {
    if (error instanceof AppError) {
      this._handleAppError(error);
    } else if (error instanceof Error) {
      this._handleGenericError(error);
    } else {
      this._handleUnknownError(error);
    }
  }

  // 处理应用错误
  private static _handleAppError(error: AppError): void {
    const prefix = `[${error.type}]`;
    logger.error(`${prefix} ${error.message}`);

    if (error.isFatal) {
      FatalError.handle({
        message: error.message,
        title: '应用错误',
        error
      });
    }
  }

  // 处理通用错误
  private static _handleGenericError(error: Error): void {
    logger.error(`未处理的错误: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
  }

  // 处理未知错误
  private static _handleUnknownError(error: unknown): void {
    logger.error(`未知错误: ${String(error)}`);
  }
}

// 导出错误处理函数
export const handleError = (error: unknown): void => {
  ErrorHandler.handle(error);
};

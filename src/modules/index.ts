/**
 * 模块索引
 * 统一导出所有模块，便于管理和引用
 */

export { configManager, ConfigManager, DEFAULT_CONFIG } from './config';
export { logger, Logger } from './logger';
export { stateManager, StateManager, Status } from './state';
export { environmentChecker, EnvironmentChecker } from './environment';
export { processManager, ProcessManager } from './process';
export { windowManager, WindowManager } from './windows';
export { trayManager, TrayManager } from './tray';
export { ipcManager, IPCManager } from './ipc';
export { proxyManager, ProxyManager } from './proxy';
export { FatalError, AppError, ErrorHandler, ErrorType, handleError } from './errors';

// 类型导出
export type { StatusChangeCallback } from './process';
export type { WindowEventCallback } from './windows';
export type { WindowType } from '../types';
export type { FatalErrorOptions } from './errors';
export type { ProxyConfig } from './proxy';

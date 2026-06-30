/**
 * 全局类型定义
 */

// ========== 状态类型 ==========
export type ComfyUIStatus = 'stopped' | 'starting' | 'running' | 'failed' | 'restarting' | 'stopping';

export interface StateData {
  status: ComfyUIStatus;
  pid: number | null;
  port: number | null;
}

// ========== 配置类型 ==========
export interface WindowConfig {
  width?: number;
  height?: number;
  x?: number | null;
  y?: number | null;
  maximized?: boolean;
}

export interface ServerConfig {
  port?: number;
  autoStart?: boolean;
  autoRestart?: boolean;
  cpuMode?: boolean;
  listenAll?: boolean;
  disableCUDA?: boolean;
  disableIPEX?: boolean;
  modelDir?: string;
  outputDir?: string;
  customArgs?: string;
  timeout?: number;
  // 可配置的启动参数名称
  argNames?: {
    baseDirectory?: string;
    outputDirectory?: string;
    extraModelPathsConfig?: string;
    disableCudaMalloc?: string;
    disableIpexOptimize?: string;
  };
}

export interface LogsConfig {
  enable?: boolean;
  level?: 'error' | 'warn' | 'info';
  maxSize?: number;
  keepDays?: number;
  realtime?: boolean;
}

export interface TrayConfig {
  minimizeToTray?: boolean;
}

export interface AdvancedConfig {
  singleInstance?: boolean;
  stdoutThrottle?: number;

}

export interface AppConfig {
  comfyuiPath?: string;
  pythonPath?: string;
  envArgs?: string; // Python 环境启动参数
  envVars?: string; // 环境变量（每行一个，格式：变量名=值）
  window?: WindowConfig;
  server?: ServerConfig;
  logs?: LogsConfig;
  tray?: TrayConfig;
  advanced?: AdvancedConfig;
}

// ========== 环境检查类型 ==========
export type CheckType = 'error' | 'warn' | 'success';

export interface EnvironmentCheck {
  type: CheckType;
  msg: string;
}

// ========== 日志类型 ==========
export type LogLevel = 'error' | 'warn' | 'info';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  content: string;
}

// ========== IPC 通信类型（与 ipc-channels.ts 保持一致）==========
export interface IpcChannels {
  getConfig: () => AppConfig;
  updateConfig: (key: string, value: unknown) => AppConfig;
  resetConfig: () => boolean;
  startComfyui: () => void;
  stopComfyui: () => void;
  restartComfyui: () => void;
  getLogContent: () => string;
  clearLog: () => boolean;
  getSessionLog: () => string;
  clearSessionLog: () => boolean;
  getLogPage: (endLine: number, limit: number) => { lines: string[]; totalLines: number; startLine: number };
  saveEnvPath: (paths: { comfyuiPath: string; pythonPath: string; envArgs?: string; envVars?: string }) => boolean;
  selectComfyuiPath: () => string;
  selectPythonPath: () => string;
  selectDirectory: (title?: string) => string;
  closeWindow: () => void;
  openSettings: () => void;
  openLogs: () => void;
  rendererReady: () => void;
  clearBrowserCache: () => boolean;
  clearStorageData: () => boolean;
  restartApp: () => void;
  quitApp: () => void;
  getStatus: () => StateData;
  terminalCreate: (cols: number, rows: number) => number | null;
  terminalWrite: (sessionId: number, data: string) => void;
  terminalResize: (sessionId: number, cols: number, rows: number) => void;
  terminalKill: (sessionId: number) => void;
}

// ========== 窗口类型 ==========
export type WindowType = 'main' | 'envSelect' | 'log' | 'settings';

// ========== 进程信息类型 ==========
export interface ProcessInfo {
  pid: number | null;
  killed: boolean;
}

// ========== 事件类型 ==========
export interface StatusUpdateEvent {
  status: ComfyUIStatus;
  pid: number | null;
  port: number | null;
}

export interface LogUpdateEvent {
  content: string;
}

// ========== Electron API 类型 ==========
export interface ComfyuiDesktopApi {
  getConfig: () => Promise<AppConfig>;
  updateConfig: (key: string, value: unknown) => Promise<AppConfig>;
  resetConfig: () => Promise<boolean>;
  startComfyui: () => Promise<void>;
  stopComfyui: () => Promise<void>;
  restartComfyui: () => Promise<void>;
  getLogContent: () => Promise<string>;
  clearLog: () => Promise<boolean>;
  getSessionLog: () => Promise<string>;
  clearSessionLog: () => Promise<boolean>;
  saveEnvPath: (paths: {
    comfyuiPath: string;
    pythonPath: string;
    envArgs?: string;
    envVars?: string;
  }) => Promise<boolean>;
  selectComfyuiPath: () => Promise<string>;
  selectPythonPath: () => Promise<string>;
  selectDirectory: (title?: string) => Promise<string>;
  restartApp: () => void;
  quitApp: () => void;
  closeWindow: () => Promise<void>;
  openSettings: () => Promise<void>;
  openLogs: () => Promise<void>;
  rendererReady: () => void;
  terminalCreate: (cols: number, rows: number) => Promise<number | null>;
  terminalWrite: (sessionId: number, data: string) => void;
  terminalResize: (sessionId: number, cols: number, rows: number) => void;
  terminalKill: (sessionId: number) => void;
  clearBrowserCache: () => Promise<boolean>;
  clearStorageData: () => Promise<boolean>;
  getStatus: () => Promise<StateData>;
}

export interface ElectronApi {
  on: (channel: 'logUpdate' | 'statusUpdate' | 'appClosing' | 'terminal:data' | 'terminal:exit', callback: (event: unknown, ...args: unknown[]) => void) => () => void;
  once: (channel: 'logUpdate' | 'statusUpdate' | 'appClosing' | 'terminal:data' | 'terminal:exit', callback: (event: unknown, ...args: unknown[]) => void) => void;
  removeListener: (channel: 'logUpdate' | 'statusUpdate' | 'appClosing' | 'terminal:data' | 'terminal:exit', callback: (...args: unknown[]) => void) => void;
  removeAllListeners: (channel: 'logUpdate' | 'statusUpdate' | 'appClosing' | 'terminal:data' | 'terminal:exit') => void;
}

declare global {
  interface Window {
    comfyuiDesktop: ComfyuiDesktopApi;
    electronAPI: ElectronApi;
  }
}

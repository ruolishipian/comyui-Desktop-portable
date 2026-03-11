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

// ========== IPC 通信类型 ==========
export interface IpcChannels {
  // 配置相关
  'get-config': () => AppConfig;
  'update-config': (key: string, value: unknown) => AppConfig;
  'reset-config': () => boolean;

  // 进程控制
  'start-comfyui': () => void;
  'stop-comfyui': () => void;
  'restart-comfyui': () => void;

  // 日志相关
  'get-log-content': () => string;
  'clear-log': () => boolean;

  // 路径选择
  'save-env-path': (paths: { comfyuiPath: string; pythonPath: string; envArgs?: string; envVars?: string }) => boolean;
  'select-comfyui-path': () => string;
  'select-python-path': () => string;
  'select-directory': (title?: string) => string;
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
  // 配置相关
  getConfig: () => Promise<AppConfig>;
  updateConfig: (key: string, value: unknown) => Promise<AppConfig>;
  resetConfig: () => Promise<boolean>;

  // 进程管控
  startComfyui: () => Promise<void>;
  stopComfyui: () => Promise<void>;
  restartComfyui: () => Promise<void>;

  // 日志相关
  getLogContent: () => Promise<string>;
  clearLog: () => Promise<boolean>;

  // 路径选择
  saveEnvPath: (paths: {
    comfyuiPath: string;
    pythonPath: string;
    envArgs?: string;
    envVars?: string;
  }) => Promise<boolean>;
  selectComfyuiPath: () => Promise<string>;
  selectPythonPath: () => Promise<string>;
  selectDirectory: (title?: string) => Promise<string>;

  // 应用控制
  restartApp: () => void;
  quitApp: () => void;

  // 窗口控制
  closeWindow: () => Promise<void>;

  // 打开子窗口
  openSettings: () => Promise<void>;
  openLogs: () => Promise<void>;

  // 渲染进程就绪信号
  rendererReady: () => void;
}

export interface ElectronApi {
  on: (channel: 'log-update' | 'status-update', callback: (event: unknown, ...args: unknown[]) => void) => () => void;
  once: (channel: 'log-update' | 'status-update', callback: (event: unknown, ...args: unknown[]) => void) => void;
  removeListener: (channel: 'log-update' | 'status-update', callback: (...args: unknown[]) => void) => void;
  removeAllListeners: (channel: 'log-update' | 'status-update') => void;
}

declare global {
  interface Window {
    comfyuiDesktop: ComfyuiDesktopApi;
    electronAPI: ElectronApi;
  }
}

/**
 * IPC 通道常量定义
 * 统一管理所有 IPC 通道名称，确保主进程和渲染进程使用相同的名称
 *
 * 使用方法：
 * 1. 主进程：import { IPC_CHANNELS } from '@/constants/ipc-channels';
 * 2. 渲染进程：import { IPC_CHANNELS } from '@/constants/ipc-channels';
 * 3. 类型定义：import { IPC_CHANNELS } from '@/constants/ipc-channels';
 */

/**
 * IPC 通道名称常量
 * 使用 as const 确保类型安全
 * 所有通道名称使用驼峰命名法
 */
export const IPC_CHANNELS = {
  // ========== 配置相关 ==========
  /** 获取配置 */
  GET_CONFIG: 'getConfig',
  /** 更新配置 */
  UPDATE_CONFIG: 'updateConfig',
  /** 重置配置 */
  RESET_CONFIG: 'resetConfig',

  // ========== 进程控制 ==========
  /** 启动 ComfyUI */
  START_COMFYUI: 'startComfyui',
  /** 停止 ComfyUI */
  STOP_COMFYUI: 'stopComfyui',
  /** 重启 ComfyUI */
  RESTART_COMFYUI: 'restartComfyui',

  // ========== 日志相关 ==========
  /** 获取日志内容 */
  GET_LOG_CONTENT: 'getLogContent',
  /** 清空日志 */
  CLEAR_LOG: 'clearLog',
  /** 获取会话日志 */
  GET_SESSION_LOG: 'getSessionLog',
  /** 清空会话日志 */
  CLEAR_SESSION_LOG: 'clearSessionLog',

  // ========== 路径选择 ==========
  /** 保存环境路径 */
  SAVE_ENV_PATH: 'saveEnvPath',
  /** 选择 ComfyUI 路径 */
  SELECT_COMFYUI_PATH: 'selectComfyuiPath',
  /** 选择 Python 路径 */
  SELECT_PYTHON_PATH: 'selectPythonPath',
  /** 选择目录 */
  SELECT_DIRECTORY: 'selectDirectory',

  // ========== 应用控制 ==========
  /** 关闭窗口 */
  CLOSE_WINDOW: 'closeWindow',
  /** 打开设置 */
  OPEN_SETTINGS: 'openSettings',
  /** 打开日志 */
  OPEN_LOGS: 'openLogs',

  // ========== 渲染进程信号 ==========
  /** 渲染进程就绪 */
  RENDERER_READY: 'rendererReady',

  // ========== 应用生命周期 ==========
  /** 重启应用 */
  RESTART_APP: 'restartApp',
  /** 退出应用 */
  QUIT_APP: 'quitApp',

  // ========== 事件通道（主进程 -> 渲染进程）==========
  /** 状态更新 */
  STATUS_UPDATE: 'statusUpdate',
  /** 日志更新 */
  LOG_UPDATE: 'logUpdate',
  /** 应用关闭中 */
  APP_CLOSING: 'appClosing',
  /** 获取当前状态 */
  GET_STATUS: 'getStatus'
} as const;

/**
 * IPC 通道名称类型
 * 从常量中自动推导，确保类型安全
 */
export type IpcChannelName = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

/**
 * Invoke 通道列表（用于 preload 白名单）
 */
export const INVOKE_CHANNELS = [
  IPC_CHANNELS.GET_CONFIG,
  IPC_CHANNELS.UPDATE_CONFIG,
  IPC_CHANNELS.RESET_CONFIG,
  IPC_CHANNELS.START_COMFYUI,
  IPC_CHANNELS.STOP_COMFYUI,
  IPC_CHANNELS.RESTART_COMFYUI,
  IPC_CHANNELS.GET_LOG_CONTENT,
  IPC_CHANNELS.CLEAR_LOG,
  IPC_CHANNELS.GET_SESSION_LOG,
  IPC_CHANNELS.CLEAR_SESSION_LOG,
  IPC_CHANNELS.SAVE_ENV_PATH,
  IPC_CHANNELS.SELECT_COMFYUI_PATH,
  IPC_CHANNELS.SELECT_PYTHON_PATH,
  IPC_CHANNELS.SELECT_DIRECTORY,
  IPC_CHANNELS.CLOSE_WINDOW,
  IPC_CHANNELS.OPEN_SETTINGS,
  IPC_CHANNELS.OPEN_LOGS,
  IPC_CHANNELS.GET_STATUS
] as const;

/**
 * Send 通道列表（用于 preload 白名单）
 */
export const SEND_CHANNELS = [IPC_CHANNELS.RESTART_APP, IPC_CHANNELS.QUIT_APP, IPC_CHANNELS.RENDERER_READY] as const;

/**
 * Receive 通道列表（用于 preload 白名单）
 */
export const RECEIVE_CHANNELS = [
  IPC_CHANNELS.LOG_UPDATE,
  IPC_CHANNELS.STATUS_UPDATE,
  IPC_CHANNELS.APP_CLOSING
] as const;

/**
 * Invoke 通道类型
 */
export type InvokeChannel = (typeof INVOKE_CHANNELS)[number];

/**
 * Send 通道类型
 */
export type SendChannel = (typeof SEND_CHANNELS)[number];

/**
 * Receive 通道类型
 */
export type ReceiveChannel = (typeof RECEIVE_CHANNELS)[number];

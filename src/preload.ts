/**
 * 预加载脚本
 * 安全地暴露 API 给渲染进程
 *
 * 注意：此文件不能有外部模块依赖，因为 Electron 的 sandbox_bundle
 * 使用特殊的模块加载器，无法正确解析相对路径的 require。
 */

import { contextBridge, ipcRenderer } from 'electron';

// 内联 IPC 通道常量（避免外部模块依赖）
const IPC_CHANNELS = {
  // 配置相关
  GET_CONFIG: 'getConfig',
  UPDATE_CONFIG: 'updateConfig',
  RESET_CONFIG: 'resetConfig',
  // 进程控制
  START_COMFYUI: 'startComfyui',
  STOP_COMFYUI: 'stopComfyui',
  RESTART_COMFYUI: 'restartComfyui',
  // 日志相关
  GET_LOG_CONTENT: 'getLogContent',
  CLEAR_LOG: 'clearLog',
  GET_SESSION_LOG: 'getSessionLog',
  CLEAR_SESSION_LOG: 'clearSessionLog',
  // 路径选择
  SAVE_ENV_PATH: 'saveEnvPath',
  SELECT_COMFYUI_PATH: 'selectComfyuiPath',
  SELECT_PYTHON_PATH: 'selectPythonPath',
  SELECT_DIRECTORY: 'selectDirectory',
  // 应用控制
  CLOSE_WINDOW: 'closeWindow',
  OPEN_SETTINGS: 'openSettings',
  OPEN_LOGS: 'openLogs',
  // 渲染进程信号
  RENDERER_READY: 'rendererReady',
  // 应用生命周期
  RESTART_APP: 'restartApp',
  QUIT_APP: 'quitApp',
  // 事件通道
  STATUS_UPDATE: 'statusUpdate',
  LOG_UPDATE: 'logUpdate',
  APP_CLOSING: 'appClosing'
} as const;

// 接收通道白名单
const RECEIVE_CHANNELS = [IPC_CHANNELS.LOG_UPDATE, IPC_CHANNELS.STATUS_UPDATE, IPC_CHANNELS.APP_CLOSING] as const;

// 暴露 ComfyUI Desktop API
contextBridge.exposeInMainWorld('comfyuiDesktop', {
  // 配置相关
  getConfig: (): Promise<unknown> => ipcRenderer.invoke(IPC_CHANNELS.GET_CONFIG) as Promise<unknown>,
  updateConfig: (key: string, value: unknown): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CONFIG, key, value) as Promise<unknown>,
  resetConfig: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.RESET_CONFIG) as Promise<boolean>,

  // 进程管控
  startComfyui: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.START_COMFYUI) as Promise<void>,
  stopComfyui: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.STOP_COMFYUI) as Promise<void>,
  restartComfyui: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.RESTART_COMFYUI) as Promise<void>,

  // 日志相关
  getLogContent: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.GET_LOG_CONTENT) as Promise<string>,
  clearLog: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.CLEAR_LOG) as Promise<boolean>,
  getSessionLog: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.GET_SESSION_LOG) as Promise<string>,
  clearSessionLog: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.CLEAR_SESSION_LOG) as Promise<boolean>,

  // 路径选择
  saveEnvPath: (paths: {
    comfyuiPath: string;
    pythonPath: string;
    envArgs?: string;
    envVars?: string;
  }): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.SAVE_ENV_PATH, paths) as Promise<boolean>,
  selectComfyuiPath: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.SELECT_COMFYUI_PATH) as Promise<string>,
  selectPythonPath: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.SELECT_PYTHON_PATH) as Promise<string>,
  selectDirectory: (title?: string): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.SELECT_DIRECTORY, title) as Promise<string>,

  // 应用控制
  restartApp: (): void => ipcRenderer.send(IPC_CHANNELS.RESTART_APP),
  quitApp: (): void => ipcRenderer.send(IPC_CHANNELS.QUIT_APP),

  // 窗口控制
  closeWindow: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.CLOSE_WINDOW) as Promise<void>,

  // 打开子窗口
  openSettings: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.OPEN_SETTINGS) as Promise<void>,
  openLogs: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.OPEN_LOGS) as Promise<void>,

  // 渲染进程就绪信号
  rendererReady: (): void => ipcRenderer.send(IPC_CHANNELS.RENDERER_READY)
});

// 暴露事件监听 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 监听主进程消息
  on: (
    channel: (typeof RECEIVE_CHANNELS)[number],
    callback: (event: unknown, ...args: unknown[]) => void
  ): (() => void) => {
    if (RECEIVE_CHANNELS.includes(channel as (typeof RECEIVE_CHANNELS)[number])) {
      const subscription = (event: unknown, ...args: unknown[]): void => callback(event, ...args);
      ipcRenderer.on(channel, subscription);
      // 返回取消订阅函数
      return (): void => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
    return (): void => {
      // 空函数
    };
  },

  // 一次性监听
  once: (channel: (typeof RECEIVE_CHANNELS)[number], callback: (event: unknown, ...args: unknown[]) => void): void => {
    if (RECEIVE_CHANNELS.includes(channel as (typeof RECEIVE_CHANNELS)[number])) {
      ipcRenderer.once(channel, (event: unknown, ...args: unknown[]): void => callback(event, ...args));
    }
  },

  // 移除监听
  removeListener: (channel: (typeof RECEIVE_CHANNELS)[number], callback: (...args: unknown[]) => void): void => {
    if (RECEIVE_CHANNELS.includes(channel as (typeof RECEIVE_CHANNELS)[number])) {
      ipcRenderer.removeListener(channel, callback);
    }
  },

  // 移除所有监听
  removeAllListeners: (channel: (typeof RECEIVE_CHANNELS)[number]): void => {
    if (RECEIVE_CHANNELS.includes(channel as (typeof RECEIVE_CHANNELS)[number])) {
      ipcRenderer.removeAllListeners(channel);
    }
  }
});

/**
 * IPC 类型安全模块
 * 提供类型安全的 IPC 通信接口
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';

import { IPC_CHANNELS } from '../constants/ipc-channels';
import type { AppConfig, StateData } from '../types';

// IPC 通道类型定义
export interface IpcChannels {
  // 配置相关
  [IPC_CHANNELS.GET_CONFIG]: { params: []; return: AppConfig };
  [IPC_CHANNELS.UPDATE_CONFIG]: { params: [key: string, value: unknown]; return: AppConfig };
  [IPC_CHANNELS.RESET_CONFIG]: { params: []; return: boolean };

  // 进程控制
  [IPC_CHANNELS.START_COMFYUI]: { params: []; return: void };
  [IPC_CHANNELS.STOP_COMFYUI]: { params: []; return: void };
  [IPC_CHANNELS.RESTART_COMFYUI]: { params: []; return: void };

  // 日志相关
  [IPC_CHANNELS.GET_LOG_CONTENT]: { params: []; return: string };
  [IPC_CHANNELS.CLEAR_LOG]: { params: []; return: boolean };
  [IPC_CHANNELS.GET_SESSION_LOG]: { params: []; return: string };
  [IPC_CHANNELS.CLEAR_SESSION_LOG]: { params: []; return: boolean };

  // 路径选择
  [IPC_CHANNELS.SAVE_ENV_PATH]: {
    params: [{ comfyuiPath: string; pythonPath: string; envArgs?: string; envVars?: string }];
    return: boolean;
  };
  [IPC_CHANNELS.SELECT_COMFYUI_PATH]: { params: []; return: string };
  [IPC_CHANNELS.SELECT_PYTHON_PATH]: { params: []; return: string };
  [IPC_CHANNELS.SELECT_DIRECTORY]: { params: [title?: string]; return: string };

  // 应用控制
  [IPC_CHANNELS.CLOSE_WINDOW]: { params: []; return: void };
  [IPC_CHANNELS.OPEN_SETTINGS]: { params: []; return: void };
  [IPC_CHANNELS.OPEN_LOGS]: { params: []; return: void };

  // 缓存管理
  [IPC_CHANNELS.CLEAR_BROWSER_CACHE]: { params: []; return: boolean };
  [IPC_CHANNELS.CLEAR_STORAGE_DATA]: { params: []; return: boolean };

  // 渲染进程就绪信号
  [IPC_CHANNELS.RENDERER_READY]: { params: []; return: void };

  // 事件通道（主进程 -> 渲染进程）
  [IPC_CHANNELS.STATUS_UPDATE]: { params: [data: StateData]; return: void };
  [IPC_CHANNELS.LOG_UPDATE]: { params: [content: string]; return: void };
}

// 类型安全的 IPC Main 接口
export interface StrictIpcMain {
  handle<K extends keyof IpcChannels>(
    channel: K,
    listener: (
      event: IpcMainInvokeEvent,
      ...args: IpcChannels[K]['params']
    ) => IpcChannels[K]['return'] | Promise<IpcChannels[K]['return']>
  ): void;

  on<K extends keyof IpcChannels>(
    channel: K,
    listener: (event: Electron.IpcMainEvent, ...args: IpcChannels[K]['params']) => void
  ): void;
}

// 创建类型安全的 IPC Main 包装器
export const strictIpcMain: StrictIpcMain = ipcMain as StrictIpcMain;

// 类型安全的 handle 包装函数
export function typedHandle<K extends keyof IpcChannels>(
  channel: K,
  handler: (
    event: IpcMainInvokeEvent,
    ...args: IpcChannels[K]['params']
  ) => IpcChannels[K]['return'] | Promise<IpcChannels[K]['return']>
): void {
  ipcMain.handle(channel, handler as (...args: unknown[]) => unknown);
}

// 类型安全的 on 包装函数
export function typedOn<K extends keyof IpcChannels>(
  channel: K,
  listener: (event: Electron.IpcMainEvent, ...args: IpcChannels[K]['params']) => void
): void {
  ipcMain.on(channel, listener as (...args: unknown[]) => void);
}

// 导出常量供其他模块使用
export { IPC_CHANNELS } from '../constants/ipc-channels';

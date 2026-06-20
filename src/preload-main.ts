/**
 * 主窗口专用预加载脚本（精简版）
 * 主窗口加载远程 ComfyUI 页面，存在 XSS 风险
 * 因此只暴露只读 API 和事件监听，不暴露任何修改配置/控制进程的 API
 */

import { contextBridge, ipcRenderer } from 'electron';

const RECEIVE_CHANNELS = ['statusUpdate', 'logUpdate', 'appClosing'] as const;

// 只暴露只读 API
contextBridge.exposeInMainWorld('comfyuiDesktop', {
  // 只读：获取配置
  getConfig: (): Promise<unknown> => ipcRenderer.invoke('getConfig') as Promise<unknown>,

  // 只读：获取日志
  getLogContent: (): Promise<string> => ipcRenderer.invoke('getLogContent') as Promise<string>,
  getSessionLog: (): Promise<string> => ipcRenderer.invoke('getSessionLog') as Promise<string>,

  // 渲染进程就绪信号（loading.html 阶段使用）
  rendererReady: (): void => ipcRenderer.send('rendererReady')
});

// 事件监听 API（与完整版相同）
contextBridge.exposeInMainWorld('electronAPI', {
  on: (
    channel: (typeof RECEIVE_CHANNELS)[number],
    callback: (event: unknown, ...args: unknown[]) => void
  ): (() => void) => {
    if (RECEIVE_CHANNELS.includes(channel as (typeof RECEIVE_CHANNELS)[number])) {
      const subscription = (event: unknown, ...args: unknown[]): void => callback(event, ...args);
      ipcRenderer.on(channel, subscription);
      return (): void => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
    return (): void => {};
  },

  once: (channel: (typeof RECEIVE_CHANNELS)[number], callback: (event: unknown, ...args: unknown[]) => void): void => {
    if (RECEIVE_CHANNELS.includes(channel as (typeof RECEIVE_CHANNELS)[number])) {
      ipcRenderer.once(channel, (event: unknown, ...args: unknown[]): void => callback(event, ...args));
    }
  },

  removeListener: (channel: (typeof RECEIVE_CHANNELS)[number], callback: (...args: unknown[]) => void): void => {
    if (RECEIVE_CHANNELS.includes(channel as (typeof RECEIVE_CHANNELS)[number])) {
      ipcRenderer.removeListener(channel, callback);
    }
  },

  removeAllListeners: (channel: (typeof RECEIVE_CHANNELS)[number]): void => {
    if (RECEIVE_CHANNELS.includes(channel as (typeof RECEIVE_CHANNELS)[number])) {
      ipcRenderer.removeAllListeners(channel);
    }
  }
});
/**
 * Mock 辅助工具
 * 简化 Mock 的创建和管理
 */

import { MockElectronStore } from '../mocks/electron-store.mock';
import { MockPortableService } from '../mocks/portable-service.mock';
import { MockIpc } from '../mocks/ipc.mock';
import type { AppConfig } from '../../src/types';

// 创建完整的测试环境
export function createTestEnvironment(config?: Partial<AppConfig>): {
  store: MockElectronStore;
  portable: MockPortableService;
  ipc: MockIpc;
} {
  const store = new MockElectronStore({ defaults: config as Partial<AppConfig> });
  const portable = new MockPortableService();
  const ipc = new MockIpc();

  return { store, portable, ipc };
}

// 等待指定时间
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 等待条件满足
export async function waitFor(condition: () => boolean, timeout = 5000, interval = 100): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await wait(interval);
  }
}

// 模拟文件系统路径存在
export function mockPathExists(path: string, exists: boolean): void {
  const fs = require('fs');
  fs.existsSync.mockImplementation((p: string) => {
    if (p === path) return exists;
    return true; // 默认存在
  });
}

// 模拟多个路径存在
export function mockPathsExist(paths: Record<string, boolean>): void {
  const fs = require('fs');
  fs.existsSync.mockImplementation((path: string) => {
    return paths[path] ?? true;
  });
}

// 模拟 Electron 对话框选择路径
export function mockDialogSelectPath(path: string, canceled = false): void {
  const { dialog } = require('electron');
  dialog.showOpenDialog.mockResolvedValue({
    filePaths: [path],
    canceled
  });
}

// 模拟 IPC 调用返回值
export function mockIpcInvoke(channel: string, result: unknown): void {
  const { ipcRenderer } = require('electron');
  ipcRenderer.invoke.mockImplementation(async (ch: string) => {
    if (ch === channel) return result;
    return undefined;
  });
}

// 模拟 IPC 调用抛出错误
export function mockIpcInvokeError(channel: string, error: Error): void {
  const { ipcRenderer } = require('electron');
  ipcRenderer.invoke.mockImplementation(async (ch: string) => {
    if (ch === channel) throw error;
    return undefined;
  });
}

// 重置所有 Mock
export function resetAllMocks(): void {
  jest.clearAllMocks();
  jest.restoreAllMocks();
}

// 验证 Mock 被调用
export function assertMockCalled(mock: jest.Mock, times: number): void {
  expect(mock).toHaveBeenCalledTimes(times);
}

// 验证 Mock 被调用时参数
export function assertMockCalledWith(mock: jest.Mock, ...args: unknown[]): void {
  expect(mock).toHaveBeenCalledWith(...args);
}

// 创建模拟事件对象
export function createMockEvent(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    sender: {
      send: jest.fn()
    },
    preventDefault: jest.fn(),
    ...overrides
  };
}

// 创建模拟 BrowserWindow
export function createMockBrowserWindow(): Record<string, unknown> {
  return {
    loadFile: jest.fn(),
    loadURL: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    show: jest.fn(),
    close: jest.fn(),
    webContents: {
      send: jest.fn(),
      on: jest.fn()
    },
    isDestroyed: jest.fn(() => false),
    isVisible: jest.fn(() => true)
  };
}

// 捕获控制台输出
export function captureConsole(): {
  logs: string[];
  warnings: string[];
  errors: string[];
} {
  const logs: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (jest.spyOn(console, 'log') as any).mockImplementation((...args: any[]) => {
    logs.push(args.join(' '));
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (jest.spyOn(console, 'warn') as any).mockImplementation((...args: any[]) => {
    warnings.push(args.join(' '));
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (jest.spyOn(console, 'error') as any).mockImplementation((...args: any[]) => {
    errors.push(args.join(' '));
  });

  return { logs, warnings, errors };
}

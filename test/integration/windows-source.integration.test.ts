/**
 * WindowManager 源代码集成测试
 * 直接测试 src/modules/windows.ts 的实际代码
 */

import path from 'path';
import os from 'os';

// Mock electron
jest.mock('electron', () => ({
  BrowserWindow: jest.fn().mockImplementation(() => ({
    on: jest.fn().mockReturnThis(),
    once: jest.fn().mockReturnThis(),
    loadFile: jest.fn().mockResolvedValue(undefined),
    loadURL: jest.fn().mockResolvedValue(undefined),
    show: jest.fn(),
    hide: jest.fn(),
    close: jest.fn(),
    destroy: jest.fn(),
    isDestroyed: jest.fn().mockReturnValue(false),
    isMinimized: jest.fn().mockReturnValue(false),
    restore: jest.fn(),
    focus: jest.fn(),
    minimize: jest.fn(),
    maximize: jest.fn(),
    unmaximize: jest.fn(),
    isMaximized: jest.fn().mockReturnValue(false),
    getSize: jest.fn().mockReturnValue([1280, 720]),
    getPosition: jest.fn().mockReturnValue([0, 0]),
    setSize: jest.fn(),
    setPosition: jest.fn(),
    webContents: {
      send: jest.fn(),
      on: jest.fn()
    },
    removeListener: jest.fn()
  })),
  dialog: {
    showMessageBox: jest.fn().mockResolvedValue({ response: 0 })
  },
  Menu: {
    buildFromTemplate: jest.fn(),
    setApplicationMenu: jest.fn()
  },
  app: {
    quit: jest.fn(),
    getPath: jest.fn((name: string) => path.join(os.tmpdir(), 'comfyui-test', name))
  }
}));

// Mock config manager
jest.mock('../../src/modules/config', () => ({
  configManager: {
    get: jest.fn((key: string) => {
      if (key === 'comfyuiPath') return '/test/comfyui';
      if (key === 'pythonPath') return '/test/python';
      return null;
    }),
    window: {
      width: 1280,
      height: 720,
      x: null,
      y: null,
      maximized: false
    },
    isEnvironmentConfigured: jest.fn().mockReturnValue(true)
  }
}));

// Mock menu-utils
jest.mock('../../src/modules/menu-utils', () => ({
  createFileOperationMenuItems: jest.fn().mockReturnValue([])
}));

// Mock state manager
jest.mock('../../src/modules/state', () => ({
  stateManager: {
    getData: jest.fn().mockReturnValue({
      status: 'stopped',
      pid: null,
      port: null
    })
  }
}));

import { WindowManager } from '../../src/modules/windows';

describe('WindowManager 源代码集成测试', () => {
  let windowManager: WindowManager;

  beforeEach(() => {
    jest.clearAllMocks();
    windowManager = new WindowManager();
  });

  describe('窗口管理', () => {
    test('应该能设置窗口事件回调', () => {
      const callback = jest.fn();
      windowManager.setOnWindowEvent(callback);
      // 不应抛出错误
      expect(true).toBe(true);
    });

    test('应该能获取窗口', () => {
      const win = windowManager.getWindow('main');
      expect(win).toBeUndefined();
    });

    test('应该能检查窗口是否有效', () => {
      const isValid = windowManager.isWindowValid('main');
      expect(isValid).toBe(false);
    });

    test('应该能聚焦窗口', () => {
      windowManager.focusWindow('main');
      // 不应抛出错误
      expect(true).toBe(true);
    });
  });

  describe('窗口创建', () => {
    test('应该能创建环境选择窗口', () => {
      windowManager.createEnvSelectWindow();
      // 验证 BrowserWindow 被调用
      const { BrowserWindow } = require('electron');
      expect(BrowserWindow).toHaveBeenCalled();
    });

    test('已存在的窗口应被聚焦', () => {
      // 先创建窗口
      windowManager.createEnvSelectWindow();

      // 再次调用应聚焦
      windowManager.createEnvSelectWindow();

      // 验证只创建了一次
      const { BrowserWindow } = require('electron');
      expect(BrowserWindow).toHaveBeenCalledTimes(1);
    });
  });

  describe('窗口操作', () => {
    test('应该能关闭所有窗口', () => {
      windowManager.closeAll();
      // 不应抛出错误
      expect(true).toBe(true);
    });

    test('应该能广播消息到所有窗口', () => {
      windowManager.broadcast('test-channel', { data: 'test' });
      // 不应抛出错误
      expect(true).toBe(true);
    });
  });

  describe('窗口状态', () => {
    test('应该能获取窗口', () => {
      const win = windowManager.getWindow('main');
      expect(win).toBeUndefined();
    });

    test('应该能检查窗口是否有效', () => {
      const isValid = windowManager.isWindowValid('main');
      expect(isValid).toBe(false);
    });
  });

  describe('错误处理', () => {
    test('操作无效窗口应正常处理', () => {
      windowManager.focusWindow('main');
      // 不应抛出错误
      expect(true).toBe(true);
    });
  });
});

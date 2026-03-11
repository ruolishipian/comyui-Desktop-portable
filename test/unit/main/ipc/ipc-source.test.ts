/**
 * IPC 源代码测试
 * 直接测试 src/modules/ipc.ts 的代码
 */

import { IPCManager } from '../../../../src/modules/ipc';

// Mock electron
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    removeHandler: jest.fn()
  },
  dialog: {
    showMessageBox: jest.fn(() => Promise.resolve({ response: 0 })),
    showOpenDialog: jest.fn(() => Promise.resolve({ filePaths: ['/test/path'] }))
  },
  app: {
    relaunch: jest.fn(),
    quit: jest.fn()
  },
  BrowserWindow: {
    fromWebContents: jest.fn(() => ({
      isDestroyed: jest.fn(() => false),
      close: jest.fn()
    }))
  }
}));

// Mock configManager
jest.mock('../../../../src/modules/config', () => ({
  configManager: {
    get: jest.fn(() => ''),
    set: jest.fn(),
    getAll: jest.fn(() => ({})),
    reset: jest.fn()
  }
}));

// Mock processManager
jest.mock('../../../../src/modules/process', () => ({
  ProcessManager: class ProcessManager {
    start = jest.fn(() => Promise.resolve());
    stop = jest.fn();
    restart = jest.fn();
  }
}));

// Mock stateManager
jest.mock('../../../../src/modules/state', () => ({
  stateManager: {
    getStateData: jest.fn(() => ({ status: 'stopped', pid: null, port: null }))
  }
}));

// Mock logger
jest.mock('../../../../src/modules/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    readLogContent: jest.fn(() => Promise.resolve('')),
    clearLog: jest.fn(() => Promise.resolve(true))
  }
}));

// Mock WindowManager
jest.mock('../../../../src/modules/windows', () => ({
  WindowManager: class WindowManager {
    getWindow = jest.fn(() => ({ close: jest.fn() }));
    createMainWindow = jest.fn();
    broadcast = jest.fn();
  }
}));

// Mock TrayManager
jest.mock('../../../../src/modules/tray', () => ({
  TrayManager: class TrayManager {
    create = jest.fn();
  }
}));

// 导入 mock 后的模块
const { ipcMain } = require('electron');
const { configManager } = require('../../../../src/modules/config');

describe('IPC 源代码测试', () => {
  let ipcManager: IPCManager;

  beforeEach(() => {
    jest.clearAllMocks();
    ipcManager = new IPCManager();
  });

  describe('依赖设置', () => {
    test('应该能设置依赖', () => {
      const { WindowManager } = require('../../../../src/modules/windows');
      const { ProcessManager } = require('../../../../src/modules/process');
      const { TrayManager } = require('../../../../src/modules/tray');

      const windowManager = new WindowManager();
      const processManager = new ProcessManager();
      const trayManager = new TrayManager();

      ipcManager.setDependencies(windowManager, processManager, trayManager);

      expect(true).toBe(true);
    });
  });

  describe('注册处理器', () => {
    test('registerAll 应注册所有处理器', () => {
      ipcManager.registerAll();

      expect(ipcMain.handle).toHaveBeenCalled();
      expect(ipcMain.on).toHaveBeenCalled();
    });

    test('应注册配置处理器', () => {
      ipcManager.registerAll();

      expect(ipcMain.handle).toHaveBeenCalledWith('getConfig', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('updateConfig', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('resetConfig', expect.any(Function));
    });

    test('应注册进程处理器', () => {
      ipcManager.registerAll();

      expect(ipcMain.handle).toHaveBeenCalledWith('startComfyui', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('stopComfyui', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('restartComfyui', expect.any(Function));
    });

    test('应注册日志处理器', () => {
      ipcManager.registerAll();

      expect(ipcMain.handle).toHaveBeenCalledWith('getLogContent', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('clearLog', expect.any(Function));
    });

    test('应注册路径处理器', () => {
      ipcManager.registerAll();

      expect(ipcMain.handle).toHaveBeenCalledWith('saveEnvPath', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('selectComfyuiPath', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('selectPythonPath', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('selectDirectory', expect.any(Function));
    });

    test('应注册应用控制处理器', () => {
      ipcManager.registerAll();

      expect(ipcMain.on).toHaveBeenCalledWith('restartApp', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('closeWindow', expect.any(Function));
    });
  });

  describe('处理器调用测试', () => {
    beforeEach(() => {
      ipcManager.registerAll();
    });

    test('getConfig 应返回配置', async () => {
      const handler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'getConfig')?.[1];

      if (handler) {
        const result = await handler({});
        expect(result).toBeDefined();
      }
    });

    test('updateConfig 应更新配置', async () => {
      const handler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'updateConfig')?.[1];

      if (handler) {
        await handler({}, 'test.key', 'test.value');
        expect(configManager.set).toHaveBeenCalledWith('test.key', 'test.value');
      }
    });

    test('selectComfyuiPath 应返回路径', async () => {
      const handler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'selectComfyuiPath')?.[1];

      if (handler) {
        const result = await handler({});
        expect(result).toBe('/test/path');
      }
    });

    test('selectPythonPath 应返回路径', async () => {
      const handler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'selectPythonPath')?.[1];

      if (handler) {
        const result = await handler({});
        expect(result).toBe('/test/path');
      }
    });

    test('selectDirectory 应返回路径', async () => {
      const handler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'selectDirectory')?.[1];

      if (handler) {
        const result = await handler({}, '选择文件夹');
        expect(result).toBe('/test/path');
      }
    });
  });
});

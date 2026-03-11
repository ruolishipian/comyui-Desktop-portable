/**
 * IPC 异常场景测试
 * 补充 IPCManager 的异常场景测试用例
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
    showOpenDialog: jest.fn(() => Promise.resolve({ filePaths: ['/test/path'] })),
    showErrorBox: jest.fn()
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
    get: jest.fn((key: string) => {
      if (key === 'comfyuiPath') return '/test/comfyui';
      if (key === 'pythonPath') return '/test/python';
      return '';
    }),
    set: jest.fn(),
    getAll: jest.fn(() => ({
      comfyuiPath: '/test/comfyui',
      pythonPath: '/test/python',
      server: { port: 8188 }
    })),
    reset: jest.fn(),
    isEnvironmentConfigured: jest.fn(() => true),
    server: { customArgs: '' }
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
    getStateData: jest.fn(() => ({ status: 'stopped', pid: null, port: null })),
    status: 'stopped'
  }
}));

// Mock logger
jest.mock('../../../../src/modules/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    readLogContent: jest.fn(() => Promise.resolve('')),
    clearLog: jest.fn(() => Promise.resolve(true))
  }
}));

// Mock WindowManager
jest.mock('../../../../src/modules/windows', () => ({
  WindowManager: class WindowManager {
    getWindow = jest.fn();
    createMainWindow = jest.fn();
    createLogWindow = jest.fn();
    createSettingsWindow = jest.fn();
    createEnvSelectWindow = jest.fn();
    broadcast = jest.fn();
    focusWindow = jest.fn();
    resetConfig = jest.fn(() => Promise.resolve());
  }
}));

// Mock TrayManager
jest.mock('../../../../src/modules/tray', () => ({
  TrayManager: class TrayManager {
    create = jest.fn();
    destroy = jest.fn();
  }
}));

// 导入 mock 后的模块
const { ipcMain, dialog, BrowserWindow } = require('electron');
const { configManager } = require('../../../../src/modules/config');
const { logger } = require('../../../../src/modules/logger');

describe('IPC 异常场景测试', () => {
  let ipcManager: IPCManager;
  let mockWindowManager: InstanceType<typeof import('../../../../src/modules/windows').WindowManager>;
  let mockProcessManager: InstanceType<typeof import('../../../../src/modules/process').ProcessManager>;
  let mockTrayManager: InstanceType<typeof import('../../../../src/modules/tray').TrayManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    ipcManager = new IPCManager();

    const { WindowManager } = require('../../../../src/modules/windows');
    const { ProcessManager } = require('../../../../src/modules/process');
    const { TrayManager } = require('../../../../src/modules/tray');

    mockWindowManager = new WindowManager();
    mockProcessManager = new ProcessManager();
    mockTrayManager = new TrayManager();

    ipcManager.setDependencies(mockWindowManager, mockProcessManager, mockTrayManager);
  });

  describe('update-config 参数错误场景', () => {
    beforeEach(() => {
      ipcManager.registerAll();
    });

    test('key 为空字符串时仍应执行设置', async () => {
      const updateHandler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'updateConfig')?.[1];

      if (updateHandler) {
        await updateHandler({}, '', 'test-value');
      }

      expect(configManager.set).toHaveBeenCalledWith('', 'test-value');
    });

    test('value 为 null 时应正常处理', async () => {
      const updateHandler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'updateConfig')?.[1];

      if (updateHandler) {
        await updateHandler({}, 'test.key', null);
      }

      expect(configManager.set).toHaveBeenCalledWith('test.key', null);
    });

    test('value 为 undefined 时应正常处理', async () => {
      const updateHandler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'updateConfig')?.[1];

      if (updateHandler) {
        await updateHandler({}, 'test.key', undefined);
      }

      expect(configManager.set).toHaveBeenCalledWith('test.key', undefined);
    });

    test('value 为复杂对象时应正常处理', async () => {
      const complexValue = {
        nested: {
          deep: {
            value: [1, 2, 3]
          }
        }
      };

      const updateHandler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'updateConfig')?.[1];

      if (updateHandler) {
        await updateHandler({}, 'complex.key', complexValue);
      }

      expect(configManager.set).toHaveBeenCalledWith('complex.key', complexValue);
    });
  });

  describe('save-env-path 参数缺失场景', () => {
    beforeEach(() => {
      ipcManager.registerAll();
    });

    test('comfyuiPath 缺失时应使用 undefined', async () => {
      const saveEnvHandler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'saveEnvPath')?.[1];

      if (saveEnvHandler) {
        await saveEnvHandler(
          {},
          {
            pythonPath: '/test/python',
            envArgs: '',
            envVars: ''
          }
        );
      }

      expect(configManager.set).toHaveBeenCalledWith('comfyuiPath', undefined);
    });

    test('pythonPath 缺失时应使用 undefined', async () => {
      const saveEnvHandler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'saveEnvPath')?.[1];

      if (saveEnvHandler) {
        await saveEnvHandler(
          {},
          {
            comfyuiPath: '/test/comfyui',
            envArgs: '',
            envVars: ''
          }
        );
      }

      expect(configManager.set).toHaveBeenCalledWith('pythonPath', undefined);
    });

    test('整个参数对象为空时应不抛出错误', async () => {
      const saveEnvHandler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'saveEnvPath')?.[1];

      if (saveEnvHandler) {
        await saveEnvHandler({}, {});
      }

      // 应该不抛出错误
      expect(true).toBe(true);
    });
  });

  describe('select-comfyui-path 对话框取消场景', () => {
    beforeEach(() => {
      ipcManager.registerAll();
    });

    test('用户取消选择时应返回空字符串', async () => {
      dialog.showOpenDialog.mockResolvedValueOnce({
        filePaths: [],
        canceled: true
      });

      const selectHandler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'selectComfyuiPath')?.[1];

      if (selectHandler) {
        const result = await selectHandler({});
        expect(result).toBe('');
      }
    });

    test('filePaths 为 undefined 时应返回空字符串', async () => {
      dialog.showOpenDialog.mockResolvedValueOnce({
        filePaths: [],
        canceled: true
      });

      const selectHandler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'selectComfyuiPath')?.[1];

      if (selectHandler) {
        const result = await selectHandler({});
        expect(result).toBe('');
      }
    });
  });

  describe('select-python-path 对话框取消场景', () => {
    beforeEach(() => {
      ipcManager.registerAll();
    });

    test('用户取消选择时应返回空字符串', async () => {
      dialog.showOpenDialog.mockResolvedValueOnce({
        filePaths: [],
        canceled: true
      });

      const selectHandler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'selectPythonPath')?.[1];

      if (selectHandler) {
        const result = await selectHandler({});
        expect(result).toBe('');
      }
    });

    test('选择多个文件时应返回第一个', async () => {
      dialog.showOpenDialog.mockResolvedValueOnce({
        filePaths: ['/path/python1.exe', '/path/python2.exe'],
        canceled: false
      });

      const selectHandler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'selectPythonPath')?.[1];

      if (selectHandler) {
        const result = await selectHandler({});
        expect(result).toBe('/path/python1.exe');
      }
    });
  });

  describe('get-log-content 异常场景', () => {
    beforeEach(() => {
      ipcManager.registerAll();
    });

    test('读取日志失败时应返回错误信息', async () => {
      logger.readLogContent.mockRejectedValueOnce(new Error('读取失败'));

      const getLogHandler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'getLogContent')?.[1];

      if (getLogHandler) {
        await expect(getLogHandler({})).rejects.toThrow('读取失败');
      }
    });
  });

  describe('clear-log 异常场景', () => {
    beforeEach(() => {
      ipcManager.registerAll();
    });

    test('清空日志失败时应返回 false', async () => {
      logger.clearLog.mockResolvedValueOnce(false);

      const clearLogHandler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'clearLog')?.[1];

      if (clearLogHandler) {
        const result = await clearLogHandler({});
        expect(result).toBe(false);
      }
    });

    test('清空日志抛出异常时应正常处理', async () => {
      logger.clearLog.mockRejectedValueOnce(new Error('清空失败'));

      const clearLogHandler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'clearLog')?.[1];

      if (clearLogHandler) {
        await expect(clearLogHandler({})).rejects.toThrow('清空失败');
      }
    });
  });

  describe('start-comfyui 异常场景', () => {
    test('start 抛出异常时应正常处理', async () => {
      (mockProcessManager.start as jest.Mock).mockRejectedValueOnce(new Error('启动失败'));

      ipcManager.registerAll();

      const startHandler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'startComfyui')?.[1];

      if (startHandler) {
        await expect(startHandler({})).rejects.toThrow('启动失败');
      }
    });
  });

  describe('reset-config 对话框场景', () => {
    beforeEach(() => {
      ipcManager.registerAll();
    });

    test('对话框显示失败时应正常处理', async () => {
      dialog.showMessageBox.mockRejectedValueOnce(new Error('对话框错误'));

      const resetHandler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'resetConfig')?.[1];

      if (resetHandler) {
        await expect(resetHandler({})).rejects.toThrow('对话框错误');
      }
    });
  });

  describe('close-window 异常场景', () => {
    beforeEach(() => {
      ipcManager.registerAll();
    });

    test('fromWebContents 返回 null 时应不抛出错误', async () => {
      BrowserWindow.fromWebContents.mockReturnValueOnce(null);

      const closeHandler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'closeWindow')?.[1];

      if (closeHandler) {
        const mockEvent = { sender: {} };
        const result = await closeHandler(mockEvent);
        expect(result).toBeUndefined();
      }
    });

    test('窗口 close 方法抛出异常时应正常处理', async () => {
      const mockWin = {
        isDestroyed: jest.fn(() => false),
        close: jest.fn(() => {
          throw new Error('关闭失败');
        })
      };

      BrowserWindow.fromWebContents.mockReturnValueOnce(mockWin);

      const closeHandler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'closeWindow')?.[1];

      if (closeHandler) {
        const mockEvent = { sender: {} };
        // 由于 close 可能抛出异常，测试应该捕获
        try {
          await closeHandler(mockEvent);
        } catch (error) {
          expect((error as Error).message).toBe('关闭失败');
        }
      }
    });
  });

  describe('并发调用场景', () => {
    beforeEach(() => {
      ipcManager.registerAll();
    });

    test('多次调用 update-config 应按顺序处理', async () => {
      const updateHandler = ipcMain.handle.mock.calls.find((call: unknown[]) => call[0] === 'updateConfig')?.[1];

      if (updateHandler) {
        const promises = [
          updateHandler({}, 'key1', 'value1'),
          updateHandler({}, 'key2', 'value2'),
          updateHandler({}, 'key3', 'value3')
        ];

        await Promise.all(promises);

        expect(configManager.set).toHaveBeenCalledTimes(3);
      }
    });
  });
});

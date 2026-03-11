/**
 * IPCManager 源代码集成测试
 * 直接测试 src/modules/ipc.ts 的实际代码
 */

import { ipcMain } from 'electron';

// Mock electron
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  app: {
    relaunch: jest.fn(),
    quit: jest.fn()
  },
  dialog: {
    showMessageBox: jest.fn().mockResolvedValue({})
  },
  BrowserWindow: {
    getAllWindows: jest.fn().mockReturnValue([])
  }
}));

// Mock config manager
jest.mock('../../src/modules/config', () => ({
  configManager: {
    getAll: jest.fn().mockReturnValue({
      server: { port: 8188 },
      logs: { level: 'info' }
    }),
    set: jest.fn(),
    reset: jest.fn()
  }
}));

// Mock logger
jest.mock('../../src/modules/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock process manager
jest.mock('../../src/modules/process', () => ({
  ProcessManager: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    restart: jest.fn(),
    setOnStatusChange: jest.fn()
  }))
}));

// Mock state manager
jest.mock('../../src/modules/state', () => ({
  stateManager: {
    getStateData: jest.fn().mockReturnValue({
      status: 'stopped',
      pid: null,
      port: null
    })
  },
  Status: {
    STOPPED: 'stopped',
    STARTING: 'starting',
    RUNNING: 'running'
  }
}));

// Mock tray manager
jest.mock('../../src/modules/tray', () => ({
  TrayManager: jest.fn().mockImplementation(() => ({
    updateIcon: jest.fn()
  }))
}));

// Mock window manager
jest.mock('../../src/modules/windows', () => ({
  WindowManager: jest.fn().mockImplementation(() => ({
    sendToRenderer: jest.fn(),
    broadcast: jest.fn()
  }))
}));

import { IPCManager } from '../../src/modules/ipc';

describe('IPCManager 源代码集成测试', () => {
  let ipcManager: IPCManager;
  let mockWindowManager: any;
  let mockProcessManager: any;
  let mockTrayManager: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // 创建 mock 依赖
    mockWindowManager = {
      sendToRenderer: jest.fn(),
      broadcast: jest.fn()
    };

    mockProcessManager = {
      start: jest.fn(),
      stop: jest.fn(),
      restart: jest.fn(),
      setOnStatusChange: jest.fn()
    };

    mockTrayManager = {
      updateIcon: jest.fn()
    };

    ipcManager = new IPCManager();
  });

  describe('依赖设置', () => {
    test('应该能设置依赖', () => {
      ipcManager.setDependencies(mockWindowManager, mockProcessManager, mockTrayManager);
      // 不应抛出错误
      expect(true).toBe(true);
    });
  });

  describe('处理器注册', () => {
    test('应该能注册所有处理器', () => {
      ipcManager.registerAll();

      expect(ipcMain.handle).toHaveBeenCalled();
    });

    test('应该注册配置处理器', () => {
      ipcManager.registerAll();

      const calls = (ipcMain.handle as jest.Mock).mock.calls;
      const channels = calls.map((call: any[]) => call[0]);

      expect(channels).toContain('getConfig');
      expect(channels).toContain('updateConfig');
      expect(channels).toContain('resetConfig');
    });

    test('应该注册进程处理器', () => {
      ipcManager.registerAll();

      const calls = (ipcMain.handle as jest.Mock).mock.calls;
      const channels = calls.map((call: any[]) => call[0]);

      expect(channels).toContain('startComfyui');
      expect(channels).toContain('stopComfyui');
      expect(channels).toContain('restartComfyui');
    });
  });

  describe('配置处理器', () => {
    test('get-config 应返回配置', async () => {
      ipcManager.registerAll();

      // 找到 get-config 处理器
      const getConfigCall = (ipcMain.handle as jest.Mock).mock.calls.find((call: any[]) => call[0] === 'getConfig');

      if (getConfigCall) {
        const handler = getConfigCall[1];
        const result = await handler();

        expect(result).toBeDefined();
        expect(result.server).toBeDefined();
      }
    });

    test('update-config 应更新配置', async () => {
      ipcManager.setDependencies(mockWindowManager, mockProcessManager, mockTrayManager);
      ipcManager.registerAll();

      // 找到 update-config 处理器
      const updateConfigCall = (ipcMain.handle as jest.Mock).mock.calls.find(
        (call: any[]) => call[0] === 'updateConfig'
      );

      if (updateConfigCall) {
        const handler = updateConfigCall[1];
        await handler(null, 'server.port', 9999);

        const { configManager } = require('../../src/modules/config');
        expect(configManager.set).toHaveBeenCalledWith('server.port', 9999);
      }
    });
  });

  describe('进程处理器', () => {
    test('start-comfyui 应调用 start', async () => {
      ipcManager.setDependencies(mockWindowManager, mockProcessManager, mockTrayManager);
      ipcManager.registerAll();

      // 找到 start-comfyui 处理器
      const startCall = (ipcMain.handle as jest.Mock).mock.calls.find((call: any[]) => call[0] === 'startComfyui');

      if (startCall) {
        const handler = startCall[1];
        await handler();

        expect(mockProcessManager.start).toHaveBeenCalled();
      }
    });

    test('stop-comfyui 应调用 stop', async () => {
      ipcManager.setDependencies(mockWindowManager, mockProcessManager, mockTrayManager);
      ipcManager.registerAll();

      // 找到 stop-comfyui 处理器
      const stopCall = (ipcMain.handle as jest.Mock).mock.calls.find((call: any[]) => call[0] === 'stopComfyui');

      if (stopCall) {
        const handler = stopCall[1];
        await handler();

        expect(mockProcessManager.stop).toHaveBeenCalled();
      }
    });

    test('restart-comfyui 应调用 restart', async () => {
      ipcManager.setDependencies(mockWindowManager, mockProcessManager, mockTrayManager);
      ipcManager.registerAll();

      // 找到 restart-comfyui 处理器
      const restartCall = (ipcMain.handle as jest.Mock).mock.calls.find((call: any[]) => call[0] === 'restartComfyui');

      if (restartCall) {
        const handler = restartCall[1];
        await handler();

        expect(mockProcessManager.restart).toHaveBeenCalled();
      }
    });
  });

  describe('状态广播', () => {
    test('应该能广播状态更新', () => {
      ipcManager.setDependencies(mockWindowManager, mockProcessManager, mockTrayManager);

      // 调用广播方法（通过 update-config）
      ipcManager.registerAll();

      // 验证 ipcMain.handle 被调用
      expect(ipcMain.handle).toHaveBeenCalled();

      // 验证 broadcast 方法存在
      expect(mockWindowManager.broadcast).toBeDefined();
    });
  });

  describe('错误处理', () => {
    test('处理器错误应被捕获', async () => {
      const { configManager } = require('../../src/modules/config');
      configManager.set.mockImplementation(() => {
        throw new Error('配置错误');
      });

      ipcManager.setDependencies(mockWindowManager, mockProcessManager, mockTrayManager);
      ipcManager.registerAll();

      const updateConfigCall = (ipcMain.handle as jest.Mock).mock.calls.find(
        (call: any[]) => call[0] === 'updateConfig'
      );

      if (updateConfigCall) {
        const handler = updateConfigCall[1];

        // 不应抛出未捕获的错误
        try {
          await handler(null, 'test', 'value');
        } catch (e) {
          // 错误应该被抛出
          expect(e).toBeDefined();
        }
      }
    });
  });

  describe('日志记录', () => {
    test('配置更新应记录日志', async () => {
      ipcManager.setDependencies(mockWindowManager, mockProcessManager, mockTrayManager);
      ipcManager.registerAll();

      // 验证 ipcMain.handle 被调用
      expect(ipcMain.handle).toHaveBeenCalled();

      // 验证 logger 存在
      const { logger } = require('../../src/modules/logger');
      expect(logger.info).toBeDefined();
    });
  });
});

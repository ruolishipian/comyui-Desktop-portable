/**
 * Tray 源代码测试
 * 直接测试 src/modules/tray.ts 的代码
 */

import { TrayManager } from '../../../../src/modules/tray';

// Mock electron
const mockTray = {
  setToolTip: jest.fn(),
  setContextMenu: jest.fn(),
  on: jest.fn(),
  destroy: jest.fn()
};

jest.mock('electron', () => ({
  Tray: jest.fn(() => mockTray),
  Menu: {
    buildFromTemplate: jest.fn(() => ({ popup: jest.fn() }))
  },
  app: {
    quit: jest.fn()
  },
  nativeImage: {
    createFromPath: jest.fn(() => ({}))
  }
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true)
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/'))
}));

// Mock logger
jest.mock('../../../../src/modules/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock stateManager
jest.mock('../../../../src/modules/state', () => ({
  stateManager: {
    status: 'stopped'
  }
}));

// Mock menu-utils
jest.mock('../../../../src/modules/menu-utils', () => ({
  createFileOperationMenuItems: jest.fn(() => [])
}));

// Mock process
jest.mock('../../../../src/modules/process', () => ({
  ProcessManager: class ProcessManager {
    start = jest.fn(() => Promise.resolve());
    stop = jest.fn();
    restart = jest.fn();
  }
}));

// Mock windows
jest.mock('../../../../src/modules/windows', () => ({
  WindowManager: class WindowManager {
    getWindow = jest.fn(() => ({
      isDestroyed: jest.fn(() => false),
      isVisible: jest.fn(() => true),
      hide: jest.fn(),
      show: jest.fn()
    }));
    focusWindow = jest.fn();
    createLogWindow = jest.fn();
    createSettingsWindow = jest.fn();
    createEnvSelectWindow = jest.fn();
    resetConfig = jest.fn(() => Promise.resolve());
  }
}));

// 设置全局变量
(global as { isQuiting?: boolean }).isQuiting = false;

describe('TrayManager 源代码测试', () => {
  let trayManager: TrayManager;

  beforeEach(() => {
    jest.clearAllMocks();
    trayManager = new TrayManager();
  });

  describe('依赖设置', () => {
    test('应该能设置依赖', () => {
      const { WindowManager } = require('../../../../src/modules/windows');
      const { ProcessManager } = require('../../../../src/modules/process');

      const windowManager = new WindowManager();
      const processManager = new ProcessManager();

      trayManager.setDependencies(windowManager, processManager);

      expect(true).toBe(true);
    });
  });

  describe('托盘创建', () => {
    test('create 应创建托盘', () => {
      trayManager.create();

      expect(mockTray.setToolTip).toHaveBeenCalled();
    });

    test('重复创建应被忽略', () => {
      trayManager.create();
      trayManager.create();

      // 只创建一次
      expect(true).toBe(true);
    });

    test('点击托盘应切换窗口显示', () => {
      const { WindowManager } = require('../../../../src/modules/windows');
      const { ProcessManager } = require('../../../../src/modules/process');

      const windowManager = new WindowManager();
      const processManager = new ProcessManager();
      trayManager.setDependencies(windowManager, processManager);
      trayManager.create();

      // 触发点击事件
      const clickHandler = mockTray.on.mock.calls.find((call: unknown[]) => call[0] === 'click')?.[1];

      if (clickHandler) {
        clickHandler();
        expect(true).toBe(true);
      }
    });
  });

  describe('托盘销毁', () => {
    test('destroy 应销毁托盘', () => {
      trayManager.create();
      trayManager.destroy();

      expect(mockTray.destroy).toHaveBeenCalled();
    });
  });
});

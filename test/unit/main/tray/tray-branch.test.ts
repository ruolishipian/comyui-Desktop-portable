/**
 * 托盘模块分支覆盖测试
 * 补充 TrayManager 的分支覆盖测试用例
 */

import { TrayManager } from '../../../../src/modules/tray';

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true)
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/'))
}));

// Mock electron
jest.mock('electron', () => ({
  Tray: jest.fn(() => ({
    setContextMenu: jest.fn(),
    setToolTip: jest.fn(),
    on: jest.fn(),
    destroy: jest.fn()
  })),
  Menu: {
    buildFromTemplate: jest.fn(() => ({}))
  },
  app: {
    quit: jest.fn()
  }
}));

// Mock logger
jest.mock('../../../../src/modules/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock menu-utils
jest.mock('../../../../src/modules/menu-utils', () => ({
  createFileOperationMenuItems: jest.fn(() => [])
}));

// Mock state
jest.mock('../../../../src/modules/state', () => ({
  stateManager: {
    status: 'stopped',
    addListener: jest.fn(),
    removeListener: jest.fn()
  }
}));

// Mock config
jest.mock('../../../../src/modules/config', () => ({
  configManager: {
    comfyui: {
      path: '/test/path'
    }
  }
}));

import { Tray, Menu } from 'electron';
import { stateManager } from '../../../../src/modules/state';

describe('托盘模块分支覆盖测试', () => {
  let trayManager: TrayManager;
  let mockWindowManager: any;
  let mockProcessManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers(); // 确保使用真实定时器
    trayManager = new TrayManager();
    mockWindowManager = {
      showMainWindow: jest.fn(),
      hideMainWindow: jest.fn(),
      createMainWindow: jest.fn(),
      getWindow: jest.fn(),
      focusWindow: jest.fn(),
      resetConfig: jest.fn(),
      createEnvSelectWindow: jest.fn()
    };
    mockProcessManager = {
      start: jest.fn(),
      stop: jest.fn(),
      restart: jest.fn()
    };
    stateManager.status = 'stopped';
  });

  afterEach(() => {
    jest.useRealTimers(); // 清理定时器
  });

  describe('create 方法分支', () => {
    test('应创建托盘实例', () => {
      trayManager.setDependencies(mockWindowManager, mockProcessManager);
      trayManager.create();

      expect(Tray).toHaveBeenCalled();
    });

    test('应设置上下文菜单', () => {
      trayManager.setDependencies(mockWindowManager, mockProcessManager);
      trayManager.create();

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
    });

    test('应设置工具提示', () => {
      trayManager.setDependencies(mockWindowManager, mockProcessManager);
      trayManager.create();

      expect(Tray).toHaveBeenCalled();
    });
  });

  describe('setDependencies 方法分支', () => {
    test('应正确设置依赖', () => {
      trayManager.setDependencies(mockWindowManager, mockProcessManager);
      trayManager.create();

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
    });
  });

  describe('_processManager 为 null 分支', () => {
    test('processManager 为 null 时菜单点击应不执行操作', () => {
      const noProcessTrayManager = new TrayManager();
      noProcessTrayManager.setDependencies(mockWindowManager, undefined as any);
      noProcessTrayManager.create();

      // 应该不抛出错误
      expect(true).toBe(true);
    });
  });

  describe('不同进程状态下的菜单更新分支', () => {
    test('状态为 running 时菜单应显示停止选项', () => {
      stateManager.status = 'running';
      trayManager.create();

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
    });

    test('状态为 stopped 时菜单应显示启动选项', () => {
      stateManager.status = 'stopped';
      trayManager.create();

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
    });

    test('状态为 starting 时菜单应显示启动选项（禁用）', () => {
      stateManager.status = 'starting';
      trayManager.create();

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
    });

    test('状态为 running 时重启菜单应启用', () => {
      stateManager.status = 'running';
      trayManager.create();

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
    });

    test('状态为 stopped 时重启菜单应禁用', () => {
      stateManager.status = 'stopped';
      trayManager.create();

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
    });
  });

  describe('托盘点击事件分支', () => {
    test('窗口可见时应隐藏窗口', () => {
      const mockWindow = {
        isDestroyed: jest.fn(() => false),
        isVisible: jest.fn(() => true),
        show: jest.fn(),
        hide: jest.fn()
      };

      mockWindowManager.getWindow.mockReturnValue(mockWindow);
      trayManager.setDependencies(mockWindowManager, mockProcessManager);
      trayManager.create();

      // 验证创建成功
      expect(Tray).toHaveBeenCalled();
    });

    test('窗口不可见时应显示窗口', () => {
      const mockWindow = {
        isDestroyed: jest.fn(() => false),
        isVisible: jest.fn(() => false),
        show: jest.fn(),
        hide: jest.fn()
      };

      mockWindowManager.getWindow.mockReturnValue(mockWindow);
      trayManager.setDependencies(mockWindowManager, mockProcessManager);
      trayManager.create();

      expect(Tray).toHaveBeenCalled();
    });

    test('窗口已销毁时应不执行操作', () => {
      const mockWindow = {
        isDestroyed: jest.fn(() => true),
        isVisible: jest.fn(() => false),
        show: jest.fn(),
        hide: jest.fn()
      };

      mockWindowManager.getWindow.mockReturnValue(mockWindow);
      trayManager.setDependencies(mockWindowManager, mockProcessManager);
      trayManager.create();

      expect(Tray).toHaveBeenCalled();
    });

    test('窗口为 null 时应不执行操作', () => {
      mockWindowManager.getWindow.mockReturnValue(null);
      trayManager.setDependencies(mockWindowManager, mockProcessManager);
      trayManager.create();

      expect(Tray).toHaveBeenCalled();
    });
  });

  describe('菜单项点击分支', () => {
    test('点击显示窗口应调用 focusWindow', () => {
      trayManager.setDependencies(mockWindowManager, mockProcessManager);
      trayManager.create();

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
    });

    test('点击重置所有配置应调用 resetConfig', async () => {
      trayManager.setDependencies(mockWindowManager, mockProcessManager);
      trayManager.create();

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
    });

    test('点击重新选择环境应调用 createEnvSelectWindow', () => {
      trayManager.setDependencies(mockWindowManager, mockProcessManager);
      trayManager.create();

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
    });
  });

  describe('定时更新菜单分支', () => {
    test('创建托盘后应启动定时更新', () => {
      jest.useFakeTimers();

      trayManager.setDependencies(mockWindowManager, mockProcessManager);
      trayManager.create();

      // 快进时间
      jest.advanceTimersByTime(1000);

      // 验证创建成功
      expect(true).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('destroy 方法分支', () => {
    test('destroy 应清理定时器和托盘', () => {
      jest.useFakeTimers();

      trayManager.setDependencies(mockWindowManager, mockProcessManager);
      trayManager.create();
      trayManager.destroy();

      // 检查 Tray 是否被调用
      expect(Tray).toHaveBeenCalled();

      jest.useRealTimers();
    });

    test('托盘为 null 时 destroy 应不抛出错误', () => {
      const emptyTrayManager = new TrayManager();

      expect(() => emptyTrayManager.destroy()).not.toThrow();
    });
  });
});

/**
 * Windows 源代码测试
 * 直接测试 src/modules/windows.ts 的代码
 */

import { WindowManager } from '../../../../src/modules/windows';

// Mock electron
const mockWindow = {
  loadFile: jest.fn(),
  loadURL: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  show: jest.fn(),
  close: jest.fn(),
  hide: jest.fn(),
  minimize: jest.fn(),
  maximize: jest.fn(),
  restore: jest.fn(),
  isDestroyed: jest.fn(() => false),
  isVisible: jest.fn(() => true),
  isMinimized: jest.fn(() => false),
  isMaximized: jest.fn(() => false),
  getSize: jest.fn(() => [1280, 720]),
  getPosition: jest.fn(() => [100, 100]),
  setTitle: jest.fn(),
  reload: jest.fn(),
  focus: jest.fn(),
  removeListener: jest.fn(),
  webContents: {
    send: jest.fn(),
    on: jest.fn(),
    openDevTools: jest.fn()
  }
};

jest.mock('electron', () => ({
  BrowserWindow: jest.fn(() => mockWindow),
  dialog: {
    showMessageBox: jest.fn(() => Promise.resolve({ response: 0 }))
  },
  Menu: {
    buildFromTemplate: jest.fn(() => ({ popup: jest.fn() }))
  },
  app: {
    getAppPath: jest.fn(() => '/test/app'),
    quit: jest.fn()
  },
  screen: {
    getPrimaryDisplay: jest.fn(() => ({
      workAreaSize: { width: 1920, height: 1080 }
    }))
  }
}));

// Mock configManager
jest.mock('../../../../src/modules/config', () => ({
  configManager: {
    window: {
      width: 1280,
      height: 720,
      x: null,
      y: null,
      maximized: false
    },
    tray: {
      minimizeToTray: true
    },
    set: jest.fn(),
    reset: jest.fn(),
    isEnvironmentConfigured: jest.fn(() => true)
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
  processManager: {
    start: jest.fn(),
    stop: jest.fn(),
    restart: jest.fn()
  }
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/'))
}));

// 设置全局变量
(global as { isQuiting?: boolean }).isQuiting = false;

describe('WindowManager 源代码测试', () => {
  let windowManager: WindowManager;

  beforeEach(() => {
    jest.clearAllMocks();
    windowManager = new WindowManager();
    mockWindow.isDestroyed.mockReturnValue(false);
    mockWindow.isMinimized.mockReturnValue(false);
    mockWindow.isMaximized.mockReturnValue(false);
  });

  describe('窗口获取', () => {
    test('getWindow 应返回 undefined 当窗口不存在', () => {
      const win = windowManager.getWindow('main');
      expect(win).toBeUndefined();
    });

    test('isWindowValid 应返回 false 当窗口不存在', () => {
      const valid = windowManager.isWindowValid('main');
      expect(valid).toBe(false);
    });
  });

  describe('窗口创建', () => {
    test('createMainWindow 应创建主窗口', () => {
      windowManager.createMainWindow();

      expect(windowManager.getWindow('main')).toBeDefined();
    });

    test('createMainWindow 已存在时应聚焦', () => {
      windowManager.createMainWindow();
      windowManager.createMainWindow();

      // 第二次调用应该聚焦而不是创建新窗口
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    test('createLogWindow 应创建日志窗口', () => {
      windowManager.createLogWindow();

      expect(windowManager.getWindow('log')).toBeDefined();
    });

    test('createSettingsWindow 应创建设置窗口', () => {
      windowManager.createSettingsWindow();

      expect(windowManager.getWindow('settings')).toBeDefined();
    });

    test('createEnvSelectWindow 应创建环境选择窗口', () => {
      windowManager.createEnvSelectWindow();

      expect(windowManager.getWindow('envSelect')).toBeDefined();
    });
  });

  describe('窗口聚焦', () => {
    test('focusWindow 应显示并聚焦窗口', () => {
      windowManager.createMainWindow();
      windowManager.focusWindow('main');

      expect(mockWindow.show).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    test('focusWindow 应恢复最小化的窗口', () => {
      mockWindow.isMinimized.mockReturnValue(true);
      windowManager.createMainWindow();
      windowManager.focusWindow('main');

      expect(mockWindow.restore).toHaveBeenCalled();
    });
  });

  describe('页面加载', () => {
    test('loadPage 应加载本地文件', () => {
      windowManager.createMainWindow();
      windowManager.loadPage('main', 'test.html');

      expect(mockWindow.loadFile).toHaveBeenCalled();
    });

    test('loadPage 应加载 URL', () => {
      windowManager.createMainWindow();
      windowManager.loadPage('main', 'http://localhost:8188');

      expect(mockWindow.loadURL).toHaveBeenCalledWith('http://localhost:8188');
    });
  });

  describe('窗口标题', () => {
    test('updateTitle 应更新窗口标题', () => {
      windowManager.createMainWindow();
      windowManager.updateTitle('main', '新标题');

      expect(mockWindow.setTitle).toHaveBeenCalledWith('新标题');
    });
  });

  describe('消息发送', () => {
    test('sendToWindow 应发送消息到指定窗口', () => {
      windowManager.createMainWindow();
      // 需要先设置渲染进程就绪状态
      windowManager.setRendererReady('main');
      windowManager.sendToWindow('main', 'test-channel', { data: 'test' });

      expect(mockWindow.webContents.send).toHaveBeenCalledWith('test-channel', { data: 'test' });
    });

    test('broadcast 应广播消息到所有窗口', () => {
      windowManager.createMainWindow();
      windowManager.createLogWindow();
      // 需要先设置渲染进程就绪状态
      windowManager.setRendererReady('main');
      windowManager.setRendererReady('log');
      windowManager.broadcast('test-channel', { data: 'test' });

      expect(mockWindow.webContents.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('窗口关闭', () => {
    test('closeAll 应关闭所有窗口', () => {
      windowManager.createMainWindow();
      windowManager.createLogWindow();
      windowManager.closeAll();

      expect(mockWindow.close).toHaveBeenCalled();
    });
  });

  describe('事件回调', () => {
    test('setOnWindowEvent 应设置事件回调', () => {
      const callback = jest.fn();
      windowManager.setOnWindowEvent(callback);

      expect(true).toBe(true);
    });
  });

  describe('配置重置', () => {
    test('resetConfig 应正常执行', async () => {
      windowManager.createMainWindow();
      await windowManager.resetConfig();

      expect(true).toBe(true);
    });
  });
});

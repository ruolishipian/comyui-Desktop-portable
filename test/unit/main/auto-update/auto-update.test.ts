import { AutoUpdateManager } from '../../../../src/modules/auto-update';

// Mock electron-updater before any imports
jest.mock('electron-updater', () => ({
  autoUpdater: {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    setFeedURL: jest.fn(),
    on: jest.fn(),
    checkForUpdates: jest.fn(() => Promise.resolve(null)),
    downloadUpdate: jest.fn(() => Promise.resolve([])),
    quitAndInstall: jest.fn()
  }
}));

// Mock electron
jest.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: jest.fn(() => [])
  },
  dialog: {
    showMessageBox: jest.fn(() => Promise.resolve({ response: 0 }))
  },
  app: {
    getVersion: jest.fn(() => '1.0.0')
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

describe('AutoUpdateManager', () => {
  let manager: AutoUpdateManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    manager = new AutoUpdateManager();
  });

  afterEach(() => {
    manager.destroy();
    jest.useRealTimers();
  });

  test('应该正确初始化', () => {
    expect(manager.initialized).toBe(false);
  });

  test('init 应该设置 initialized 为 true', () => {
    manager.init();
    expect(manager.initialized).toBe(true);
  });

  test('destroy 应该设置 initialized 为 false', () => {
    manager.init();
    manager.destroy();
    expect(manager.initialized).toBe(false);
  });

  test('未初始化时 checkForUpdate 不应抛错', async () => {
    await expect(manager.checkForUpdate()).resolves.toBeUndefined();
  });

  test('未初始化时 downloadUpdate 不应抛错', async () => {
    await expect(manager.downloadUpdate()).resolves.toBeUndefined();
  });
});

/**
 * 统一的测试设置文件
 * 提供全局 Mock 和测试工具
 */

import { jest } from '@jest/globals';

// ============================================
// 类型定义
// ============================================

/**
 * 部分 Mock 类型，允许深度部分 Mock
 */
export type PartialMock<T> = {
  -readonly [K in keyof T]?: PartialMock<T[K]>;
};

/**
 * Electron Mock 类型
 */
export type ElectronMock = PartialMock<typeof Electron> & {
  app: Partial<Electron.App>;
  dialog: Partial<Electron.Dialog>;
  ipcMain: Partial<Electron.IpcMain>;
  ipcRenderer: Partial<Electron.IpcRenderer>;
  BrowserWindow: Partial<Electron.BrowserWindowConstructorOptions>;
};

// ============================================
// Electron Mock
// ============================================

export const quitMessage = /^Test exited via app\.quit\(\)$/;

export const electronMock: ElectronMock = {
  app: {
    isPackaged: true,
    quit: jest.fn(() => {
      throw new Error('Test exited via app.quit()');
    }),
    exit: jest.fn(() => {
      throw new Error('Test exited via app.exit()');
    }),
    getPath: jest.fn((name: string) => `/mock/app/${name}`),
    getAppPath: jest.fn(() => '/mock/app/path'),
    relaunch: jest.fn(),
    getVersion: jest.fn(() => '1.0.0'),
    getName: jest.fn(() => 'ComfyUI-Desktop'),
    on: jest.fn() as any,
    once: jest.fn() as any,
    whenReady: jest.fn(() => Promise.resolve()),
    requestSingleInstanceLock: jest.fn(() => true)
  },
  dialog: {
    showErrorBox: jest.fn(),
    showMessageBox: jest.fn(() => Promise.resolve({ response: 0, checkboxChecked: false })) as any,
    showOpenDialog: jest.fn(() =>
      Promise.resolve({
        canceled: false,
        filePaths: ['/mock/selected/path']
      })
    ) as any,
    showSaveDialog: jest.fn(() =>
      Promise.resolve({
        canceled: false,
        filePath: '/mock/saved/file.txt'
      })
    ) as any
  },
  ipcMain: {
    on: jest.fn() as any,
    once: jest.fn() as any,
    handle: jest.fn() as any,
    handleOnce: jest.fn() as any,
    removeHandler: jest.fn() as any,
    emit: jest.fn() as any
  },
  ipcRenderer: {
    invoke: jest.fn(() => Promise.resolve()),
    on: jest.fn() as any,
    off: jest.fn() as any,
    once: jest.fn() as any,
    send: jest.fn(),
    emit: jest.fn() as any
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadURL: jest.fn(() => Promise.resolve()),
    loadFile: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    once: jest.fn(),
    webContents: {
      on: jest.fn(),
      send: jest.fn(),
      openDevTools: jest.fn()
    },
    show: jest.fn(),
    hide: jest.fn(),
    close: jest.fn(),
    minimize: jest.fn(),
    maximize: jest.fn(),
    restore: jest.fn()
  }))
};

// Mock Electron
jest.mock('electron', () => electronMock);

// ============================================
// electron-store Mock
// ============================================

export const createMockStore = () => {
  const store: Map<string, any> = new Map();

  return {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (store.has(key)) {
        return store.get(key);
      }
      return defaultValue;
    }),
    set: jest.fn((key: string, value: any) => {
      if (typeof key === 'string') {
        store.set(key, value);
      } else if (typeof key === 'object') {
        Object.entries(key).forEach(([k, v]) => store.set(k, v));
      }
    }),
    has: jest.fn((key: string) => store.has(key)),
    delete: jest.fn((key: string) => store.delete(key)),
    clear: jest.fn(() => store.clear()),
    size: store.size,
    store: store
  };
};

jest.mock('electron-store', () => ({
  __esModule: true,
  default: jest.fn(() => createMockStore())
}));

// ============================================
// electron-log Mock
// ============================================

export const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  silly: jest.fn(),
  log: jest.fn(),
  transports: {
    file: {
      getFile: jest.fn(() => ({ path: '/mock/log.txt' }))
    },
    console: {
      level: 'info'
    }
  }
};

jest.mock('electron-log', () => mockLogger);
jest.mock('electron-log/main', () => mockLogger);

// ============================================
// 全局测试配置
// ============================================

// 增加测试超时时间
jest.setTimeout(30000);

// 全局 beforeAll 钩子
beforeAll(() => {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.COMFYUI_TEST_MODE = '1';
});

// 全局 afterAll 钩子
afterAll(() => {
  // 清理环境变量
  delete process.env.COMFYUI_TEST_MODE;
});

// 全局 afterEach 钩子 - 清理所有 Mock
afterEach(() => {
  jest.clearAllMocks();
});

// ============================================
// 导出工具函数
// ============================================

/**
 * 重置所有 Mock
 */
export function resetAllMocks() {
  jest.clearAllMocks();
  jest.restoreAllMocks();
}

/**
 * 创建 Mock 函数
 */
export function createMockFn<T extends (...args: any[]) => any>(implementation?: T) {
  return jest.fn(implementation);
}

/**
 * 等待条件满足
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * 延迟执行
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 生成随机测试数据
 */
export const testData = {
  randomPort: () => Math.floor(Math.random() * 65535) + 1,
  randomPath: () => `/test/path/${Date.now()}`,
  randomString: (length = 10) =>
    Math.random()
      .toString(36)
      .substring(2, length + 2),
  randomInt: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
  randomBoolean: () => Math.random() > 0.5
};

/**
 * 全局 Mock 设置
 * 在所有测试前执行
 *
 * 注意：这些是默认 Mock，如果测试需要不同的行为，
 * 可以在测试文件中使用 jest.mock() 覆盖
 */

// Mock Electron 模块
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(name => {
      const paths = {
        appData: '/mock/appData',
        userData: '/mock/userData',
        temp: '/mock/temp'
      };
      return paths[name] || '/mock/default';
    }),
    getAppPath: jest.fn(() => '/mock/app'),
    quit: jest.fn(),
    relaunch: jest.fn(),
    on: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve())
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    loadURL: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    show: jest.fn(),
    close: jest.fn(),
    webContents: {
      send: jest.fn(),
      on: jest.fn()
    }
  })),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    removeHandler: jest.fn()
  },
  ipcRenderer: {
    invoke: jest.fn(),
    send: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn()
  },
  dialog: {
    showOpenDialog: jest.fn(() => Promise.resolve({ filePaths: [], canceled: false })),
    showMessageBox: jest.fn(() => Promise.resolve({ response: 0 }))
  },
  Menu: {
    buildFromTemplate: jest.fn(),
    setApplicationMenu: jest.fn()
  },
  Tray: jest.fn().mockImplementation(() => ({
    setToolTip: jest.fn(),
    setContextMenu: jest.fn(),
    on: jest.fn()
  })),
  shell: {
    openPath: jest.fn()
  }
}));

// Mock electron-store
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(key => {
      const defaultConfig = {
        comfyuiPath: '',
        pythonPath: '',
        'server.port': 8188,
        'server.autoStart': true
      };
      return defaultConfig[key];
    }),
    set: jest.fn(),
    has: jest.fn(() => true),
    delete: jest.fn(),
    clear: jest.fn(),
    path: '/mock/config/path.json',
    store: {}
  }));
});

// Mock fs 模块 - 提供基本实现，测试文件可以覆盖
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn(() => []),
    statSync: jest.fn(() => ({ isDirectory: () => true })),
    readFileSync: jest.fn(() => ''),
    writeFileSync: jest.fn(),
    unlinkSync: jest.fn(),
    promises: {
      readFile: jest.fn(() => Promise.resolve('')),
      writeFile: jest.fn(() => Promise.resolve()),
      mkdir: jest.fn(() => Promise.resolve()),
      readdir: jest.fn(() => Promise.resolve([]))
    }
  };
});

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    pid: 12345,
    on: jest.fn(),
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    kill: jest.fn(),
    killed: false
  })),
  exec: jest.fn((cmd, callback) => {
    if (callback) callback(null, '', '');
  })
}));

// Mock tree-kill
jest.mock('tree-kill', () =>
  jest.fn((pid, signal, callback) => {
    if (callback) callback(null);
  })
);

// Mock wait-on
jest.mock('wait-on', () =>
  jest.fn((options, callback) => {
    if (callback) callback(null);
    return Promise.resolve();
  })
);

// 全局测试超时设置已移至各 Jest 配置文件
// jest.setTimeout(10000);

// 清理函数
afterEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

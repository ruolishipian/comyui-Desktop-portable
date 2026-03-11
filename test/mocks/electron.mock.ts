/**
 * Electron Mock
 * 模拟 Electron API
 */

export const mockApp = {
  getPath: jest.fn((name: string) => {
    const paths: Record<string, string> = {
      appData: '/mock/appData',
      userData: '/mock/userData',
      temp: '/mock/temp',
      desktop: '/mock/desktop',
      documents: '/mock/documents'
    };
    return paths[name] || '/mock/default';
  }),
  getAppPath: jest.fn(() => '/mock/app'),
  quit: jest.fn(),
  relaunch: jest.fn(),
  on: jest.fn(),
  whenReady: jest.fn(() => Promise.resolve()),
  getVersion: jest.fn(() => '1.0.0'),
  getName: jest.fn(() => 'ComfyUI-Desktop')
};

export const mockBrowserWindow = {
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
  webContents: {
    send: jest.fn(),
    on: jest.fn(),
    openDevTools: jest.fn()
  },
  getSize: jest.fn(() => [1280, 720]),
  getPosition: jest.fn(() => [100, 100])
};

export const mockIpcMain = {
  handle: jest.fn(),
  on: jest.fn(),
  removeHandler: jest.fn(),
  removeAllListeners: jest.fn()
};

export const mockIpcRenderer = {
  invoke: jest.fn(),
  send: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn()
};

export const mockDialog = {
  showOpenDialog: jest.fn(() =>
    Promise.resolve({
      filePaths: ['/mock/path'],
      canceled: false
    })
  ),
  showMessageBox: jest.fn(() => Promise.resolve({ response: 0 })),
  showErrorBox: jest.fn()
};

export const mockMenu = {
  buildFromTemplate: jest.fn(() => ({ popup: jest.fn() })),
  setApplicationMenu: jest.fn(),
  getApplicationMenu: jest.fn()
};

export const mockTray = {
  setToolTip: jest.fn(),
  setContextMenu: jest.fn(),
  on: jest.fn(),
  destroy: jest.fn()
};

export const mockShell = {
  openPath: jest.fn(() => Promise.resolve('')),
  openExternal: jest.fn(() => Promise.resolve())
};

// 导出完整的 Electron Mock
export const mockElectron = {
  app: mockApp,
  BrowserWindow: jest.fn(() => mockBrowserWindow),
  ipcMain: mockIpcMain,
  ipcRenderer: mockIpcRenderer,
  dialog: mockDialog,
  Menu: mockMenu,
  Tray: jest.fn(() => mockTray),
  shell: mockShell
};

export default mockElectron;

/**
 * Mock 对象工厂
 * 提供统一的 Electron API 和 Node.js API Mock 创建功能
 */

import * as fs from 'fs';

// ============== Electron API Mock 工厂 ==============

/**
 * Electron API Mock 工厂
 */
export class ElectronMockFactory {
  /**
   * 创建 ipcMain Mock
   */
  static createIpcMain(): {
    handle: jest.Mock;
    on: jest.Mock;
    once: jest.Mock;
    removeHandler: jest.Mock;
    emit: jest.Mock;
  } {
    const handlers: Map<string, Function> = new Map();
    const listeners: Map<string, Set<Function>> = new Map();

    return {
      handle: jest.fn((channel: string, handler: Function) => {
        handlers.set(channel, handler);
      }),
      on: jest.fn((channel: string, listener: Function) => {
        if (!listeners.has(channel)) {
          listeners.set(channel, new Set());
        }
        listeners.get(channel)!.add(listener);
      }),
      once: jest.fn((channel: string, listener: Function) => {
        if (!listeners.has(channel)) {
          listeners.set(channel, new Set());
        }
        listeners.get(channel)!.add(listener);
      }),
      removeHandler: jest.fn((channel: string) => {
        handlers.delete(channel);
      }),
      emit: jest.fn((channel: string, ...args: unknown[]) => {
        listeners.get(channel)?.forEach(cb => cb(...args));
      })
    };
  }

  /**
   * 创建 ipcRenderer Mock
   */
  static createIpcRenderer(): {
    invoke: jest.Mock;
    send: jest.Mock;
    on: jest.Mock;
    once: jest.Mock;
    removeListener: jest.Mock;
    removeAllListeners: jest.Mock;
  } {
    return {
      invoke: jest.fn(() => Promise.resolve()),
      send: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn()
    };
  }

  /**
   * 创建 dialog Mock
   */
  static createDialog(): {
    showMessageBox: jest.Mock;
    showErrorBox: jest.Mock;
    showOpenDialog: jest.Mock;
    showSaveDialog: jest.Mock;
  } {
    return {
      showMessageBox: jest.fn(() => Promise.resolve({ response: 0, checkboxChecked: false })),
      showErrorBox: jest.fn(),
      showOpenDialog: jest.fn(() => Promise.resolve({ filePaths: [], canceled: false })),
      showSaveDialog: jest.fn(() => Promise.resolve({ filePath: '', canceled: false }))
    };
  }

  /**
   * 创建 app Mock
   */
  static createApp(): {
    getName: jest.Mock;
    getVersion: jest.Mock;
    getPath: jest.Mock;
    getAppPath: jest.Mock;
    quit: jest.Mock;
    exit: jest.Mock;
    relaunch: jest.Mock;
    requestSingleInstanceLock: jest.Mock;
    hasSingleInstanceLock: jest.Mock;
    releaseSingleInstanceLock: jest.Mock;
    whenReady: jest.Mock;
    isPackaged: boolean;
    on: jest.Mock;
    once: jest.Mock;
  } {
    return {
      getName: jest.fn(() => 'TestApp'),
      getVersion: jest.fn(() => '1.0.0'),
      getPath: jest.fn((name: string) => `/test/path/${name}`),
      getAppPath: jest.fn(() => '/test/app'),
      quit: jest.fn(),
      exit: jest.fn(),
      relaunch: jest.fn(),
      requestSingleInstanceLock: jest.fn(() => true),
      hasSingleInstanceLock: jest.fn(() => true),
      releaseSingleInstanceLock: jest.fn(),
      whenReady: jest.fn(() => Promise.resolve()),
      isPackaged: false,
      on: jest.fn(),
      once: jest.fn()
    };
  }

  /**
   * 创建 BrowserWindow Mock
   */
  static createBrowserWindow(): {
    new: jest.Mock;
    fromWebContents: jest.Mock;
    fromId: jest.Mock;
    getAllWindows: jest.Mock;
    getFocusedWindow: jest.Mock;
  } {
    const mockWindow = {
      id: 1,
      isDestroyed: jest.fn(() => false),
      isMinimized: jest.fn(() => false),
      isVisible: jest.fn(() => true),
      isMaximized: jest.fn(() => false),
      isFocused: jest.fn(() => true),
      show: jest.fn(),
      hide: jest.fn(),
      close: jest.fn(),
      minimize: jest.fn(),
      maximize: jest.fn(),
      unmaximize: jest.fn(),
      restore: jest.fn(),
      focus: jest.fn(),
      blur: jest.fn(),
      reload: jest.fn(),
      getSize: jest.fn(() => [800, 600]),
      getPosition: jest.fn(() => [100, 100]),
      setSize: jest.fn(),
      setPosition: jest.fn(),
      setTitle: jest.fn(),
      getTitle: jest.fn(() => 'Test Window'),
      loadFile: jest.fn(),
      loadURL: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      webContents: {
        id: 1,
        send: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        emit: jest.fn(),
        reload: jest.fn(),
        loadURL: jest.fn(),
        loadFile: jest.fn(),
        getURL: jest.fn(() => 'file:///test.html'),
        getTitle: jest.fn(() => 'Test Page'),
        isDestroyed: jest.fn(() => false),
        isLoading: jest.fn(() => false),
        executeJavaScript: jest.fn(() => Promise.resolve()),
        openDevTools: jest.fn(),
        closeDevTools: jest.fn()
      }
    };

    return {
      new: jest.fn(() => mockWindow),
      fromWebContents: jest.fn(() => mockWindow),
      fromId: jest.fn(() => mockWindow),
      getAllWindows: jest.fn(() => [mockWindow]),
      getFocusedWindow: jest.fn(() => mockWindow)
    };
  }

  /**
   * 创建 Tray Mock
   */
  static createTray(): {
    new: jest.Mock;
  } {
    const mockTray = {
      setContextMenu: jest.fn(),
      setToolTip: jest.fn(),
      setTitle: jest.fn(),
      getImage: jest.fn(),
      setImage: jest.fn(),
      setPressedImage: jest.fn(),
      displayBalloon: jest.fn(),
      isDestroyed: jest.fn(() => false),
      destroy: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
      popUpContextMenu: jest.fn(),
      bounds: { x: 0, y: 0, width: 16, height: 16 }
    };

    return {
      new: jest.fn(() => mockTray)
    };
  }

  /**
   * 创建 Menu Mock
   */
  static createMenu(): {
    buildFromTemplate: jest.Mock;
    setApplicationMenu: jest.Mock;
    getApplicationMenu: jest.Mock;
    sendActionToFirstResponder: jest.Mock;
  } {
    const mockMenu = {
      popup: jest.fn(),
      closePopup: jest.fn(),
      append: jest.fn(),
      insert: jest.fn(),
      items: []
    };

    return {
      buildFromTemplate: jest.fn(() => mockMenu),
      setApplicationMenu: jest.fn(),
      getApplicationMenu: jest.fn(() => mockMenu),
      sendActionToFirstResponder: jest.fn()
    };
  }

  /**
   * 创建 MenuItem Mock
   */
  static createMenuItem(): {
    new: jest.Mock;
  } {
    return {
      new: jest.fn((options?: Electron.MenuItemConstructorOptions) => ({
        label: options?.label ?? '',
        click: options?.click,
        enabled: options?.enabled ?? true,
        visible: options?.visible ?? true,
        checked: options?.checked ?? false,
        type: options?.type ?? 'normal'
      }))
    };
  }

  /**
   * 创建完整的 Electron Mock
   */
  static createFullElectronMock(): {
    app: ReturnType<typeof ElectronMockFactory.createApp>;
    BrowserWindow: ReturnType<typeof ElectronMockFactory.createBrowserWindow>;
    Tray: ReturnType<typeof ElectronMockFactory.createTray>;
    Menu: ReturnType<typeof ElectronMockFactory.createMenu>;
    dialog: ReturnType<typeof ElectronMockFactory.createDialog>;
    ipcMain: ReturnType<typeof ElectronMockFactory.createIpcMain>;
    ipcRenderer: ReturnType<typeof ElectronMockFactory.createIpcRenderer>;
  } {
    return {
      app: this.createApp(),
      BrowserWindow: this.createBrowserWindow(),
      Tray: this.createTray(),
      Menu: this.createMenu(),
      dialog: this.createDialog(),
      ipcMain: this.createIpcMain(),
      ipcRenderer: this.createIpcRenderer()
    };
  }
}

// ============== Node.js API Mock 工厂 ==============

/**
 * Node.js API Mock 工厂
 */
export class NodeMockFactory {
  /**
   * 创建 ChildProcess Mock
   */
  static createChildProcess(): {
    pid: number;
    killed: boolean;
    exitCode: number | null;
    signalCode: string | null;
    stdout: { on: jest.Mock; destroy: jest.Mock };
    stderr: { on: jest.Mock; destroy: jest.Mock };
    stdin: { on: jest.Mock; write: jest.Mock; end: jest.Mock; destroy: jest.Mock };
    on: jest.Mock;
    off: jest.Mock;
    kill: jest.Mock;
    disconnect: jest.Mock;
    unref: jest.Mock;
    ref: jest.Mock;
  } {
    return {
      pid: 12345,
      killed: false,
      exitCode: null,
      signalCode: null,
      stdout: {
        on: jest.fn(),
        destroy: jest.fn()
      },
      stderr: {
        on: jest.fn(),
        destroy: jest.fn()
      },
      stdin: {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn()
      },
      on: jest.fn(),
      off: jest.fn(),
      kill: jest.fn((_signal?: string) => true),
      disconnect: jest.fn(),
      unref: jest.fn(),
      ref: jest.fn()
    };
  }

  /**
   * 创建 spawn Mock
   */
  static createSpawnMock(): jest.Mock {
    return jest.fn(() => this.createChildProcess());
  }

  /**
   * 创建 fs Mock
   */
  static createFileSystem(): {
    existsSync: jest.Mock;
    exists: jest.Mock;
    readFileSync: jest.Mock;
    readFile: jest.Mock;
    writeFileSync: jest.Mock;
    writeFile: jest.Mock;
    appendFileSync: jest.Mock;
    appendFile: jest.Mock;
    unlinkSync: jest.Mock;
    unlink: jest.Mock;
    mkdirSync: jest.Mock;
    mkdir: jest.Mock;
    rmdirSync: jest.Mock;
    rmdir: jest.Mock;
    readdirSync: jest.Mock;
    readdir: jest.Mock;
    statSync: jest.Mock;
    stat: jest.Mock;
    renameSync: jest.Mock;
    rename: jest.Mock;
    promises: {
      readFile: jest.Mock;
      writeFile: jest.Mock;
      appendFile: jest.Mock;
      unlink: jest.Mock;
      mkdir: jest.Mock;
      rmdir: jest.Mock;
      readdir: jest.Mock;
      stat: jest.Mock;
      rename: jest.Mock;
    };
  } {
    return {
      existsSync: jest.fn(() => true),
      exists: jest.fn((_path: string, callback: (exists: boolean) => void) => {
        callback(true);
      }),
      readFileSync: jest.fn(() => Buffer.from('test content')),
      readFile: jest.fn((_path: string, options: unknown, callback: (err: Error | null, data?: Buffer) => void) => {
        if (typeof options === 'function') {
          callback = options as (err: Error | null, data?: Buffer) => void;
        }
        callback(null, Buffer.from('test content'));
      }),
      writeFileSync: jest.fn(),
      writeFile: jest.fn((_path: string, _data: unknown, options: unknown, callback: (err: Error | null) => void) => {
        if (typeof options === 'function') {
          callback = options as (err: Error | null) => void;
        }
        callback(null);
      }),
      appendFileSync: jest.fn(),
      appendFile: jest.fn((_path: string, _data: unknown, options: unknown, callback: (err: Error | null) => void) => {
        if (typeof options === 'function') {
          callback = options as (err: Error | null) => void;
        }
        callback(null);
      }),
      unlinkSync: jest.fn(),
      unlink: jest.fn((_path: string, callback: (err: Error | null) => void) => {
        callback(null);
      }),
      mkdirSync: jest.fn(),
      mkdir: jest.fn((_path: string, options: unknown, callback: (err: Error | null) => void) => {
        if (typeof options === 'function') {
          callback = options as (err: Error | null) => void;
        }
        callback(null);
      }),
      rmdirSync: jest.fn(),
      rmdir: jest.fn((_path: string, callback: (err: Error | null) => void) => {
        callback(null);
      }),
      readdirSync: jest.fn(() => []),
      readdir: jest.fn((_path: string, callback: (err: Error | null, files?: string[]) => void) => {
        callback(null, []);
      }),
      statSync: jest.fn(() => ({
        size: 1024,
        isFile: () => true,
        isDirectory: () => false,
        ctime: new Date(),
        mtime: new Date(),
        ctimeMs: Date.now(),
        mtimeMs: Date.now()
      })),
      stat: jest.fn((_path: string, callback: (err: Error | null, stats?: fs.Stats) => void) => {
        callback(null, {
          size: 1024,
          isFile: () => true,
          isDirectory: () => false,
          ctime: new Date(),
          mtime: new Date(),
          ctimeMs: Date.now(),
          mtimeMs: Date.now()
        } as fs.Stats);
      }),
      renameSync: jest.fn(),
      rename: jest.fn((_oldPath: string, _newPath: string, callback: (err: Error | null) => void) => {
        callback(null);
      }),
      promises: {
        readFile: jest.fn(() => Promise.resolve(Buffer.from('test content'))),
        writeFile: jest.fn(() => Promise.resolve()),
        appendFile: jest.fn(() => Promise.resolve()),
        unlink: jest.fn(() => Promise.resolve()),
        mkdir: jest.fn(() => Promise.resolve()),
        rmdir: jest.fn(() => Promise.resolve()),
        readdir: jest.fn(() => Promise.resolve([])),
        stat: jest.fn(() =>
          Promise.resolve({
            size: 1024,
            isFile: () => true,
            isDirectory: () => false,
            ctime: new Date(),
            mtime: new Date(),
            ctimeMs: Date.now(),
            mtimeMs: Date.now()
          } as fs.Stats)
        ),
        rename: jest.fn(() => Promise.resolve())
      }
    };
  }

  /**
   * 创建 path Mock
   */
  static createPathMock(): {
    join: jest.Mock;
    resolve: jest.Mock;
    dirname: jest.Mock;
    basename: jest.Mock;
    extname: jest.Mock;
    parse: jest.Mock;
    format: jest.Mock;
    normalize: jest.Mock;
    isAbsolute: jest.Mock;
    relative: jest.Mock;
    sep: string;
    delimiter: string;
  } {
    return {
      join: jest.fn((...paths: string[]) => paths.join('/')),
      resolve: jest.fn((...paths: string[]) => paths.join('/')),
      dirname: jest.fn((path: string) => path.split('/').slice(0, -1).join('/')),
      basename: jest.fn((path: string) => path.split('/').pop() ?? ''),
      extname: jest.fn((path: string) => {
        const parts = path.split('.');
        return parts.length > 1 ? `.${parts.pop()}` : '';
      }),
      parse: jest.fn((path: string) => ({
        root: '/',
        dir: path.split('/').slice(0, -1).join('/'),
        base: path.split('/').pop() ?? '',
        ext: '',
        name: path.split('/').pop()?.split('.')[0] ?? ''
      })),
      format: jest.fn((pathObject: { dir?: string; base?: string }) => {
        return `${pathObject.dir}/${pathObject.base}`;
      }),
      normalize: jest.fn((path: string) => path),
      isAbsolute: jest.fn((path: string) => path.startsWith('/')),
      relative: jest.fn((_from: string, to: string) => to),
      sep: '/',
      delimiter: ':'
    };
  }
}

// ============== tree-kill Mock 工厂 ==============

/**
 * 创建 tree-kill Mock
 */
export function createTreeKillMock(): jest.Mock {
  return jest.fn((_pid: number, _signal: string, callback?: (err: Error | null) => void) => {
    if (callback) {
      callback(null);
    }
  });
}

/**
 * 创建 tree-kill 失败 Mock
 */
export function createTreeKillErrorMock(error: Error): jest.Mock {
  return jest.fn((_pid: number, _signal: string, callback?: (err: Error | null) => void) => {
    if (callback) {
      callback(error);
    }
  });
}

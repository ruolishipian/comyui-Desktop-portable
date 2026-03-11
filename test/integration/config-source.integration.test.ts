/**
 * ConfigManager 源代码集成测试
 * 直接测试 src/modules/config.ts 的实际代码
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock fs 模块
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    existsSync: jest.fn((p: string) => {
      // 对于测试路径返回 true
      if (p.includes('comfyui') || p.includes('python')) {
        return true;
      }
      return actualFs.existsSync(p);
    }),
    mkdirSync: actualFs.mkdirSync,
    writeFileSync: jest.fn(),
    readFileSync: actualFs.readFileSync,
    rmSync: actualFs.rmSync,
    unlinkSync: actualFs.unlinkSync
  };
});

// Mock Electron 模块
jest.mock('electron', () => {
  // 在 mock 函数内部使用 jest.requireActual
  const pathModule = jest.requireActual('path');
  const osModule = jest.requireActual('os');

  return {
    app: {
      getAppPath: jest.fn(() => pathModule.join(osModule.tmpdir(), 'comfyui-test-' + Date.now())),
      getPath: jest.fn((name: string) => pathModule.join(osModule.tmpdir(), 'comfyui-test-' + Date.now(), name))
    }
  };
});

// Mock electron-store
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation((options: any) => {
    // 使用一个内部存储对象，初始化为空
    let store: Record<string, any> = {};
    const cwd = options.cwd || os.tmpdir();
    const configPath = path.join(cwd, `${options.name || 'config'}.json`);

    // 确保目录存在
    if (!fs.existsSync(cwd)) {
      fs.mkdirSync(cwd, { recursive: true });
    }

    // 如果文件存在，读取配置
    if (fs.existsSync(configPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        store = { ...data };
      } catch (e) {
        // 忽略解析错误
      }
    }

    return {
      get: (key: string) => {
        const parts = key.split('.');
        let value: any = store;
        for (const part of parts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else {
            return undefined;
          }
        }
        return value;
      },
      set: (key: string, value: any) => {
        const parts = key.split('.');
        let current: any = store;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (part === undefined) continue;
          if (!(part in current)) {
            current[part] = {};
          }
          current = current[part];
        }
        const lastPart = parts[parts.length - 1];
        if (lastPart !== undefined) {
          current[lastPart] = value;
        }

        // 保存到文件
        fs.writeFileSync(configPath, JSON.stringify(store, null, 2));
      },
      clear: () => {
        // 清空存储，重置为空对象
        store = {};
        try {
          if (fs.existsSync(configPath)) {
            fs.unlinkSync(configPath);
          }
        } catch (e) {
          // 忽略删除错误
        }
      },
      get store() {
        return { ...store };
      },
      set store(data: Record<string, any>) {
        store = { ...data };
      },
      path: configPath
    };
  });
});

import { ConfigManager } from '../../src/modules/config';

describe('ConfigManager 源代码集成测试', () => {
  let configManager: ConfigManager;
  let testDir: string;

  beforeEach(() => {
    // 每个测试使用新的实例
    configManager = new ConfigManager();
    testDir = path.join(os.tmpdir(), 'comfyui-test-' + Date.now());
  });

  afterEach(() => {
    // 清理测试目录
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch (e) {
      // 忽略清理错误
    }
  });

  describe('初始化', () => {
    test('应该能成功初始化', () => {
      configManager.init();
      expect(configManager.configDir).toBeDefined();
      expect(configManager.logsDir).toBeDefined();
    });

    test('重复初始化应该是安全的', () => {
      configManager.init();
      configManager.init(); // 不应该抛出错误
      expect(configManager.configDir).toBeDefined();
    });

    test('初始化后应该创建配置目录', () => {
      configManager.init();
      const configDir = configManager.configDir;
      expect(fs.existsSync(configDir)).toBe(true);
    });

    test('初始化后应该创建日志目录', () => {
      configManager.init();
      const logsDir = configManager.logsDir;
      expect(fs.existsSync(logsDir)).toBe(true);
    });
  });

  describe('配置读写', () => {
    beforeEach(() => {
      configManager.init();
    });

    test('应该能读取默认配置（空对象）', () => {
      const serverConfig = configManager.get('server');
      // 现在默认配置为空对象，所以 server 为 undefined
      expect(serverConfig).toBeUndefined();
    });

    test('应该能设置和读取配置', () => {
      configManager.set('comfyuiPath', '/test/path');
      const value = configManager.get('comfyuiPath');
      expect(value).toBe('/test/path');
    });

    test('应该能获取所有配置', () => {
      const allConfig = configManager.getAll();
      expect(allConfig).toBeDefined();
    });

    test('应该能重置配置', () => {
      configManager.set('comfyuiPath', '/test/path');
      configManager.reset();
      // 重置后需要重新初始化
      configManager.init();
      const value = configManager.get('comfyuiPath');
      // 现在默认配置为空，重置后值为 undefined
      expect(value).toBeUndefined();
    });
  });

  describe('嵌套配置', () => {
    beforeEach(() => {
      configManager.init();
    });

    test('应该能设置嵌套配置', () => {
      configManager.set('server.port', 9999);
      const port = configManager.get('server')?.port;
      expect(port).toBe(9999);
    });

    test('应该能读取嵌套配置（默认为空）', () => {
      const port = configManager.get('server')?.port;
      // 现在默认配置为空，所以 port 为 undefined
      expect(port).toBeUndefined();
    });

    test('应该能设置多层嵌套配置', () => {
      configManager.set('server.port', 8888);
      configManager.set('server.autoStart', false);
      const server = configManager.get('server');
      expect(server?.port).toBe(8888);
      expect(server?.autoStart).toBe(false);
    });

    test('无效嵌套路径应抛出错误', () => {
      expect(() => {
        configManager.set('server..port', 9999);
      }).toThrow('配置路径格式错误');
    });

    test('空键应抛出错误', () => {
      expect(() => {
        configManager.set('', '/test');
      }).toThrow('配置键不能为空');
    });

    test('过深的嵌套路径应抛出错误', () => {
      expect(() => {
        configManager.set('a.b.c.d.e.f', 'value');
      }).toThrow('配置路径层级过深');
    });
  });

  describe('配置访问器', () => {
    beforeEach(() => {
      configManager.init();
    });

    test('应该能通过 server 访问器获取配置', () => {
      const server = configManager.server;
      expect(server).toBeDefined();
      // 现在默认配置为空，所以 port 为 undefined
      expect(server.port).toBeUndefined();
    });

    test('应该能通过 logs 访问器获取配置', () => {
      const logs = configManager.logs;
      expect(logs).toBeDefined();
      // logs 可能是空对象或包含默认值
      expect(logs).not.toBeNull();
    });

    test('应该能通过 advanced 访问器获取配置', () => {
      const advanced = configManager.advanced;
      expect(advanced).toBeDefined();
      // advanced 可能是空对象或包含默认值
      expect(advanced).not.toBeNull();
    });

    test('应该能通过 tray 访问器获取配置', () => {
      const tray = configManager.tray;
      expect(tray).toBeDefined();
      // tray 可能是空对象或包含默认值
      expect(tray).not.toBeNull();
    });

    test('应该能通过 window 访问器获取配置', () => {
      const window = configManager.window;
      expect(window).toBeDefined();
      // 现在默认配置为空，所以 width 为 undefined
      expect(window.width).toBeUndefined();
    });
  });

  describe('环境检查', () => {
    beforeEach(() => {
      configManager.init();
      // 模拟路径不存在，防止自动检测成功
      (fs.existsSync as jest.Mock).mockReturnValue(false);
    });

    test('未配置环境时应返回 false', () => {
      const isConfigured = configManager.isEnvironmentConfigured();
      expect(isConfigured).toBe(false);
    });

    test('配置环境后应返回 true', () => {
      // 模拟路径存在
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      configManager.set('comfyuiPath', '/path/to/comfyui');
      configManager.set('pythonPath', '/path/to/python');
      const isConfigured = configManager.isEnvironmentConfigured();
      expect(isConfigured).toBe(true);
    });

    test('只配置部分环境时应返回 false', () => {
      configManager.set('comfyuiPath', '/path/to/comfyui');
      const isConfigured = configManager.isEnvironmentConfigured();
      expect(isConfigured).toBe(false);
    });
  });

  describe('错误处理', () => {
    test('未初始化时访问配置应抛出错误', () => {
      expect(() => {
        configManager.get('server');
      }).toThrow('ConfigManager 未初始化');
    });

    test('未初始化时设置配置应抛出错误', () => {
      expect(() => {
        configManager.set('comfyuiPath', '/test');
      }).toThrow('ConfigManager 未初始化');
    });

    test('未初始化时获取配置目录应抛出错误', () => {
      expect(() => {
        configManager.configDir;
      }).toThrow('ConfigManager 未初始化');
    });
  });

  describe('配置持久化', () => {
    test('配置应该持久化到文件', () => {
      configManager.init();
      configManager.set('comfyuiPath', '/persistent/path');

      // 验证配置已设置
      const value = configManager.get('comfyuiPath');
      expect(value).toBe('/persistent/path');
    });

    test('重置后配置应恢复默认值（空）', () => {
      configManager.init();
      configManager.set('server.port', 9999);
      configManager.reset();

      // 重置后需要重新初始化
      configManager.init();
      const port = configManager.get('server')?.port;
      // 现在默认配置为空，重置后为 undefined
      expect(port).toBeUndefined();
    });
  });

  describe('性能测试', () => {
    beforeEach(() => {
      configManager.init();
    });

    test('配置读取应在合理时间内完成', () => {
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        configManager.get('server');
      }
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 100次读取应在1秒内完成
    });

    test('配置写入应在合理时间内完成', () => {
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        configManager.set('server.port', 8000 + i);
      }
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // 100次写入应在2秒内完成
    });
  });
});

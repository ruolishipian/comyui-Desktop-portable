/**
 * ConfigManager 测试
 * 测试配置管理器的初始化、读写、验证等功能
 */

import { ConfigManager, DEFAULT_CONFIG } from '../../../mocks/config-manager.mock';

describe('ConfigManager 测试', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager();
  });

  afterEach(() => {
    configManager.reset();
  });

  describe('初始化', () => {
    test('应该成功初始化', () => {
      configManager.init();
      expect(configManager.configDir).toBe('/mock/app/config');
      expect(configManager.logsDir).toBe('/mock/app/logs');
    });

    test('重复初始化应被忽略', () => {
      configManager.init();
      const firstConfigDir = configManager.configDir;

      configManager.init();
      expect(configManager.configDir).toBe(firstConfigDir);
    });

    test('未初始化时访问配置应抛出错误', () => {
      expect(() => configManager.get('server')).toThrow('ConfigManager 未初始化');
    });

    test('未初始化时设置配置应抛出错误', () => {
      expect(() => configManager.set('server.port', 8188)).toThrow('ConfigManager 未初始化');
    });
  });

  describe('配置读取', () => {
    beforeEach(() => {
      configManager.init();
    });

    test('应该正确读取顶层配置', () => {
      const serverConfig = configManager.get('server');
      expect(serverConfig).toBeDefined();
      // 现在默认配置为空，所以 port 可能为 undefined
      expect(serverConfig?.port).toBeUndefined();
    });

    test('应该正确读取嵌套配置', () => {
      configManager.set('server.port', 9999);
      expect(configManager.get('server')?.port).toBe(9999);
    });

    test('应该正确获取所有配置', () => {
      const allConfig = configManager.getAll();
      expect(allConfig).toHaveProperty('server');
      expect(allConfig).toHaveProperty('window');
      expect(allConfig).toHaveProperty('logs');
    });
  });

  describe('配置写入', () => {
    beforeEach(() => {
      configManager.init();
    });

    test('应该正确写入顶层配置', () => {
      configManager.set('comfyuiPath', '/path/to/comfyui');
      expect(configManager.get('comfyuiPath')).toBe('/path/to/comfyui');
    });

    test('应该正确写入嵌套配置', () => {
      configManager.set('server.port', 9999);
      expect(configManager.get('server')?.port).toBe(9999);
    });

    test('空键应抛出错误', () => {
      expect(() => configManager.set('', 'value')).toThrow('配置键不能为空');
    });

    test('空路径部分应抛出错误', () => {
      expect(() => configManager.set('server..port', 8188)).toThrow('配置路径格式错误');
      expect(() => configManager.set('.port', 8188)).toThrow('配置路径格式错误');
      expect(() => configManager.set('server.', 8188)).toThrow('配置路径格式错误');
    });

    test('过深路径应抛出错误', () => {
      expect(() => configManager.set('a.b.c.d.e.f', 'value')).toThrow('配置路径层级过深');
    });
  });

  describe('便捷属性', () => {
    beforeEach(() => {
      configManager.init();
    });

    test('应该正确获取服务器配置', () => {
      const server = configManager.server;
      // 现在默认配置为空，所以这些值可能为 undefined
      expect(server?.port).toBeUndefined();
      expect(server?.autoStart).toBeUndefined();
    });

    test('应该正确获取日志配置', () => {
      const logs = configManager.logs;
      // 日志配置现在有默认值
      expect(logs?.enable).toBe(true);
      expect(logs?.realtime).toBe(true);
      expect(logs?.level).toBe('info');
    });

    test('应该正确获取高级配置', () => {
      const advanced = configManager.advanced;
      // 现在默认配置为空，所以这些值可能为 undefined
      expect(advanced?.singleInstance).toBeUndefined();
    });

    test('应该正确获取托盘配置', () => {
      const tray = configManager.tray;
      // 现在默认配置为空，所以这些值可能为 undefined
      expect(tray?.minimizeToTray).toBeUndefined();
    });

    test('应该正确获取窗口配置', () => {
      const window = configManager.window;
      // 现在默认配置为空，所以这些值可能为 undefined
      expect(window?.width).toBeUndefined();
      expect(window?.height).toBeUndefined();
    });
  });

  describe('环境检查', () => {
    beforeEach(() => {
      configManager.init();
    });

    test('未配置路径时应返回 false', () => {
      expect(configManager.isEnvironmentConfigured()).toBe(false);
    });

    test('配置路径后应返回 true', () => {
      configManager.set('comfyuiPath', '/path/to/comfyui');
      configManager.set('pythonPath', '/path/to/python');
      expect(configManager.isEnvironmentConfigured()).toBe(true);
    });

    test('只配置一个路径应返回 false', () => {
      configManager.set('comfyuiPath', '/path/to/comfyui');
      expect(configManager.isEnvironmentConfigured()).toBe(false);
    });
  });

  describe('重置功能', () => {
    beforeEach(() => {
      configManager.init();
    });

    test('重置应清除所有配置', () => {
      configManager.set('server.port', 9999);
      configManager.set('comfyuiPath', '/test/path');

      configManager.reset();

      // 重置后需要重新初始化
      configManager.init();
      // 现在默认配置为空，所以重置后 port 为 undefined
      expect(configManager.get('server')?.port).toBeUndefined();
    });
  });

  describe('默认配置', () => {
    test('默认配置应为空对象', () => {
      // 现在默认配置为空对象，所有值都从环境变量或设置界面获取
      expect(DEFAULT_CONFIG).toEqual({});
    });

    test('默认配置不再包含硬编码值', () => {
      // 验证默认配置不包含任何硬编码的默认值
      expect(DEFAULT_CONFIG.server).toBeUndefined();
      expect(DEFAULT_CONFIG.window).toBeUndefined();
      expect(DEFAULT_CONFIG.logs).toBeUndefined();
      expect(DEFAULT_CONFIG.tray).toBeUndefined();
      expect(DEFAULT_CONFIG.advanced).toBeUndefined();
    });
  });
});

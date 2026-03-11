/**
 * 配置读写测试
 * 测试配置的持久化、读取、默认值、更新
 */

import { MockElectronStore } from '../../../mocks/electron-store.mock';
import { DEFAULT_CONFIG } from '../../../../src/modules/config';

describe('配置读写测试', () => {
  let store: MockElectronStore;

  beforeEach(() => {
    store = new MockElectronStore({ defaults: DEFAULT_CONFIG });
  });

  afterEach(() => {
    store.clear();
  });

  describe('配置初始化', () => {
    test('应该使用默认配置初始化（现在为空对象）', () => {
      // 现在默认配置为空对象，所以这些值应该为 undefined
      expect(store.get('server.port')).toBeUndefined();
      expect(store.get('server.autoStart')).toBeUndefined();
      expect(store.get('window.width')).toBeUndefined();
    });

    test('应该正确加载自定义默认配置', () => {
      const customDefaults = {
        server: {
          port: 9999
        }
      };

      const customStore = new MockElectronStore({ defaults: customDefaults });
      expect(customStore.get('server.port')).toBe(9999);
    });
  });

  describe('配置读取', () => {
    test('应该正确读取顶层配置（现在为空）', () => {
      // 现在默认配置为空，所以这些值应该为 undefined
      expect(store.get('comfyuiPath')).toBeUndefined();
      expect(store.get('pythonPath')).toBeUndefined();
    });

    test('应该正确读取嵌套配置（现在为空）', () => {
      // 现在默认配置为空，所以这些值应该为 undefined
      expect(store.get('server.port')).toBeUndefined();
      expect(store.get('server.autoStart')).toBeUndefined();
      expect(store.get('window.width')).toBeUndefined();
    });

    test('读取不存在的配置应返回 undefined', () => {
      expect(store.get('nonexistent')).toBeUndefined();
      expect(store.get('server.nonexistent')).toBeUndefined();
    });

    test('应该正确读取整个配置对象（现在为空）', () => {
      const allConfig = store.store;
      // 现在默认配置为空对象
      expect(allConfig).toEqual({});
    });
  });

  describe('配置写入', () => {
    test('应该正确写入顶层配置', () => {
      store.set('comfyuiPath', '/path/to/comfyui');
      expect(store.get('comfyuiPath')).toBe('/path/to/comfyui');
    });

    test('应该正确写入嵌套配置', () => {
      store.set('server.port', 9999);
      expect(store.get('server.port')).toBe(9999);

      store.set('window.width', 1920);
      expect(store.get('window.width')).toBe(1920);
    });

    test('写入配置不应影响其他配置', () => {
      // 先设置一些配置
      store.set('server.port', 8188);
      store.set('server.autoStart', true);

      const originalAutoStart = store.get('server.autoStart');

      store.set('server.port', 9999);

      expect(store.get('server.port')).toBe(9999);
      expect(store.get('server.autoStart')).toBe(originalAutoStart);
    });

    test('应该正确覆盖整个配置对象', () => {
      const newConfig = {
        server: {
          port: 7777
        }
      };

      store.store = newConfig;
      expect(store.get('server.port')).toBe(7777);
    });
  });

  describe('配置更新', () => {
    test('应该正确更新单个配置项', () => {
      store.set('server.port', 8188);
      store.set('server.port', 9999);

      expect(store.get('server.port')).toBe(9999);
    });

    test('应该正确更新多个配置项', () => {
      store.set('server.port', 9999);
      store.set('server.autoStart', false);
      store.set('window.width', 1920);

      expect(store.get('server.port')).toBe(9999);
      expect(store.get('server.autoStart')).toBe(false);
      expect(store.get('window.width')).toBe(1920);
    });

    test('更新配置应立即生效', () => {
      store.set('server.port', 9999);
      expect(store.get('server.port')).toBe(9999);

      store.set('server.port', 8888);
      expect(store.get('server.port')).toBe(8888);
    });
  });

  describe('配置删除', () => {
    test('应该正确删除配置项', () => {
      // 先设置配置
      store.set('server.port', 8188);
      store.delete('server.port');

      expect(store.get('server.port')).toBeUndefined();
    });

    test('删除不存在的配置项应正常处理', () => {
      expect(() => {
        store.delete('nonexistent');
      }).not.toThrow();
    });

    test('删除配置项不应影响其他配置', () => {
      // 先设置配置
      store.set('server.port', 8188);
      store.set('server.autoStart', true);

      store.delete('server.port');

      expect(store.get('server.port')).toBeUndefined();
      expect(store.get('server.autoStart')).toBe(true);
    });
  });

  describe('配置重置', () => {
    test('应该正确重置所有配置', () => {
      store.set('server.port', 9999);
      store.set('window.width', 1920);

      store.clear();

      expect(store.get('server.port')).toBeUndefined();
      expect(store.get('window.width')).toBeUndefined();
    });

    test('重置后应能重新设置配置', () => {
      store.set('server.port', 9999);
      store.clear();
      store.set('server.port', 8188);

      expect(store.get('server.port')).toBe(8188);
    });
  });

  describe('配置持久化', () => {
    test('配置应持久化到存储', () => {
      store.set('server.port', 9999);

      // 模拟重新加载
      const internalStore = store._getInternalStore();
      const newStore = new MockElectronStore();
      newStore._setInternalStore(internalStore);

      expect(newStore.get('server.port')).toBe(9999);
    });

    test('配置路径应正确', () => {
      expect(store.path).toBe('/mock/config/store.json');
    });
  });

  describe('配置检查', () => {
    test('应该正确检查配置是否存在', () => {
      // 先设置配置
      store.set('server.port', 8188);

      expect(store.has('server.port')).toBe(true);
      expect(store.has('nonexistent')).toBe(false);
    });

    test('应该正确检查嵌套配置是否存在', () => {
      // 先设置配置
      store.set('server.port', 8188);

      expect(store.has('server')).toBe(true);
      expect(store.has('server.port')).toBe(true);
      expect(store.has('server.nonexistent')).toBe(false);
    });
  });

  describe('边界情况', () => {
    test('应该正确处理 null 值', () => {
      store.set('server.modelDir', null);
      expect(store.get('server.modelDir')).toBeNull();
    });

    test('应该正确处理 undefined 值', () => {
      store.set('server.modelDir', undefined);
      expect(store.get('server.modelDir')).toBeUndefined();
    });

    test('应该正确处理空字符串', () => {
      store.set('server.modelDir', '');
      expect(store.get('server.modelDir')).toBe('');
    });

    test('应该正确处理零值', () => {
      store.set('server.port', 0);
      expect(store.get('server.port')).toBe(0);
    });

    test('应该正确处理布尔值 false', () => {
      store.set('server.autoStart', false);
      expect(store.get('server.autoStart')).toBe(false);
    });
  });
});

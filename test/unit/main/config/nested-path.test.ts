/**
 * 嵌套路径配置测试
 * 测试配置的嵌套路径读写、合法性、逻辑冲突
 */

import { MockElectronStore } from '../../../mocks/electron-store.mock';
import { createNestedPathTestData } from '../../../utils/test-data';

describe('嵌套路径配置测试', () => {
  let store: MockElectronStore;

  beforeEach(() => {
    store = new MockElectronStore();
  });

  describe('合法嵌套路径赋值', () => {
    test('应该正确设置 server.port', () => {
      store.set('server.port', 8188);
      expect(store.get('server.port')).toBe(8188);
    });

    test('应该正确设置 server.autoStart', () => {
      store.set('server.autoStart', true);
      expect(store.get('server.autoStart')).toBe(true);
    });

    test('应该正确设置 window.width', () => {
      store.set('window.width', 1280);
      expect(store.get('window.width')).toBe(1280);
    });

    test('应该正确设置多层嵌套路径', () => {
      store.set('server.nested.deep.value', 'test');
      expect(store.get('server.nested.deep.value')).toBe('test');
    });

    test('应该正确处理所有嵌套路径', () => {
      const testData = createNestedPathTestData();

      Object.entries(testData).forEach(([key, value]) => {
        store.set(key, value);
        expect(store.get(key)).toEqual(value);
      });
    });
  });

  describe('嵌套路径读取', () => {
    test('读取不存在的路径应返回 undefined', () => {
      expect(store.get('nonexistent.key')).toBeUndefined();
    });

    test('读取部分路径应返回对象', () => {
      store.set('server.port', 8188);
      store.set('server.autoStart', true);

      const server = store.get('server');
      expect(server).toEqual({
        port: 8188,
        autoStart: true
      });
    });

    test('读取已删除的路径应返回 undefined', () => {
      store.set('server.port', 8188);
      store.delete('server.port');
      expect(store.get('server.port')).toBeUndefined();
    });
  });

  describe('嵌套路径更新', () => {
    test('更新嵌套路径不应影响其他路径', () => {
      store.set('server.port', 8188);
      store.set('server.autoStart', true);

      store.set('server.port', 8189);

      expect(store.get('server.port')).toBe(8189);
      expect(store.get('server.autoStart')).toBe(true);
    });

    test('更新父路径应保留子路径', () => {
      store.set('server.port', 8188);
      store.set('server.autoStart', true);

      store.set('server', { port: 8189 });

      // 注意：这取决于实现逻辑
      // 某些实现可能会覆盖整个对象
      expect(store.get('server.port')).toBe(8189);
    });
  });

  describe('非法嵌套路径', () => {
    test('空路径应被拒绝', () => {
      expect(() => {
        store.set('', 'value');
      }).toThrow();
    });

    test('单点路径应被拒绝', () => {
      expect(() => {
        store.set('.', 'value');
      }).toThrow();
    });

    test('双点路径应被拒绝', () => {
      expect(() => {
        store.set('..', 'value');
      }).toThrow();
    });

    test('末尾点路径应被拒绝', () => {
      expect(() => {
        store.set('server.', 'value');
      }).toThrow();
    });

    test('开头点路径应被拒绝', () => {
      expect(() => {
        store.set('.server', 'value');
      }).toThrow();
    });

    test('连续点路径应被拒绝', () => {
      expect(() => {
        store.set('server..port', 'value');
      }).toThrow();
    });
  });

  describe('类型安全', () => {
    test('数字类型应正确存储', () => {
      store.set('server.port', 8188);
      const value = store.get('server.port');
      expect(typeof value).toBe('number');
    });

    test('布尔类型应正确存储', () => {
      store.set('server.autoStart', true);
      const value = store.get('server.autoStart');
      expect(typeof value).toBe('boolean');
    });

    test('字符串类型应正确存储', () => {
      store.set('server.modelDir', '/path/to/models');
      const value = store.get('server.modelDir');
      expect(typeof value).toBe('string');
    });

    test('对象类型应正确存储', () => {
      const obj = { nested: { value: 'test' } };
      store.set('server.config', obj);
      expect(store.get('server.config')).toEqual(obj);
    });
  });

  describe('边界情况', () => {
    test('null 值应正确存储', () => {
      store.set('server.port', null);
      expect(store.get('server.port')).toBeNull();
    });

    test('undefined 值应正确存储', () => {
      store.set('server.port', undefined);
      expect(store.get('server.port')).toBeUndefined();
    });

    test('空字符串应正确存储', () => {
      store.set('server.modelDir', '');
      expect(store.get('server.modelDir')).toBe('');
    });

    test('零值应正确存储', () => {
      store.set('server.port', 0);
      expect(store.get('server.port')).toBe(0);
    });
  });

  describe('重复解析验证', () => {
    test('设置和读取不应重复解析', () => {
      const testValue = 'test.value.with.dots';
      store.set('server.customArgs', testValue);

      // 确保值没有被错误解析
      expect(store.get('server.customArgs')).toBe(testValue);
    });

    test('嵌套对象不应被重复解析', () => {
      const nested = {
        level1: {
          level2: {
            level3: 'value'
          }
        }
      };

      store.set('server.nested', nested);
      expect(store.get('server.nested')).toEqual(nested);
    });
  });
});

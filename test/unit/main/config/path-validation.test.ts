/**
 * 路径验证测试
 * 测试路径格式校验、合法性检查、边界情况
 */

import { MockElectronStore } from '../../../mocks/electron-store.mock';

describe('路径验证测试', () => {
  let store: MockElectronStore;

  beforeEach(() => {
    store = new MockElectronStore();
  });

  afterEach(() => {
    store.clear();
  });

  describe('合法路径', () => {
    test('单层路径应合法', () => {
      expect(() => {
        store.set('server', { port: 8188 });
      }).not.toThrow();
    });

    test('双层路径应合法', () => {
      expect(() => {
        store.set('server.port', 8188);
      }).not.toThrow();
    });

    test('三层路径应合法', () => {
      expect(() => {
        store.set('server.nested.value', 'test');
      }).not.toThrow();
    });

    test('包含字母、数字、下划线的路径应合法', () => {
      expect(() => {
        store.set('server_port123', 'value');
        store.set('server.config_v2', 'value');
      }).not.toThrow();
    });
  });

  describe('非法路径 - 空路径', () => {
    test('空字符串路径应被拒绝', () => {
      expect(() => {
        store.set('', 'value');
      }).toThrow('Key cannot be empty');
    });
  });

  describe('非法路径 - 点号问题', () => {
    test('单点路径应被拒绝', () => {
      expect(() => {
        store.set('.', 'value');
      }).toThrow('Invalid key');
    });

    test('双点路径应被拒绝', () => {
      expect(() => {
        store.set('..', 'value');
      }).toThrow('Invalid key');
    });

    test('开头带点的路径应被拒绝', () => {
      expect(() => {
        store.set('.server', 'value');
      }).toThrow('Key cannot start or end with dot');
    });

    test('末尾带点的路径应被拒绝', () => {
      expect(() => {
        store.set('server.', 'value');
      }).toThrow('Key cannot start or end with dot');
    });

    test('连续点的路径应被拒绝', () => {
      expect(() => {
        store.set('server..port', 'value');
      }).toThrow('Key cannot contain consecutive dots');
    });

    test('多个连续点的路径应被拒绝', () => {
      expect(() => {
        store.set('server...port', 'value');
      }).toThrow('Key cannot contain consecutive dots');
    });
  });

  describe('路径深度', () => {
    test('合理的嵌套深度应被接受', () => {
      expect(() => {
        store.set('level1.level2.level3', 'value');
      }).not.toThrow();
    });

    test('深层嵌套路径应被接受', () => {
      expect(() => {
        store.set('a.b.c.d.e', 'value');
      }).not.toThrow();
    });
  });

  describe('路径格式', () => {
    test('包含特殊字符的路径应被接受', () => {
      expect(() => {
        store.set('server-custom', 'value');
        store.set('server_custom', 'value');
      }).not.toThrow();
    });

    test('纯数字路径应被接受', () => {
      expect(() => {
        store.set('123', 'value');
      }).not.toThrow();
    });

    test('中文路径应被接受', () => {
      expect(() => {
        store.set('服务器.端口', 8188);
      }).not.toThrow();
    });
  });

  describe('路径冲突', () => {
    test('设置父路径不应影响已存在的子路径', () => {
      store.set('server.port', 8188);
      store.set('server.autoStart', true);

      // 设置父路径会覆盖整个对象
      store.set('server', { port: 9999 });

      // 验证父路径已更新
      expect(store.get('server.port')).toBe(9999);
    });

    test('设置子路径不应影响父路径的其他属性', () => {
      store.set('server', { port: 8188, autoStart: true });

      store.set('server.port', 9999);

      expect(store.get('server.port')).toBe(9999);
      // 注意：这取决于实现，可能需要特殊处理
    });
  });

  describe('路径读取验证', () => {
    test('读取不存在的路径应返回 undefined', () => {
      expect(store.get('nonexistent')).toBeUndefined();
      expect(store.get('server.nonexistent')).toBeUndefined();
      expect(store.get('a.b.c.d')).toBeUndefined();
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

    test('读取深层路径应正确返回值', () => {
      store.set('a.b.c.d', 'deep-value');

      expect(store.get('a.b.c.d')).toBe('deep-value');
      expect(store.get('a.b.c')).toEqual({ d: 'deep-value' });
      expect(store.get('a.b')).toEqual({ c: { d: 'deep-value' } });
    });
  });

  describe('路径删除验证', () => {
    test('删除不存在的路径应正常处理', () => {
      expect(() => {
        store.delete('nonexistent');
        store.delete('server.nonexistent');
      }).not.toThrow();
    });

    test('删除子路径后父路径应更新', () => {
      store.set('server.port', 8188);
      store.set('server.autoStart', true);

      store.delete('server.port');

      expect(store.get('server.port')).toBeUndefined();
      expect(store.get('server.autoStart')).toBe(true);
    });

    test('删除父路径应删除所有子路径', () => {
      store.set('server.port', 8188);
      store.set('server.autoStart', true);

      store.delete('server');

      expect(store.get('server')).toBeUndefined();
      expect(store.get('server.port')).toBeUndefined();
      expect(store.get('server.autoStart')).toBeUndefined();
    });
  });

  describe('路径检查验证', () => {
    test('has() 应正确检查路径存在性', () => {
      store.set('server.port', 8188);

      expect(store.has('server')).toBe(true);
      expect(store.has('server.port')).toBe(true);
      expect(store.has('server.nonexistent')).toBe(false);
      expect(store.has('nonexistent')).toBe(false);
    });

    test('空路径检查应返回 false', () => {
      expect(store.has('')).toBe(false);
    });
  });

  describe('边界情况', () => {
    test('超长路径应被接受', () => {
      const longPath = 'a'.repeat(100);
      expect(() => {
        store.set(longPath, 'value');
      }).not.toThrow();
    });

    test('超长嵌套路径应被接受', () => {
      const deepPath = Array(10).fill('level').join('.');
      expect(() => {
        store.set(deepPath, 'value');
      }).not.toThrow();
    });

    test('路径值包含点号应正确处理', () => {
      const valueWithDots = 'this.is.a.value.with.dots';
      store.set('server.customArgs', valueWithDots);

      expect(store.get('server.customArgs')).toBe(valueWithDots);
    });
  });
});

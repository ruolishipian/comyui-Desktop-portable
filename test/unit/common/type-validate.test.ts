/**
 * 类型验证测试
 * 测试类型检查、验证工具函数
 */

// Mock 类型验证工具函数
const typeValidate = {
  // 检查是否是数字
  isNumber: (value: any): value is number => {
    return typeof value === 'number' && !isNaN(value);
  },

  // 检查是否是字符串
  isString: (value: any): value is string => {
    return typeof value === 'string';
  },

  // 检查是否是布尔值
  isBoolean: (value: any): value is boolean => {
    return typeof value === 'boolean';
  },

  // 检查是否是对象
  isObject: (value: any): value is object => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  },

  // 检查是否是数组
  isArray: (value: any): value is any[] => {
    return Array.isArray(value);
  },

  // 检查是否是函数
  isFunction: (value: any): value is Function => {
    return typeof value === 'function';
  },

  // 检查是否是 null
  isNull: (value: any): value is null => {
    return value === null;
  },

  // 检查是否是 undefined
  isUndefined: (value: any): value is undefined => {
    return value === undefined;
  },

  // 检查是否是空值（null 或 undefined）
  isNullOrUndefined: (value: any): value is null | undefined => {
    return value === null || value === undefined;
  },

  // 检查是否是有效端口
  isValidPort: (value: any): value is number => {
    return typeValidate.isNumber(value) && value >= 1 && value <= 65535;
  },

  // 检查是否是有效路径
  isValidPath: (value: any): value is string => {
    return typeValidate.isString(value) && value.length > 0;
  },

  // 检查是否是有效 URL
  isValidUrl: (value: any): value is string => {
    if (!typeValidate.isString(value)) return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  // 检查是否是有效邮箱
  isValidEmail: (value: any): value is string => {
    if (!typeValidate.isString(value)) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  // 深度比较两个值是否相等
  deepEqual: (a: any, b: any): boolean => {
    if (a === b) return true;

    if (typeValidate.isNullOrUndefined(a) || typeValidate.isNullOrUndefined(b)) {
      return false;
    }

    if (typeValidate.isArray(a) && typeValidate.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => typeValidate.deepEqual(item, b[index]));
    }

    if (typeValidate.isObject(a) && typeValidate.isObject(b)) {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every(key => typeValidate.deepEqual((a as any)[key], (b as any)[key]));
    }

    return false;
  }
};

describe('类型验证测试', () => {
  describe('基础类型检查', () => {
    test('应正确识别数字', () => {
      expect(typeValidate.isNumber(123)).toBe(true);
      expect(typeValidate.isNumber(0)).toBe(true);
      expect(typeValidate.isNumber(-1)).toBe(true);
      expect(typeValidate.isNumber(1.5)).toBe(true);
      expect(typeValidate.isNumber(NaN)).toBe(false);
      expect(typeValidate.isNumber('123')).toBe(false);
    });

    test('应正确识别字符串', () => {
      expect(typeValidate.isString('hello')).toBe(true);
      expect(typeValidate.isString('')).toBe(true);
      expect(typeValidate.isString(123)).toBe(false);
    });

    test('应正确识别布尔值', () => {
      expect(typeValidate.isBoolean(true)).toBe(true);
      expect(typeValidate.isBoolean(false)).toBe(true);
      expect(typeValidate.isBoolean(1)).toBe(false);
      expect(typeValidate.isBoolean('true')).toBe(false);
    });

    test('应正确识别对象', () => {
      expect(typeValidate.isObject({})).toBe(true);
      expect(typeValidate.isObject({ a: 1 })).toBe(true);
      expect(typeValidate.isObject(null)).toBe(false);
      expect(typeValidate.isObject([])).toBe(false);
    });

    test('应正确识别数组', () => {
      expect(typeValidate.isArray([])).toBe(true);
      expect(typeValidate.isArray([1, 2, 3])).toBe(true);
      expect(typeValidate.isArray({})).toBe(false);
    });

    test('应正确识别函数', () => {
      expect(typeValidate.isFunction(() => {})).toBe(true);
      expect(typeValidate.isFunction(function () {})).toBe(true);
      expect(typeValidate.isFunction({})).toBe(false);
    });
  });

  describe('空值检查', () => {
    test('应正确识别 null', () => {
      expect(typeValidate.isNull(null)).toBe(true);
      expect(typeValidate.isNull(undefined)).toBe(false);
      expect(typeValidate.isNull(0)).toBe(false);
    });

    test('应正确识别 undefined', () => {
      expect(typeValidate.isUndefined(undefined)).toBe(true);
      expect(typeValidate.isUndefined(null)).toBe(false);
    });

    test('应正确识别 null 或 undefined', () => {
      expect(typeValidate.isNullOrUndefined(null)).toBe(true);
      expect(typeValidate.isNullOrUndefined(undefined)).toBe(true);
      expect(typeValidate.isNullOrUndefined(0)).toBe(false);
      expect(typeValidate.isNullOrUndefined('')).toBe(false);
    });
  });

  describe('特定类型验证', () => {
    test('应正确验证端口号', () => {
      expect(typeValidate.isValidPort(80)).toBe(true);
      expect(typeValidate.isValidPort(8080)).toBe(true);
      expect(typeValidate.isValidPort(65535)).toBe(true);
      expect(typeValidate.isValidPort(0)).toBe(false);
      expect(typeValidate.isValidPort(65536)).toBe(false);
      expect(typeValidate.isValidPort('8080')).toBe(false);
    });

    test('应正确验证路径', () => {
      expect(typeValidate.isValidPath('/path/to/file')).toBe(true);
      expect(typeValidate.isValidPath('relative/path')).toBe(true);
      expect(typeValidate.isValidPath('')).toBe(false);
      expect(typeValidate.isValidPath(null)).toBe(false);
    });

    test('应正确验证 URL', () => {
      expect(typeValidate.isValidUrl('http://example.com')).toBe(true);
      expect(typeValidate.isValidUrl('https://example.com')).toBe(true);
      expect(typeValidate.isValidUrl('invalid-url')).toBe(false);
      expect(typeValidate.isValidUrl(123)).toBe(false);
    });

    test('应正确验证邮箱', () => {
      expect(typeValidate.isValidEmail('test@example.com')).toBe(true);
      expect(typeValidate.isValidEmail('user.name@domain.co')).toBe(true);
      expect(typeValidate.isValidEmail('invalid-email')).toBe(false);
      expect(typeValidate.isValidEmail('test@')).toBe(false);
    });
  });

  describe('深度比较', () => {
    test('应正确比较原始值', () => {
      expect(typeValidate.deepEqual(1, 1)).toBe(true);
      expect(typeValidate.deepEqual('a', 'a')).toBe(true);
      expect(typeValidate.deepEqual(true, true)).toBe(true);
      expect(typeValidate.deepEqual(1, 2)).toBe(false);
    });

    test('应正确比较数组', () => {
      expect(typeValidate.deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(typeValidate.deepEqual([1, 2], [1, 2, 3])).toBe(false);
      expect(typeValidate.deepEqual([1, 2], [2, 1])).toBe(false);
    });

    test('应正确比较对象', () => {
      expect(typeValidate.deepEqual({ a: 1 }, { a: 1 })).toBe(true);
      expect(typeValidate.deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(typeValidate.deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    test('应正确比较嵌套结构', () => {
      const obj1 = { a: { b: { c: 1 } } };
      const obj2 = { a: { b: { c: 1 } } };
      const obj3 = { a: { b: { c: 2 } } };

      expect(typeValidate.deepEqual(obj1, obj2)).toBe(true);
      expect(typeValidate.deepEqual(obj1, obj3)).toBe(false);
    });

    test('应正确处理 null 和 undefined', () => {
      expect(typeValidate.deepEqual(null, null)).toBe(true);
      expect(typeValidate.deepEqual(undefined, undefined)).toBe(true);
      expect(typeValidate.deepEqual(null, undefined)).toBe(false);
    });
  });

  describe('边界情况', () => {
    test('应处理特殊数字', () => {
      expect(typeValidate.isNumber(Infinity)).toBe(true);
      expect(typeValidate.isNumber(-Infinity)).toBe(true);
      expect(typeValidate.isNumber(NaN)).toBe(false);
    });

    test('应处理空数组', () => {
      expect(typeValidate.isArray([])).toBe(true);
      expect(typeValidate.deepEqual([], [])).toBe(true);
    });

    test('应处理空对象', () => {
      expect(typeValidate.isObject({})).toBe(true);
      expect(typeValidate.deepEqual({}, {})).toBe(true);
    });

    test('应处理循环引用', () => {
      const obj: any = { a: 1 };
      obj.self = obj;

      // 循环引用不应导致栈溢出
      expect(() => typeValidate.deepEqual(obj, obj)).not.toThrow();
    });
  });
});

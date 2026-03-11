/**
 * 格式化工具测试
 * 测试数据格式化、转换工具函数
 */

// Mock 格式化工具函数
const formatUtils = {
  // 格式化文件大小
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  },

  // 格式化时间
  formatTime: (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  },

  // 格式化日期
  formatDate: (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  },

  // 格式化端口号
  formatPort: (port: number): string => {
    if (port < 1 || port > 65535) {
      throw new Error('端口号必须在 1-65535 之间');
    }
    return port.toString();
  },

  // 解析端口号
  parsePort: (portStr: string): number => {
    const port = parseInt(portStr, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error('无效的端口号');
    }
    return port;
  },

  // 格式化 JSON
  formatJson: (obj: any, indent: number = 2): string => {
    return JSON.stringify(obj, null, indent);
  },

  // 解析 JSON
  parseJson: (jsonStr: string): any => {
    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      throw new Error('无效的 JSON 格式');
    }
  }
};

describe('格式化工具测试', () => {
  describe('文件大小格式化', () => {
    test('应正确格式化字节', () => {
      expect(formatUtils.formatFileSize(0)).toBe('0 B');
      expect(formatUtils.formatFileSize(512)).toBe('512.00 B');
    });

    test('应正确格式化 KB', () => {
      expect(formatUtils.formatFileSize(1024)).toBe('1.00 KB');
      expect(formatUtils.formatFileSize(2048)).toBe('2.00 KB');
    });

    test('应正确格式化 MB', () => {
      expect(formatUtils.formatFileSize(1048576)).toBe('1.00 MB');
      expect(formatUtils.formatFileSize(5242880)).toBe('5.00 MB');
    });

    test('应正确格式化 GB', () => {
      expect(formatUtils.formatFileSize(1073741824)).toBe('1.00 GB');
    });
  });

  describe('时间格式化', () => {
    test('应正确格式化秒', () => {
      expect(formatUtils.formatTime(30)).toBe('0:30');
      expect(formatUtils.formatTime(59)).toBe('0:59');
    });

    test('应正确格式化分钟', () => {
      expect(formatUtils.formatTime(60)).toBe('1:00');
      expect(formatUtils.formatTime(90)).toBe('1:30');
    });

    test('应正确格式化小时', () => {
      expect(formatUtils.formatTime(3600)).toBe('1:00:00');
      expect(formatUtils.formatTime(3661)).toBe('1:01:01');
    });
  });

  describe('日期格式化', () => {
    test('应正确格式化日期', () => {
      const date = new Date('2024-01-15 10:30:45');
      expect(formatUtils.formatDate(date)).toBe('2024-01-15 10:30:45');
    });

    test('应正确处理个位数', () => {
      const date = new Date('2024-01-05 09:05:05');
      expect(formatUtils.formatDate(date)).toBe('2024-01-05 09:05:05');
    });
  });

  describe('端口号格式化', () => {
    test('应正确格式化端口号', () => {
      expect(formatUtils.formatPort(80)).toBe('80');
      expect(formatUtils.formatPort(8080)).toBe('8080');
      expect(formatUtils.formatPort(65535)).toBe('65535');
    });

    test('无效端口号应抛出错误', () => {
      expect(() => formatUtils.formatPort(0)).toThrow('端口号必须在 1-65535 之间');
      expect(() => formatUtils.formatPort(65536)).toThrow('端口号必须在 1-65535 之间');
    });
  });

  describe('端口号解析', () => {
    test('应正确解析端口号', () => {
      expect(formatUtils.parsePort('80')).toBe(80);
      expect(formatUtils.parsePort('8080')).toBe(8080);
    });

    test('无效端口号字符串应抛出错误', () => {
      expect(() => formatUtils.parsePort('abc')).toThrow('无效的端口号');
      expect(() => formatUtils.parsePort('0')).toThrow('无效的端口号');
      expect(() => formatUtils.parsePort('65536')).toThrow('无效的端口号');
    });
  });

  describe('JSON 格式化', () => {
    test('应正确格式化 JSON', () => {
      const obj = { name: 'test', value: 123 };
      const result = formatUtils.formatJson(obj);
      expect(result).toContain('"name": "test"');
      expect(result).toContain('"value": 123');
    });

    test('应支持自定义缩进', () => {
      const obj = { a: 1 };
      const result = formatUtils.formatJson(obj, 4);
      expect(result).toContain('    "a"');
    });
  });

  describe('JSON 解析', () => {
    test('应正确解析 JSON', () => {
      const result = formatUtils.parseJson('{"name":"test"}');
      expect(result).toEqual({ name: 'test' });
    });

    test('无效 JSON 应抛出错误', () => {
      expect(() => formatUtils.parseJson('invalid json')).toThrow('无效的 JSON 格式');
    });
  });

  describe('边界情况', () => {
    test('应处理超大文件大小', () => {
      const tb = 1099511627776; // 1 TB
      expect(formatUtils.formatFileSize(tb)).toBe('1.00 TB');
    });

    test('应处理超大时间值', () => {
      expect(formatUtils.formatTime(86400)).toBe('24:00:00');
    });

    test('应处理嵌套 JSON', () => {
      const nested = { a: { b: { c: 1 } } };
      const result = formatUtils.formatJson(nested);
      expect(result).toContain('"c"');
    });
  });
});

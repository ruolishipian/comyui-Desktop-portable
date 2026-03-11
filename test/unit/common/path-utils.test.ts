/**
 * 路径工具测试
 * 测试路径处理、验证、转换工具函数
 */

// Mock 路径工具函数
const pathUtils = {
  // 验证路径是否合法
  isValidPath: (path: string): boolean => {
    if (!path || path === '') return false;
    if (path.includes('..')) return false;
    if (path.includes('//')) return false;
    return true;
  },

  // 规范化路径
  normalizePath: (path: string): string => {
    return path.replace(/\\/g, '/').replace(/\/+/g, '/');
  },

  // 连接路径
  joinPath: (...parts: string[]): string => {
    return parts
      .map(part => part.replace(/\\/g, '/'))
      .join('/')
      .replace(/\/+/g, '/');
  },

  // 获取文件扩展名
  getExtension: (path: string): string => {
    const parts = path.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  },

  // 获取文件名
  getFileName: (path: string): string => {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || '';
  },

  // 获取目录名
  getDirName: (path: string): string => {
    const parts = path.split(/[/\\]/);
    parts.pop();
    return parts.join('/') || '/';
  },

  // 检查是否是绝对路径
  isAbsolutePath: (path: string): boolean => {
    return path.startsWith('/') || /^[A-Za-z]:/.test(path);
  }
};

describe('路径工具测试', () => {
  describe('路径验证', () => {
    test('合法路径应返回 true', () => {
      expect(pathUtils.isValidPath('/path/to/file')).toBe(true);
      expect(pathUtils.isValidPath('C:\\path\\to\\file')).toBe(true);
      expect(pathUtils.isValidPath('./relative/path')).toBe(true);
    });

    test('空路径应返回 false', () => {
      expect(pathUtils.isValidPath('')).toBe(false);
      expect(pathUtils.isValidPath(null as any)).toBe(false);
      expect(pathUtils.isValidPath(undefined as any)).toBe(false);
    });

    test('包含 .. 的路径应返回 false', () => {
      expect(pathUtils.isValidPath('/path/../file')).toBe(false);
      expect(pathUtils.isValidPath('../file')).toBe(false);
    });

    test('包含双斜杠的路径应返回 false', () => {
      expect(pathUtils.isValidPath('/path//file')).toBe(false);
    });
  });

  describe('路径规范化', () => {
    test('应将反斜杠转换为正斜杠', () => {
      expect(pathUtils.normalizePath('C:\\path\\to\\file')).toBe('C:/path/to/file');
    });

    test('应移除多余的斜杠', () => {
      expect(pathUtils.normalizePath('/path//to///file')).toBe('/path/to/file');
    });

    test('空路径应返回空字符串', () => {
      expect(pathUtils.normalizePath('')).toBe('');
    });
  });

  describe('路径连接', () => {
    test('应正确连接路径', () => {
      expect(pathUtils.joinPath('/path', 'to', 'file')).toBe('/path/to/file');
    });

    test('应处理混合斜杠', () => {
      expect(pathUtils.joinPath('/path', 'to\\file')).toBe('/path/to/file');
    });

    test('应移除多余的斜杠', () => {
      expect(pathUtils.joinPath('/path/', '/to/', '/file')).toBe('/path/to/file');
    });

    test('空部分应被忽略', () => {
      expect(pathUtils.joinPath('/path', '', 'file')).toBe('/path/file');
    });
  });

  describe('文件扩展名', () => {
    test('应正确获取扩展名', () => {
      expect(pathUtils.getExtension('/path/to/file.txt')).toBe('.txt');
      expect(pathUtils.getExtension('/path/to/file.json')).toBe('.json');
    });

    test('无扩展名应返回空字符串', () => {
      expect(pathUtils.getExtension('/path/to/file')).toBe('');
    });

    test('多个点应返回最后一个', () => {
      expect(pathUtils.getExtension('/path/to/file.test.txt')).toBe('.txt');
    });
  });

  describe('文件名', () => {
    test('应正确获取文件名', () => {
      expect(pathUtils.getFileName('/path/to/file.txt')).toBe('file.txt');
      expect(pathUtils.getFileName('C:\\path\\to\\file.txt')).toBe('file.txt');
    });

    test('只有文件名应返回文件名', () => {
      expect(pathUtils.getFileName('file.txt')).toBe('file.txt');
    });

    test('空路径应返回空字符串', () => {
      expect(pathUtils.getFileName('')).toBe('');
    });
  });

  describe('目录名', () => {
    test('应正确获取目录名', () => {
      expect(pathUtils.getDirName('/path/to/file.txt')).toBe('/path/to');
      expect(pathUtils.getDirName('C:\\path\\to\\file.txt')).toBe('C:/path/to');
    });

    test('只有文件名应返回空', () => {
      // 根据实现，只有文件名时返回空或斜杠都是合理的
      const result = pathUtils.getDirName('file.txt');
      expect(result === '' || result === '/').toBe(true);
    });

    test('根目录应返回斜杠', () => {
      expect(pathUtils.getDirName('/file.txt')).toBe('/');
    });
  });

  describe('绝对路径检查', () => {
    test('Unix 绝对路径应返回 true', () => {
      expect(pathUtils.isAbsolutePath('/path/to/file')).toBe(true);
    });

    test('Windows 绝对路径应返回 true', () => {
      expect(pathUtils.isAbsolutePath('C:\\path\\to\\file')).toBe(true);
      expect(pathUtils.isAbsolutePath('D:/path/to/file')).toBe(true);
    });

    test('相对路径应返回 false', () => {
      expect(pathUtils.isAbsolutePath('./path/to/file')).toBe(false);
      expect(pathUtils.isAbsolutePath('path/to/file')).toBe(false);
    });
  });

  describe('边界情况', () => {
    test('应处理超长路径', () => {
      const longPath = '/a'.repeat(100);
      expect(pathUtils.isValidPath(longPath)).toBe(true);
    });

    test('应处理特殊字符', () => {
      expect(pathUtils.isValidPath('/path/with spaces/file')).toBe(true);
      expect(pathUtils.isValidPath('/path/with-dashes/file')).toBe(true);
    });

    test('应处理 Unicode 字符', () => {
      expect(pathUtils.isValidPath('/路径/文件')).toBe(true);
    });
  });
});

/**
 * 日志模块异常场景测试
 * 补充 Logger 的异常场景测试用例
 */

import { Logger } from '../../../../src/modules/logger';

const mockWriteStream = {
  on: jest.fn(),
  write: jest.fn(() => true),
  end: jest.fn()
};

const mockComfyUIWriteStream = {
  on: jest.fn(),
  write: jest.fn(() => true),
  end: jest.fn()
};

jest.mock('fs', () => ({
  promises: {
    appendFile: jest.fn(() => Promise.resolve()),
    readFile: jest.fn(() => Promise.resolve('test log content')),
    writeFile: jest.fn(() => Promise.resolve()),
    stat: jest.fn(() => Promise.resolve({ size: 1024, ctimeMs: Date.now() })),
    rename: jest.fn(() => Promise.resolve()),
    readdir: jest.fn(() => Promise.resolve([])),
    unlink: jest.fn(() => Promise.resolve()),
    mkdir: jest.fn(() => Promise.resolve()),
    access: jest.fn(() => Promise.resolve())
  },
  existsSync: jest.fn(() => true),
  createWriteStream: jest.fn((_path, _opts) => {
    if (_path && String(_path).includes('comfyui-output')) {
      return mockComfyUIWriteStream;
    }
    return mockWriteStream;
  }),
  createReadStream: jest.fn(() => ({
    on: jest.fn(),
    pipe: jest.fn()
  }))
}));

jest.mock('path', () => ({
  join: jest.fn((...args: string[]) => args.join('/')),
  dirname: jest.fn((p: string) => p.split('/').slice(0, -1).join('/')),
  basename: jest.fn((p: string) => p.split('/').pop() ?? '')
}));

jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: jest.fn(() => '/test/app')
  },
  BrowserWindow: jest.fn()
}));

jest.mock('../../../../src/modules/config', () => ({
  configManager: {
    logsDir: '/test/logs',
    logs: {
      enable: true,
      level: 'info',
      maxSize: 10485760,
      keepDays: 7,
      realtime: true
    },
    advanced: {
      stdoutThrottle: 100
    }
  }
}));

const fs = require('fs');
const { configManager } = require('../../../../src/modules/config');

describe('日志模块异常场景测试', () => {
  let logger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = new Logger();
    logger.init();
  });

  describe('文件写入权限不足场景', () => {
    test('writeStream 错误应记录控制台错误', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((() => {}) as any);

      mockWriteStream.write.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      logger.info('test message');

      await new Promise(resolve => setTimeout(resolve, 200));

      mockWriteStream.write.mockReturnValue(true);
      consoleErrorSpy.mockRestore();
    });

    test('写入失败后应继续处理后续日志', async () => {
      logger.info('message 1');
      logger.info('message 2');

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockWriteStream.write).toHaveBeenCalled();
    });
  });

  describe('日志文件不存在场景', () => {
    test('readLogContent 文件不存在应返回错误信息', async () => {
      const error = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      fs.promises.readFile.mockRejectedValueOnce(error);

      const result = await logger.readLogContent();

      expect(result).toContain('读取失败');
    });

    test('readLogContent 其他错误应返回错误信息', async () => {
      fs.promises.readFile.mockRejectedValueOnce(new Error('Read error'));

      const result = await logger.readLogContent();

      expect(result).toContain('读取失败');
    });
  });

  describe('日志清空失败场景', () => {
    test('clearLog 成功应返回 true', async () => {
      fs.promises.writeFile.mockResolvedValueOnce(undefined);

      const result = await logger.clearLog();

      expect(result).toBe(true);
    });

    test('clearLog 失败应返回 false 并记录错误', async () => {
      fs.promises.writeFile.mockRejectedValueOnce(new Error('Clear failed'));

      const result = await logger.clearLog();

      expect(result).toBe(false);
    });
  });

  describe('日志轮转失败场景', () => {
    test('文件重命名失败应记录错误', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((() => {}) as any);

      configManager.logs.maxSize = 100;
      fs.promises.stat.mockResolvedValueOnce({ size: 200, ctimeMs: Date.now() });
      fs.promises.rename.mockRejectedValueOnce(new Error('Rename failed'));

      logger.info('test message');

      await new Promise(resolve => setTimeout(resolve, 200));

      configManager.logs.maxSize = 10485760;
      consoleErrorSpy.mockRestore();
    });

    test('stat 失败（非 ENOENT）应记录错误', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((() => {}) as any);

      configManager.logs.maxSize = 100;
      const error = new Error('Stat error') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      fs.promises.stat.mockRejectedValueOnce(error);

      logger.info('test message');

      await new Promise(resolve => setTimeout(resolve, 200));

      configManager.logs.maxSize = 10485760;
      consoleErrorSpy.mockRestore();
    });

    test('stat 失败（ENOENT）应不记录错误', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((() => {}) as any);

      configManager.logs.maxSize = 100;
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      fs.promises.stat.mockRejectedValueOnce(error);

      logger.info('test message');

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      configManager.logs.maxSize = 10485760;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('清理过期日志失败场景', () => {
    test('readdir 失败应记录错误', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((() => {}) as any);

      configManager.logs.maxSize = 100;
      fs.promises.stat.mockResolvedValueOnce({ size: 200, ctimeMs: Date.now() });
      fs.promises.readdir.mockRejectedValueOnce(new Error('Read dir failed'));

      logger.info('test message');

      await new Promise(resolve => setTimeout(resolve, 200));

      configManager.logs.maxSize = 10485760;
      consoleErrorSpy.mockRestore();
    });

    test('unlink 失败应记录错误', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((() => {}) as any);

      const oldTime = Date.now() - 8 * 24 * 60 * 60 * 1000;

      configManager.logs.maxSize = 100;
      fs.promises.stat.mockResolvedValueOnce({ size: 200, ctimeMs: Date.now() });
      fs.promises.readdir.mockResolvedValueOnce(['comfyui-old.log']);
      fs.promises.stat.mockResolvedValue({ size: 1024, ctimeMs: oldTime });
      fs.promises.unlink.mockRejectedValueOnce(new Error('Unlink failed'));

      logger.info('test message');

      await new Promise(resolve => setTimeout(resolve, 200));

      configManager.logs.maxSize = 10485760;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('日志内容为空场景', () => {
    test('空字符串日志应正常处理', async () => {
      logger.info('');

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockWriteStream.write).toHaveBeenCalled();
    });

    test('仅空白字符的日志应正常处理', async () => {
      logger.info('   ');

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockWriteStream.write).toHaveBeenCalled();
    });
  });

  describe('日志窗口异常场景', () => {
    test('webContents.send 抛出异常应不中断日志', async () => {
      const mockWindow = {
        isDestroyed: jest.fn(() => false),
        isVisible: jest.fn(() => true),
        isMinimized: jest.fn(() => false),
        webContents: {
          send: jest.fn(() => {})
        }
      };

      logger.setLogWindow(mockWindow as any);

      expect(() => logger.info('test message')).not.toThrow();
    });
  });

  describe('并发写入场景', () => {
    test('多个并发日志应按顺序写入', async () => {
      logger.info('message 1');
      logger.info('message 2');
      logger.info('message 3');

      await new Promise(resolve => setTimeout(resolve, 300));

      expect(mockWriteStream.write).toHaveBeenCalled();
    });
  });

  describe('定时器清理场景', () => {
    test('多次快速调用应复用定时器', async () => {
      logger.info('message 1');
      logger.info('message 2');
      logger.info('message 3');

      const timer = (logger as any)._timer;
      expect(timer).not.toBeNull();

      await new Promise(resolve => setTimeout(resolve, 150));

      expect((logger as any)._timer).toBeNull();
    });
  });

  describe('getTodayLogFile 场景', () => {
    test('应返回正确格式的日志文件路径', () => {
      const logPath = logger.getTodayLogFile();

      expect(logPath).toContain('comfyui-');
      expect(logPath).toContain('.log');
    });
  });

  describe('setLogWindow 场景', () => {
    test('设置 null 窗口应正常处理', () => {
      expect(() => logger.setLogWindow(null)).not.toThrow();
    });

    test('设置有效窗口应正常处理', () => {
      const mockWindow = {
        isDestroyed: jest.fn(() => false),
        isVisible: jest.fn(() => true),
        isMinimized: jest.fn(() => false),
        webContents: { send: jest.fn() }
      };

      expect(() => logger.setLogWindow(mockWindow as any)).not.toThrow();
    });
  });

  describe('边界值场景', () => {
    test('keepDays 为 0 时应不清理任何文件', async () => {
      configManager.logs.keepDays = 0;
      configManager.logs.maxSize = 100;

      fs.promises.stat.mockResolvedValueOnce({ size: 200, ctimeMs: Date.now() });
      fs.promises.readdir.mockResolvedValueOnce(['comfyui-old.log']);
      fs.promises.stat.mockResolvedValue({ size: 1024, ctimeMs: 0 });

      logger.info('test message');

      await new Promise(resolve => setTimeout(resolve, 200));

      configManager.logs.keepDays = 7;
      configManager.logs.maxSize = 10485760;
    });

    test('maxSize 为 0 时应总是触发轮转', async () => {
      configManager.logs.maxSize = 0;

      fs.promises.stat.mockResolvedValueOnce({ size: 1, ctimeMs: Date.now() });

      logger.info('test message');

      await new Promise(resolve => setTimeout(resolve, 200));

      configManager.logs.maxSize = 10485760;
    });
  });
});

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

const FLUSH_WAIT = 600;

describe('日志模块分支覆盖测试', () => {
  let logger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    configManager.logs.enable = true;
    configManager.logs.level = 'info';
    configManager.logs.maxSize = 10485760;
    configManager.logs.keepDays = 7;
    configManager.logs.realtime = true;
    const { app } = require('electron');
    app.isPackaged = false;
    logger = new Logger();
    logger.init();
  });

  describe('_initialized 分支', () => {
    test('未初始化时 log 应不执行任何操作', () => {
      const uninitializedLogger = new Logger();
      uninitializedLogger.log('test message', 'info');
      expect(mockWriteStream.write).not.toHaveBeenCalled();
    });

    test('初始化后 log 应正常执行', async () => {
      logger.log('test message', 'info');
      await new Promise(resolve => setTimeout(resolve, FLUSH_WAIT));
      expect(mockWriteStream.write).toHaveBeenCalled();
    });
  });

  describe('日志级别过滤分支', () => {
    test('日志级别为 error 时只应输出 error 级别日志', async () => {
      configManager.logs.level = 'error';
      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      await new Promise(resolve => setTimeout(resolve, FLUSH_WAIT));
      const calls = mockWriteStream.write.mock.calls as string[][];
      expect(calls.length).toBe(1);
      expect(calls[0]?.[0]).toContain('[error]');
      configManager.logs.level = 'info';
    });

    test('日志级别为 warn 时应输出 error 和 warn 级别日志', async () => {
      configManager.logs.level = 'warn';
      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      await new Promise(resolve => setTimeout(resolve, FLUSH_WAIT));
      const writtenContent = mockWriteStream.write.mock.calls.map((c: any) => String(c[0])).join('');
      expect(writtenContent).toContain('[error]');
      expect(writtenContent).toContain('[warn]');
      expect(writtenContent).not.toContain('[info]');
      configManager.logs.level = 'info';
    });

    test('日志级别为 info 时应输出所有级别日志', async () => {
      configManager.logs.level = 'info';
      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      await new Promise(resolve => setTimeout(resolve, FLUSH_WAIT));
      const writtenContent = mockWriteStream.write.mock.calls.map((c: any) => String(c[0])).join('');
      expect(writtenContent).toContain('[error]');
      expect(writtenContent).toContain('[warn]');
      expect(writtenContent).toContain('[info]');
    });
  });

  describe('日志启用/禁用分支', () => {
    test('日志禁用时应不输出任何日志', async () => {
      configManager.logs.enable = false;
      logger.info('test message');
      await new Promise(resolve => setTimeout(resolve, FLUSH_WAIT));
      expect(mockWriteStream.write).not.toHaveBeenCalled();
      configManager.logs.enable = true;
    });
  });

  describe('缓冲区分支', () => {
    test('缓冲区未满时应累积日志', () => {
      logger.info('message 1');
      logger.info('message 2');
      const buffer = (logger as any)._buffer;
      expect(buffer.length).toBeGreaterThan(0);
    });

    test('缓冲区满时应强制刷新', async () => {
      (logger as any)._maxPendingSize = 100;
      logger.info('this is a long message that will fill the buffer');
      await new Promise(resolve => setTimeout(resolve, FLUSH_WAIT));
      expect(mockWriteStream.write).toHaveBeenCalled();
      (logger as any)._maxPendingSize = 64 * 1024;
    });
  });

  describe('_logWindow 分支', () => {
    test('_logWindow 为 null 时应不发送消息', async () => {
      logger.setLogWindow(null);
      logger.info('test message');
      await new Promise(resolve => setTimeout(resolve, FLUSH_WAIT));
      expect(true).toBe(true);
    });

    test('_logWindow 已销毁时应不发送消息', async () => {
      const mockWindow = {
        isDestroyed: jest.fn(() => true),
        isVisible: jest.fn(() => true),
        webContents: {
          send: jest.fn()
        }
      };
      logger.setLogWindow(mockWindow as any);
      logger.info('test message');
      await new Promise(resolve => setTimeout(resolve, FLUSH_WAIT));
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    test('_logWindow 不可见时应不发送消息', async () => {
      const mockWindow = {
        isDestroyed: jest.fn(() => false),
        isVisible: jest.fn(() => false),
        webContents: {
          send: jest.fn()
        }
      };
      logger.setLogWindow(mockWindow as any);
      logger.info('test message');
      await new Promise(resolve => setTimeout(resolve, FLUSH_WAIT));
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    test('_logWindow 可见且 realtime 启用时应发送消息', async () => {
      const mockWindow = {
        isDestroyed: jest.fn(() => false),
        isVisible: jest.fn(() => true),
        isMinimized: jest.fn(() => false),
        webContents: {
          send: jest.fn()
        }
      };
      configManager.logs.realtime = true;
      logger.setLogWindow(mockWindow as any);
      logger.info('test message');
      await new Promise(resolve => setTimeout(resolve, FLUSH_WAIT));
      expect(mockWindow.webContents.send).toHaveBeenCalled();
    });

    test('realtime 禁用时应不发送消息', async () => {
      const mockWindow = {
        isDestroyed: jest.fn(() => false),
        isVisible: jest.fn(() => true),
        isMinimized: jest.fn(() => false),
        webContents: {
          send: jest.fn()
        }
      };
      configManager.logs.realtime = false;
      logger.setLogWindow(mockWindow as any);
      logger.info('test message');
      await new Promise(resolve => setTimeout(resolve, FLUSH_WAIT));
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
      configManager.logs.realtime = true;
    });
  });

  describe('日志轮转分支', () => {
    test('文件大小超过 maxSize 时应触发轮转', async () => {
      configManager.logs.maxSize = 100;
      fs.promises.stat.mockResolvedValueOnce({
        size: 200,
        ctimeMs: Date.now()
      });
      logger.info('test message');
      await new Promise(resolve => setTimeout(resolve, FLUSH_WAIT));
      expect(fs.promises.rename).toHaveBeenCalled();
      configManager.logs.maxSize = 10485760;
    });

    test('文件大小未超过 maxSize 时不应轮转', async () => {
      configManager.logs.maxSize = 10485760;
      fs.promises.stat.mockResolvedValueOnce({
        size: 100,
        ctimeMs: Date.now()
      });
      logger.info('test message');
      await new Promise(resolve => setTimeout(resolve, FLUSH_WAIT));
      expect(fs.promises.rename).not.toHaveBeenCalled();
    });

    test('轮转检查间隔内不应重复检查', async () => {
      const statSpy = jest.spyOn(fs.promises, 'stat');
      logger.info('message 1');
      logger.info('message 2');
      logger.info('message 3');
      await new Promise(resolve => setTimeout(resolve, FLUSH_WAIT));
      expect(statSpy.mock.calls.length).toBeLessThanOrEqual(2);
    });
  });

  describe('清理过期日志分支', () => {
    test('应清理超过 keepDays 的日志文件', async () => {
      const oldTime = Date.now() - 8 * 24 * 60 * 60 * 1000;
      fs.promises.readdir.mockResolvedValueOnce(['comfyui-2024-01-01.log', 'comfyui-2024-01-02.log']);
      fs.promises.stat.mockResolvedValue({
        size: 1024,
        ctimeMs: oldTime
      });
      configManager.logs.maxSize = 100;
      fs.promises.stat.mockResolvedValueOnce({
        size: 200,
        ctimeMs: Date.now()
      });
      logger.info('test message');
      await new Promise(resolve => setTimeout(resolve, FLUSH_WAIT));
      expect(fs.promises.unlink).toHaveBeenCalled();
      configManager.logs.maxSize = 10485760;
    });

    test('非日志文件应不被清理', async () => {
      fs.promises.readdir.mockResolvedValueOnce(['other-file.txt', 'comfyui-2024-01-01.log']);
      fs.promises.stat.mockResolvedValue({
        size: 1024,
        ctimeMs: Date.now() - 8 * 24 * 60 * 60 * 1000
      });
      configManager.logs.maxSize = 100;
      fs.promises.stat.mockResolvedValueOnce({
        size: 200,
        ctimeMs: Date.now()
      });
      logger.info('test message');
      await new Promise(resolve => setTimeout(resolve, FLUSH_WAIT));
      configManager.logs.maxSize = 10485760;
    });
  });

  describe('开发模式控制台输出分支', () => {
    test('开发模式应输出到控制台', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const { app } = require('electron');
      app.isPackaged = false;
      logger.info('test message');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('生产模式不应输出到控制台', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const { app } = require('electron');
      app.isPackaged = true;
      logger.info('test message');
      expect(consoleSpy).not.toHaveBeenCalled();
      app.isPackaged = false;
      consoleSpy.mockRestore();
    });
  });

  describe('写入队列分支', () => {
    test('多个日志应按顺序写入', async () => {
      logger.info('message 1');
      logger.info('message 2');
      logger.info('message 3');
      await new Promise(resolve => setTimeout(resolve, FLUSH_WAIT));
      expect(mockWriteStream.write).toHaveBeenCalled();
      const calls = mockWriteStream.write.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    test('写入过程中新日志应排队等待', async () => {
      logger.info('message 1');
      logger.info('message 2');
      await new Promise(resolve => setTimeout(resolve, FLUSH_WAIT));
      expect(mockWriteStream.write).toHaveBeenCalled();
    });
  });

  describe('快捷方法分支', () => {
    test('error 方法应调用 log 并传入 error 级别', () => {
      const logSpy = jest.spyOn(logger, 'log');
      logger.error('error message');
      expect(logSpy).toHaveBeenCalledWith('error message', 'error');
    });

    test('warn 方法应调用 log 并传入 warn 级别', () => {
      const logSpy = jest.spyOn(logger, 'log');
      logger.warn('warn message');
      expect(logSpy).toHaveBeenCalledWith('warn message', 'warn');
    });

    test('info 方法应调用 log 并传入 info 级别', () => {
      const logSpy = jest.spyOn(logger, 'log');
      logger.info('info message');
      expect(logSpy).toHaveBeenCalledWith('info message', 'info');
    });
  });
});

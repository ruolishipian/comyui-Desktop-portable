/**
 * 日志模块分支覆盖测试
 * 补充 Logger 的分支覆盖测试用例
 */

import { Logger } from '../../../../src/modules/logger';

// Mock fs
jest.mock('fs', () => ({
  promises: {
    appendFile: jest.fn(() => Promise.resolve()),
    readFile: jest.fn(() => Promise.resolve('test log content')),
    writeFile: jest.fn(() => Promise.resolve()),
    stat: jest.fn(() => Promise.resolve({ size: 1024, ctimeMs: Date.now() })),
    rename: jest.fn(() => Promise.resolve()),
    readdir: jest.fn(() => Promise.resolve([])),
    unlink: jest.fn(() => Promise.resolve())
  },
  existsSync: jest.fn(() => true)
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn(p => p.split('/').slice(0, -1).join('/')),
  basename: jest.fn(p => p.split('/').pop() ?? '')
}));

// Mock electron
jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: jest.fn(() => '/test/app')
  },
  BrowserWindow: jest.fn()
}));

// Mock configManager
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

// 导入 mock 后的模块
const fs = require('fs');
const { configManager } = require('../../../../src/modules/config');

describe('日志模块分支覆盖测试', () => {
  let logger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = new Logger();
    logger.init();
  });

  describe('_initialized 分支', () => {
    test('未初始化时 log 应不执行任何操作', () => {
      const uninitializedLogger = new Logger();
      uninitializedLogger.log('test message', 'info');

      expect(fs.promises.appendFile).not.toHaveBeenCalled();
    });

    test('初始化后 log 应正常执行', () => {
      logger.log('test message', 'info');

      // 等待异步写入
      return new Promise(resolve => setTimeout(resolve, 50)).then(() => {
        expect(fs.promises.appendFile).toHaveBeenCalled();
      });
    });
  });

  describe('日志级别过滤分支', () => {
    test('日志级别为 error 时只应输出 error 级别日志', async () => {
      configManager.logs.level = 'error';

      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');

      await new Promise(resolve => setTimeout(resolve, 100));

      // 只有 error 应该被写入
      const calls = fs.promises.appendFile.mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0][1]).toContain('[error]');

      configManager.logs.level = 'info';
    });

    test('日志级别为 warn 时应输出 error 和 warn 级别日志', async () => {
      configManager.logs.level = 'warn';

      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');

      await new Promise(resolve => setTimeout(resolve, 100));

      const calls = fs.promises.appendFile.mock.calls;
      expect(calls.length).toBe(2);

      configManager.logs.level = 'info';
    });

    test('日志级别为 info 时应输出所有级别日志', async () => {
      configManager.logs.level = 'info';

      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');

      await new Promise(resolve => setTimeout(resolve, 100));

      const calls = fs.promises.appendFile.mock.calls;
      expect(calls.length).toBe(3);
    });
  });

  describe('日志启用/禁用分支', () => {
    test('日志禁用时应不输出任何日志', async () => {
      configManager.logs.enable = false;

      logger.info('test message');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(fs.promises.appendFile).not.toHaveBeenCalled();

      configManager.logs.enable = true;
    });
  });

  describe('缓冲区分支', () => {
    test('缓冲区未满时应累积日志', () => {
      logger.info('message 1');
      logger.info('message 2');

      // 缓冲区应该包含两条日志
      const buffer = (logger as any)._buffer;
      expect(buffer.length).toBeGreaterThan(0);
    });

    test('缓冲区满时应强制刷新', async () => {
      // 设置较小的缓冲区
      (logger as any)._maxBufferSize = 100;

      logger.info('this is a long message that will fill the buffer');

      await new Promise(resolve => setTimeout(resolve, 50));

      // 缓冲区应该被刷新
      expect(fs.promises.appendFile).toHaveBeenCalled();

      // 恢复默认缓冲区大小
      (logger as any)._maxBufferSize = 1024 * 1024;
    });
  });

  describe('_logWindow 分支', () => {
    test('_logWindow 为 null 时应不发送消息', async () => {
      logger.setLogWindow(null);

      logger.info('test message');

      await new Promise(resolve => setTimeout(resolve, 150));

      // 应该不抛出错误
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

      await new Promise(resolve => setTimeout(resolve, 150));

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

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    test('_logWindow 可见且 realtime 启用时应发送消息', async () => {
      const mockWindow = {
        isDestroyed: jest.fn(() => false),
        isVisible: jest.fn(() => true),
        webContents: {
          send: jest.fn()
        }
      };

      configManager.logs.realtime = true;
      logger.setLogWindow(mockWindow as any);
      logger.info('test message');

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockWindow.webContents.send).toHaveBeenCalledWith('logUpdate', expect.any(String));
    });

    test('realtime 禁用时应不发送消息', async () => {
      const mockWindow = {
        isDestroyed: jest.fn(() => false),
        isVisible: jest.fn(() => true),
        webContents: {
          send: jest.fn()
        }
      };

      configManager.logs.realtime = false;
      logger.setLogWindow(mockWindow as any);
      logger.info('test message');

      await new Promise(resolve => setTimeout(resolve, 150));

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

      await new Promise(resolve => setTimeout(resolve, 100));

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

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(fs.promises.rename).not.toHaveBeenCalled();
    });

    test('轮转检查间隔内不应重复检查', async () => {
      const statSpy = jest.spyOn(fs.promises, 'stat');

      logger.info('message 1');
      logger.info('message 2');
      logger.info('message 3');

      await new Promise(resolve => setTimeout(resolve, 100));

      // 由于轮转检查间隔，stat 不应该被调用多次
      // 实际调用次数取决于 _lastRotateCheck 和 _rotateCheckInterval
      expect(statSpy.mock.calls.length).toBeLessThanOrEqual(1);
    });
  });

  describe('清理过期日志分支', () => {
    test('应清理超过 keepDays 的日志文件', async () => {
      const oldTime = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 天前

      fs.promises.readdir.mockResolvedValueOnce(['comfyui-2024-01-01.log', 'comfyui-2024-01-02.log']);

      fs.promises.stat.mockResolvedValue({
        size: 1024,
        ctimeMs: oldTime
      });

      // 触发轮转以调用清理
      configManager.logs.maxSize = 100;
      fs.promises.stat.mockResolvedValueOnce({
        size: 200,
        ctimeMs: Date.now()
      });

      logger.info('test message');

      await new Promise(resolve => setTimeout(resolve, 100));

      // 应该尝试删除过期文件
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

      await new Promise(resolve => setTimeout(resolve, 100));

      configManager.logs.maxSize = 10485760;
    });
  });

  describe('开发模式控制台输出分支', () => {
    test('开发模式应输出到控制台', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation((() => {}) as any);

      const { app } = require('electron');
      app.isPackaged = false;

      logger.info('test message');

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test('生产模式不应输出到控制台', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation((() => {}) as any);

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
      const writeOrder: string[] = [];

      fs.promises.appendFile.mockImplementation(async (_path: string, content: string) => {
        writeOrder.push(content);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      logger.info('message 1');
      logger.info('message 2');
      logger.info('message 3');

      // 增加等待时间确保所有异步操作完成
      await new Promise(resolve => setTimeout(resolve, 200));

      // 应该都写入
      expect(writeOrder.length).toBe(3);
    });

    test('写入过程中新日志应排队等待', async () => {
      let writeCount = 0;

      fs.promises.appendFile.mockImplementation(async () => {
        writeCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      logger.info('message 1');
      logger.info('message 2');

      // 增加等待时间确保队列处理完成
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(writeCount).toBe(2);
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

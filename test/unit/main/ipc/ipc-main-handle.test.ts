/**
 * IPC 主进程处理测试
 * 测试主进程的 IPC 处理器注册、调用、错误处理
 */

import { MockIpc } from '../../../mocks/ipc.mock';

describe('IPC 主进程处理测试', () => {
  let ipcMain: MockIpc;

  beforeEach(() => {
    ipcMain = new MockIpc();
  });

  afterEach(() => {
    ipcMain.clear();
  });

  describe('处理器注册', () => {
    test('应该成功注册处理器', () => {
      const handler = jest.fn();
      ipcMain.handle('test-channel', handler);

      expect(ipcMain.hasHandler('test-channel')).toBe(true);
    });

    test('应该能注册多个处理器', () => {
      ipcMain.handle('channel1', jest.fn());
      ipcMain.handle('channel2', jest.fn());
      ipcMain.handle('channel3', jest.fn());

      expect(ipcMain.getRegisteredChannels().length).toBe(3);
    });

    test('覆盖已存在的处理器应正常处理', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      ipcMain.handle('test-channel', handler1);
      ipcMain.handle('test-channel', handler2);

      expect(ipcMain.hasHandler('test-channel')).toBe(true);
    });
  });

  describe('处理器移除', () => {
    test('应该成功移除处理器', () => {
      ipcMain.handle('test-channel', jest.fn());
      ipcMain.removeHandler('test-channel');

      expect(ipcMain.hasHandler('test-channel')).toBe(false);
    });

    test('移除不存在的处理器应正常处理', () => {
      expect(() => {
        ipcMain.removeHandler('nonexistent');
      }).not.toThrow();
    });

    test('应该能移除所有处理器', () => {
      ipcMain.handle('channel1', jest.fn());
      ipcMain.handle('channel2', jest.fn());
      ipcMain.handle('channel3', jest.fn());

      ipcMain.clear();

      expect(ipcMain.getRegisteredChannels().length).toBe(0);
    });
  });

  describe('处理器调用', () => {
    test('应该能调用已注册的处理器', async () => {
      const handler = jest.fn().mockResolvedValue('result');
      ipcMain.handle('test-channel', handler);

      const result = await ipcMain.invoke('test-channel', 'arg1', 'arg2');

      expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('result');
    });

    test('调用未注册的处理器应抛出错误', async () => {
      await expect(ipcMain.invoke('nonexistent')).rejects.toThrow();
    });

    test('应该正确传递多个参数', async () => {
      const handler = jest.fn();
      ipcMain.handle('test-channel', handler);

      await ipcMain.invoke('test-channel', 'arg1', 'arg2', 'arg3');

      expect(handler).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });

    test('应该正确返回异步结果', async () => {
      const handler = jest.fn().mockResolvedValue({ data: 'test' });
      ipcMain.handle('test-channel', handler);

      const result = await ipcMain.invoke('test-channel');

      expect(result).toEqual({ data: 'test' });
    });
  });

  describe('错误处理', () => {
    test('处理器抛出错误应正确传递', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Test error'));
      ipcMain.handle('test-channel', handler);

      await expect(ipcMain.invoke('test-channel')).rejects.toThrow('Test error');
    });

    test('处理器返回错误应正确处理', async () => {
      const handler = jest.fn().mockReturnValue(new Error('Handler error'));
      ipcMain.handle('test-channel', handler);

      const result = await ipcMain.invoke('test-channel');

      expect(result).toBeInstanceOf(Error);
    });

    test('异步处理器错误应正确传递', async () => {
      const handler = jest.fn().mockImplementation(async () => {
        throw new Error('Async error');
      });
      ipcMain.handle('test-channel', handler);

      await expect(ipcMain.invoke('test-channel')).rejects.toThrow('Async error');
    });
  });

  describe('处理器查询', () => {
    test('应该能查询处理器是否存在', () => {
      ipcMain.handle('test-channel', jest.fn());

      expect(ipcMain.hasHandler('test-channel')).toBe(true);
      expect(ipcMain.hasHandler('nonexistent')).toBe(false);
    });

    test('应该能获取处理器数量', () => {
      expect(ipcMain.getRegisteredChannels().length).toBe(0);

      ipcMain.handle('channel1', jest.fn());
      expect(ipcMain.getRegisteredChannels().length).toBe(1);

      ipcMain.handle('channel2', jest.fn());
      expect(ipcMain.getRegisteredChannels().length).toBe(2);
    });

    test('应该能获取所有已注册的通道', () => {
      ipcMain.handle('channel1', jest.fn());
      ipcMain.handle('channel2', jest.fn());
      ipcMain.handle('channel3', jest.fn());

      const channels = ipcMain.getRegisteredChannels();

      expect(channels).toContain('channel1');
      expect(channels).toContain('channel2');
      expect(channels).toContain('channel3');
    });
  });

  describe('特殊场景', () => {
    test('处理器返回 null 应正常处理', async () => {
      const handler = jest.fn().mockResolvedValue(null);
      ipcMain.handle('test-channel', handler);

      const result = await ipcMain.invoke('test-channel');

      expect(result).toBeNull();
    });

    test('处理器返回 undefined 应正常处理', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      ipcMain.handle('test-channel', handler);

      const result = await ipcMain.invoke('test-channel');

      expect(result).toBeUndefined();
    });

    test('处理器返回复杂对象应正常处理', async () => {
      const complexObject = {
        nested: {
          data: [1, 2, 3],
          map: new Map([['key', 'value']]),
          set: new Set([1, 2, 3])
        }
      };

      const handler = jest.fn().mockResolvedValue(complexObject);
      ipcMain.handle('test-channel', handler);

      const result = await ipcMain.invoke('test-channel');

      expect(result).toEqual(complexObject);
    });
  });

  describe('性能测试', () => {
    test('大量处理器注册应正常处理', () => {
      for (let i = 0; i < 100; i++) {
        ipcMain.handle(`channel-${i}`, jest.fn());
      }

      expect(ipcMain.getRegisteredChannels().length).toBe(100);
    });

    test('处理器调用应在合理时间内完成', async () => {
      const handler = jest.fn().mockResolvedValue('result');
      ipcMain.handle('test-channel', handler);

      const startTime = Date.now();
      await ipcMain.invoke('test-channel');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });
  });
});

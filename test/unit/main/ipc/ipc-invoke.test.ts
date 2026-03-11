/**
 * IPC 通信测试
 * 测试主进程与渲染进程之间的通信
 */

import { MockIpc } from '../../../mocks/ipc.mock';
import { createTestConfig } from '../../../utils/test-data';

describe('IPC 通信测试', () => {
  let ipc: MockIpc;

  beforeEach(() => {
    ipc = new MockIpc();
  });

  afterEach(() => {
    ipc.clear();
  });

  describe('IPC 处理器注册', () => {
    test('应该成功注册处理器', () => {
      const handler = jest.fn();
      ipc.handle('getConfig', handler);

      expect(ipc.hasHandler('getConfig')).toBe(true);
    });

    test('应该成功移除处理器', () => {
      ipc.handle('getConfig', jest.fn());
      ipc.removeHandler('getConfig');

      expect(ipc.hasHandler('getConfig')).toBe(false);
    });

    test('应该获取所有已注册的通道', () => {
      ipc.handle('getConfig', jest.fn());
      ipc.handle('set-config', jest.fn());

      const channels = ipc.getRegisteredChannels();

      expect(channels).toContain('getConfig');
      expect(channels).toContain('set-config');
    });
  });

  describe('IPC 调用', () => {
    test('应该成功调用处理器', async () => {
      const config = createTestConfig();
      ipc.handle('getConfig', () => config);

      const result = await ipc.invoke('getConfig');

      expect(result).toEqual(config);
    });

    test('调用未注册的处理器应抛出错误', async () => {
      await expect(ipc.invoke('nonexistent')).rejects.toThrow();
    });

    test('应该正确传递参数', async () => {
      const handler = jest.fn((key, value) => ({ [key]: value }));
      ipc.handle('updateConfig', handler);

      await ipc.invoke('updateConfig', 'server.port', 8188);

      expect(handler).toHaveBeenCalledWith('server.port', 8188);
    });

    test('应该正确返回异步结果', async () => {
      ipc.handle('async-operation', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'async-result';
      });

      const result = await ipc.invoke('async-operation');

      expect(result).toBe('async-result');
    });
  });

  describe('IPC 消息发送', () => {
    test('应该成功发送消息', () => {
      const listener = jest.fn();
      ipc.on('test-channel', listener);

      ipc.send('test-channel', 'test-data');

      expect(listener).toHaveBeenCalled();
    });

    test('应该正确传递消息参数', () => {
      const listener = jest.fn();
      ipc.on('test-channel', listener);

      ipc.send('test-channel', 'arg1', 'arg2', 'arg3');

      expect(listener).toHaveBeenCalledWith(expect.anything(), 'arg1', 'arg2', 'arg3');
    });
  });

  describe('IPC 监听器管理', () => {
    test('应该成功添加监听器', () => {
      const listener = jest.fn();
      ipc.on('test-channel', listener);

      ipc.send('test-channel');

      expect(listener).toHaveBeenCalled();
    });

    test('应该成功移除监听器', () => {
      const listener = jest.fn();
      ipc.on('test-channel', listener);
      ipc.removeListener('test-channel', listener);

      ipc.send('test-channel');

      expect(listener).not.toHaveBeenCalled();
    });

    test('应该成功移除所有监听器', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      ipc.on('test-channel', listener1);
      ipc.on('test-channel', listener2);
      ipc.removeAllListeners('test-channel');

      ipc.send('test-channel');

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    test('一次性监听器应只触发一次', () => {
      const listener = jest.fn();
      ipc.once('test-channel', listener);

      ipc.send('test-channel');
      ipc.send('test-channel');

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('错误处理', () => {
    test('处理器抛出错误应正确传递', async () => {
      ipc.handle('error-operation', () => {
        throw new Error('Test error');
      });

      await expect(ipc.invoke('error-operation')).rejects.toThrow('Test error');
    });

    test('异步处理器抛出错误应正确传递', async () => {
      ipc.handle('async-error', async () => {
        throw new Error('Async error');
      });

      await expect(ipc.invoke('async-error')).rejects.toThrow('Async error');
    });
  });

  describe('配置相关 IPC', () => {
    test('get-config 应返回配置', async () => {
      const config = createTestConfig();
      ipc.handle('getConfig', () => config);

      const result = await ipc.invoke('getConfig');

      expect(result).toEqual(config);
    });

    test('update-config 应更新配置', async () => {
      const config = createTestConfig();
      const handler = jest.fn((key, value) => {
        config[key as keyof typeof config] = value as never;
        return config;
      });

      ipc.handle('updateConfig', handler);

      await ipc.invoke('updateConfig', 'server.port', 9999);

      expect(handler).toHaveBeenCalledWith('server.port', 9999);
    });

    test('reset-config 应重置配置', async () => {
      ipc.handle('resetConfig', () => true);

      const result = await ipc.invoke('resetConfig');

      expect(result).toBe(true);
    });
  });

  describe('进程控制 IPC', () => {
    test('start-comfyui 应启动服务', async () => {
      const handler = jest.fn();
      ipc.handle('startComfyui', handler);

      await ipc.invoke('startComfyui');

      expect(handler).toHaveBeenCalled();
    });

    test('stop-comfyui 应停止服务', async () => {
      const handler = jest.fn();
      ipc.handle('stopComfyui', handler);

      await ipc.invoke('stopComfyui');

      expect(handler).toHaveBeenCalled();
    });

    test('restart-comfyui 应重启服务', async () => {
      const handler = jest.fn();
      ipc.handle('restartComfyui', handler);

      await ipc.invoke('restartComfyui');

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('路径选择 IPC', () => {
    test('select-comfyui-path 应返回路径', async () => {
      ipc.handle('selectComfyuiPath', () => '/selected/path');

      const result = await ipc.invoke('selectComfyuiPath');

      expect(result).toBe('/selected/path');
    });

    test('select-python-path 应返回路径', async () => {
      ipc.handle('selectPythonPath', () => '/selected/python');

      const result = await ipc.invoke('selectPythonPath');

      expect(result).toBe('/selected/python');
    });

    test('select-directory 应返回路径', async () => {
      ipc.handle('selectDirectory', title => `/selected/dir?title=${title}`);

      const result = await ipc.invoke('selectDirectory', '选择目录');

      expect(result).toContain('选择目录');
    });
  });
});

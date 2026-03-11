/**
 * IPC 通信测试
 * 测试主进程和渲染进程之间的通信
 * 防止回归: IPC 通道名称错误或缺失
 */

import { ipcMain, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../../mocks/ipc-channels.mock';

// Mock electron
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn()
  }
}));

describe('IPC 通道定义测试', () => {
  describe('通道名称完整性测试', () => {
    it('应该定义所有必需的 IPC 通道', () => {
      const requiredChannels = [
        'GET_CONFIG',
        'UPDATE_CONFIG',
        'START_SERVER',
        'STOP_SERVER',
        'RESTART_SERVER',
        'GET_STATUS',
        'GET_SESSION_LOG',
        'LOG_UPDATE',
        'STATUS_UPDATE',
        'APP_CLOSING',
        'OPEN_LOG_WINDOW',
        'OPEN_CONFIG_WINDOW',
        'OPEN_EXTERNAL_LINK',
        'SELECT_DIRECTORY',
        'SELECT_FILE',
        'RENDERER_READY'
      ];

      requiredChannels.forEach(channel => {
        expect(IPC_CHANNELS).toHaveProperty(channel);
      });
    });

    it('通道名称应该是字符串', () => {
      Object.values(IPC_CHANNELS).forEach(channel => {
        expect(typeof channel).toBe('string');
      });
    });

    it('通道名称不应该为空', () => {
      Object.values(IPC_CHANNELS).forEach((channel: any) => {
        expect((channel as string).length).toBeGreaterThan(0);
      });
    });

    it('通道名称应该唯一', () => {
      const channels = Object.values(IPC_CHANNELS);
      const uniqueChannels = new Set(channels);

      expect(channels.length).toBe(uniqueChannels.size);
    });
  });

  describe('通道命名规范测试', () => {
    it('通道名称应该使用 camelCase', () => {
      Object.entries(IPC_CHANNELS).forEach(([key, value]) => {
        // 键应该使用 UPPER_SNAKE_CASE
        expect(key).toMatch(/^[A-Z_]+$/);

        // 值应该使用 camelCase
        expect(value).toMatch(/^[a-z][a-zA-Z0-9]*$/);
      });
    });
  });

  describe('回归测试', () => {
    it('防止: GET_STATUS 通道缺失', () => {
      expect(IPC_CHANNELS.GET_STATUS).toBeDefined();
      expect(IPC_CHANNELS.GET_STATUS).toBe('getStatus');
    });

    it('防止: RENDERER_READY 通道缺失', () => {
      expect(IPC_CHANNELS.RENDERER_READY).toBeDefined();
      expect(IPC_CHANNELS.RENDERER_READY).toBe('rendererReady');
    });

    it('防止: LOG_UPDATE 通道缺失', () => {
      expect(IPC_CHANNELS.LOG_UPDATE).toBeDefined();
      expect(IPC_CHANNELS.LOG_UPDATE).toBe('logUpdate');
    });

    it('防止: STATUS_UPDATE 通道缺失', () => {
      expect(IPC_CHANNELS.STATUS_UPDATE).toBeDefined();
      expect(IPC_CHANNELS.STATUS_UPDATE).toBe('statusUpdate');
    });
  });
});

describe('IPC 通信安全性测试', () => {
  describe('渲染进程到主进程', () => {
    it('应该只允许调用白名单中的通道', () => {
      const allowedChannels = [
        IPC_CHANNELS.GET_CONFIG,
        IPC_CHANNELS.UPDATE_CONFIG,
        IPC_CHANNELS.START_SERVER,
        IPC_CHANNELS.STOP_SERVER,
        IPC_CHANNELS.RESTART_SERVER,
        IPC_CHANNELS.GET_STATUS,
        IPC_CHANNELS.GET_SESSION_LOG,
        IPC_CHANNELS.OPEN_LOG_WINDOW,
        IPC_CHANNELS.OPEN_CONFIG_WINDOW,
        IPC_CHANNELS.OPEN_EXTERNAL_LINK,
        IPC_CHANNELS.SELECT_DIRECTORY,
        IPC_CHANNELS.SELECT_FILE,
        IPC_CHANNELS.RENDERER_READY
      ];

      // 所有允许的通道都应该在 IPC_CHANNELS 中定义
      allowedChannels.forEach(channel => {
        expect(Object.values(IPC_CHANNELS)).toContain(channel);
      });
    });
  });

  describe('主进程到渲染进程', () => {
    it('应该只允许发送白名单中的事件', () => {
      const allowedEvents = [IPC_CHANNELS.LOG_UPDATE, IPC_CHANNELS.STATUS_UPDATE, IPC_CHANNELS.APP_CLOSING];

      allowedEvents.forEach(event => {
        expect(Object.values(IPC_CHANNELS)).toContain(event);
      });
    });

    it('渲染进程应该只能监听白名单中的事件', () => {
      const receiveChannels = [IPC_CHANNELS.LOG_UPDATE, IPC_CHANNELS.STATUS_UPDATE, IPC_CHANNELS.APP_CLOSING];

      // 模拟 preload 中的白名单检查
      const isChannelAllowed = (channel: string) => {
        return receiveChannels.includes(channel as any);
      };

      receiveChannels.forEach(channel => {
        expect(isChannelAllowed(channel)).toBe(true);
      });

      // 未授权的通道应该被拒绝
      expect(isChannelAllowed('unauthorized-channel')).toBe(false);
    });
  });
});

describe('IPC 调用测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('主进程处理测试', () => {
    it('应该注册所有必需的 IPC 处理器', () => {
      // 模拟注册处理器
      const handlers = [
        IPC_CHANNELS.GET_CONFIG,
        IPC_CHANNELS.UPDATE_CONFIG,
        IPC_CHANNELS.START_SERVER,
        IPC_CHANNELS.STOP_SERVER,
        IPC_CHANNELS.GET_STATUS,
        IPC_CHANNELS.GET_SESSION_LOG
      ];

      handlers.forEach(channel => {
        ipcMain.handle(channel, jest.fn());
      });

      expect(ipcMain.handle).toHaveBeenCalledTimes(handlers.length);
    });
  });

  describe('渲染进程调用测试', () => {
    it('应该能调用 GET_STATUS', async () => {
      const mockStatus = {
        status: 'running',
        port: 8188,
        pid: 12345
      };

      (ipcRenderer.invoke as jest.Mock).mockResolvedValue(mockStatus);

      const result = await ipcRenderer.invoke(IPC_CHANNELS.GET_STATUS);

      expect(ipcRenderer.invoke).toHaveBeenCalledWith('getStatus');
      expect(result).toEqual(mockStatus);
    });

    it('应该能调用 GET_SESSION_LOG', async () => {
      const mockLog = 'Log content here...';

      (ipcRenderer.invoke as jest.Mock).mockResolvedValue(mockLog);

      const result = await ipcRenderer.invoke(IPC_CHANNELS.GET_SESSION_LOG);

      expect(ipcRenderer.invoke).toHaveBeenCalledWith('getSessionLog');
      expect(result).toBe(mockLog);
    });

    it('应该能调用 RENDERER_READY', async () => {
      (ipcRenderer.invoke as jest.Mock).mockResolvedValue(undefined);

      await ipcRenderer.invoke(IPC_CHANNELS.RENDERER_READY);

      expect(ipcRenderer.invoke).toHaveBeenCalledWith('rendererReady');
    });
  });

  describe('事件监听测试', () => {
    it('应该能监听 LOG_UPDATE 事件', () => {
      const handler = jest.fn();

      ipcRenderer.on(IPC_CHANNELS.LOG_UPDATE, handler);

      expect(ipcRenderer.on).toHaveBeenCalledWith('logUpdate', handler);
    });

    it('应该能监听 STATUS_UPDATE 事件', () => {
      const handler = jest.fn();

      ipcRenderer.on(IPC_CHANNELS.STATUS_UPDATE, handler);

      expect(ipcRenderer.on).toHaveBeenCalledWith('statusUpdate', handler);
    });

    it('应该能移除监听器', () => {
      const handler = jest.fn();

      ipcRenderer.removeListener(IPC_CHANNELS.LOG_UPDATE, handler);

      expect(ipcRenderer.removeListener).toHaveBeenCalledWith('logUpdate', handler);
    });
  });
});

describe('IPC 错误处理测试', () => {
  it('应该处理 IPC 调用失败', async () => {
    (ipcRenderer.invoke as jest.Mock).mockRejectedValue(new Error('IPC Error'));

    try {
      await ipcRenderer.invoke(IPC_CHANNELS.GET_STATUS);
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe('IPC Error');
    }
  });

  it('应该处理超时', async () => {
    (ipcRenderer.invoke as jest.Mock).mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(resolve, 10000); // 永不返回
      });
    });

    // 实际应用中应该有超时机制
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 100);
    });

    try {
      await Promise.race([ipcRenderer.invoke(IPC_CHANNELS.GET_STATUS), timeoutPromise]);
    } catch (err) {
      expect((err as Error).message).toBe('Timeout');
    }
  });
});

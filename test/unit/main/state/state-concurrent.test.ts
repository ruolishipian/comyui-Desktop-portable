/**
 * 状态管理并发场景测试
 * 补充 StateManager 的并发场景测试用例
 */

import { StateManager, Status } from '../../../../src/modules/state';

describe('状态管理并发场景测试', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  describe('多个监听器并发通知场景', () => {
    test('所有监听器都应被调用', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();

      stateManager.addListener(listener1);
      stateManager.addListener(listener2);
      stateManager.addListener(listener3);

      stateManager.status = Status.RUNNING;

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      expect(listener3).toHaveBeenCalled();
    });

    test('监听器应收到相同的状态数据', () => {
      const receivedData: any[] = [];

      const listener1 = (data: any) => receivedData.push(data);
      const listener2 = (data: any) => receivedData.push(data);

      stateManager.addListener(listener1);
      stateManager.addListener(listener2);

      stateManager.status = Status.RUNNING;

      expect(receivedData[0]).toEqual(receivedData[1]);
    });

    test('添加多个相同监听器应只调用一次', () => {
      const listener = jest.fn();

      stateManager.addListener(listener);
      stateManager.addListener(listener);
      stateManager.addListener(listener);

      stateManager.status = Status.RUNNING;

      // 由于使用 Set，相同监听器只会被添加一次
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('监听器执行错误场景', () => {
    test('一个监听器抛出错误应不影响其他监听器', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((() => {}) as any);

      const errorListener = () => {
        throw new Error('Listener error');
      };
      const normalListener = jest.fn();

      stateManager.addListener(errorListener);
      stateManager.addListener(normalListener);

      stateManager.status = Status.RUNNING;

      expect(normalListener).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test('监听器错误应被记录', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((() => {}) as any);

      const errorListener = () => {
        throw new Error('Listener error');
      };

      stateManager.addListener(errorListener);
      stateManager.status = Status.RUNNING;

      expect(consoleErrorSpy).toHaveBeenCalledWith('[StateManager] 监听器执行错误:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    test('多个监听器抛出错误应都记录', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((() => {}) as any);

      const errorListener1 = () => {
        throw new Error('Error 1');
      };
      const errorListener2 = () => {
        throw new Error('Error 2');
      };
      const normalListener = jest.fn();

      stateManager.addListener(errorListener1);
      stateManager.addListener(errorListener2);
      stateManager.addListener(normalListener);

      stateManager.status = Status.RUNNING;

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(normalListener).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('状态并发修改场景', () => {
    test('快速连续修改状态应按顺序处理', () => {
      const statusHistory: string[] = [];
      const listener = (data: any) => {
        statusHistory.push(data.status);
      };

      stateManager.addListener(listener);

      stateManager.status = Status.STARTING;
      stateManager.status = Status.RUNNING;
      stateManager.status = Status.STOPPING;
      stateManager.status = Status.STOPPED;

      expect(statusHistory).toEqual([Status.STARTING, Status.RUNNING, Status.STOPPING, Status.STOPPED]);
    });

    test('并发修改相同状态应只触发一次通知', () => {
      const listener = jest.fn();
      stateManager.addListener(listener);

      // 快速连续设置相同状态
      stateManager.status = Status.RUNNING;
      stateManager.status = Status.RUNNING;
      stateManager.status = Status.RUNNING;

      // 只有第一次应该触发通知
      expect(listener).toHaveBeenCalledTimes(1);
    });

    test('并发修改 pid 和 port 应正确保存', () => {
      stateManager.pid = 12345;
      stateManager.port = 8188;

      expect(stateManager.pid).toBe(12345);
      expect(stateManager.port).toBe(8188);
    });
  });

  describe('addListener 和监听器移除场景', () => {
    test('addListener 应返回移除函数', () => {
      const listener = jest.fn();
      const remove = stateManager.addListener(listener);

      stateManager.status = Status.RUNNING;
      expect(listener).toHaveBeenCalledTimes(1);

      remove();

      stateManager.status = Status.STOPPED;
      expect(listener).toHaveBeenCalledTimes(1); // 不应再被调用
    });

    test('移除监听器后其他监听器应仍正常工作', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      const remove1 = stateManager.addListener(listener1);
      stateManager.addListener(listener2);

      stateManager.status = Status.RUNNING;
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      remove1();

      stateManager.status = Status.STOPPED;
      expect(listener1).toHaveBeenCalledTimes(1); // 不应再被调用
      expect(listener2).toHaveBeenCalledTimes(2); // 应该被再次调用
    });

    test('多次调用移除函数应安全', () => {
      const listener = jest.fn();
      const remove = stateManager.addListener(listener);

      remove();
      remove();
      remove();

      // 应该不抛出错误
      expect(true).toBe(true);
    });
  });

  describe('reset 函数完整流程', () => {
    test('reset 应通知所有监听器', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      stateManager.addListener(listener1);
      stateManager.addListener(listener2);

      stateManager.status = Status.RUNNING;
      listener1.mockClear();
      listener2.mockClear();

      stateManager.reset();

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    test('reset 后状态应为 STOPPED', () => {
      stateManager.status = Status.RUNNING;
      stateManager.pid = 12345;
      stateManager.port = 8188;

      stateManager.reset();

      expect(stateManager.status).toBe(Status.STOPPED);
      expect(stateManager.pid).toBeNull();
      expect(stateManager.port).toBeNull();
    });

    test('reset 后监听器应仍能正常工作', () => {
      const listener = jest.fn();
      stateManager.addListener(listener);

      stateManager.reset();
      listener.mockClear();

      stateManager.status = Status.RUNNING;

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('边界条件场景', () => {
    test('大量监听器应正常工作', () => {
      const listeners = Array.from({ length: 100 }, () => jest.fn());

      listeners.forEach(l => stateManager.addListener(l));

      stateManager.status = Status.RUNNING;

      listeners.forEach(l => expect(l).toHaveBeenCalled());
    });

    test('大量状态变更应正常工作', () => {
      const listener = jest.fn();
      stateManager.addListener(listener);

      for (let i = 0; i < 100; i++) {
        stateManager.status = Status.STARTING;
        stateManager.status = Status.RUNNING;
        stateManager.status = Status.STOPPING;
        stateManager.status = Status.STOPPED;
      }

      // 每次状态变化都应触发通知
      expect(listener).toHaveBeenCalledTimes(400);
    });

    test('极端 pid 和 port 值应正常处理', () => {
      stateManager.pid = 0;
      stateManager.port = 0;

      expect(stateManager.pid).toBe(0);
      expect(stateManager.port).toBe(0);

      stateManager.pid = 999999;
      stateManager.port = 65535;

      expect(stateManager.pid).toBe(999999);
      expect(stateManager.port).toBe(65535);
    });
  });

  describe('内存泄漏防护场景', () => {
    test('移除所有监听器后应不持有引用', () => {
      const listener = jest.fn();
      const remove = stateManager.addListener(listener);

      remove();

      // 监听器集合应该为空
      expect((stateManager as any)._listeners.size).toBe(0);
    });

    test('大量添加和移除监听器应正常工作', () => {
      const removes: (() => void)[] = [];

      for (let i = 0; i < 100; i++) {
        removes.push(stateManager.addListener(jest.fn()));
      }

      removes.forEach(r => r());

      expect((stateManager as any)._listeners.size).toBe(0);
    });
  });
});

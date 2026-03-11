/**
 * 状态管理分支覆盖测试
 * 补充 StateManager 的分支覆盖测试用例
 */

import { StateManager, Status } from '../../../../src/modules/state';

describe('状态管理分支覆盖测试', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  describe('status setter 分支', () => {
    test('状态相同时应不触发通知', () => {
      const listener = jest.fn();
      stateManager.addListener(listener);

      // 先设置一个不同的状态
      stateManager.status = Status.STARTING;
      listener.mockClear();

      // 再设置相同状态
      stateManager.status = Status.STARTING;

      expect(listener).not.toHaveBeenCalled();
    });

    test('状态不同时应触发通知', () => {
      const listener = jest.fn();
      stateManager.addListener(listener);

      stateManager.status = Status.STARTING;

      expect(listener).toHaveBeenCalledTimes(1);
    });

    test('设置为 STARTING 时应记录启动时间', () => {
      stateManager.status = Status.STARTING;

      expect((stateManager as any)._startTime).toBeGreaterThan(0);
    });

    test('设置为 RUNNING 且运行时间足够时应重置重启计数', async () => {
      stateManager.status = Status.STARTING;
      (stateManager as any)._startTime = Date.now() - 15000; // 15秒前

      stateManager.status = Status.RUNNING;

      expect(stateManager.restartAttempts).toBe(0);
    });

    test('设置为 RUNNING 但运行时间不足时不应重置重启计数', () => {
      stateManager.status = Status.STARTING;
      (stateManager as any)._startTime = Date.now() - 5000; // 5秒前
      (stateManager as any)._restartAttempts = 2;

      stateManager.status = Status.RUNNING;

      expect(stateManager.restartAttempts).toBe(2);
    });
  });

  describe('canStart 分支', () => {
    test('STOPPED 状态应可以启动', () => {
      stateManager.status = Status.STOPPED;

      expect(stateManager.canStart()).toBe(true);
    });

    test('FAILED 状态应可以启动', () => {
      stateManager.status = Status.FAILED;

      expect(stateManager.canStart()).toBe(true);
    });

    test('STARTING 状态不应可以启动', () => {
      stateManager.status = Status.STARTING;

      expect(stateManager.canStart()).toBe(false);
    });

    test('RUNNING 状态不应可以启动', () => {
      stateManager.status = Status.RUNNING;

      expect(stateManager.canStart()).toBe(false);
    });

    test('STOPPING 状态应可以启动（允许在停止过程中重启）', () => {
      stateManager.status = Status.STOPPING;

      expect(stateManager.canStart()).toBe(true);
    });

    test('RESTARTING 状态应可以启动（重启流程中需要启动）', () => {
      stateManager.status = Status.RESTARTING;

      expect(stateManager.canStart()).toBe(true);
    });
  });

  describe('canStop 分支', () => {
    test('RUNNING 状态应可以停止', () => {
      stateManager.status = Status.RUNNING;

      expect(stateManager.canStop()).toBe(true);
    });

    test('STOPPED 状态不应可以停止', () => {
      stateManager.status = Status.STOPPED;

      expect(stateManager.canStop()).toBe(false);
    });

    test('STARTING 状态应可以停止（允许取消启动）', () => {
      stateManager.status = Status.STARTING;

      expect(stateManager.canStop()).toBe(true);
    });

    test('FAILED 状态不应可以停止', () => {
      stateManager.status = Status.FAILED;

      expect(stateManager.canStop()).toBe(false);
    });
  });

  describe('canRestart 分支', () => {
    test('从未重启过时应可以重启', () => {
      (stateManager as any)._lastRestartTime = 0;

      expect(stateManager.canRestart()).toBe(true);
    });

    test('冷却时间已过时应可以重启', () => {
      (stateManager as any)._lastRestartTime = Date.now() - 70000; // 70秒前

      expect(stateManager.canRestart()).toBe(true);
    });

    test('冷却时间未过时不应可以重启', () => {
      (stateManager as any)._lastRestartTime = Date.now() - 30000; // 30秒前

      expect(stateManager.canRestart()).toBe(false);
    });
  });

  describe('getRestartCooldownRemaining 分支', () => {
    test('从未重启过时应返回 0', () => {
      (stateManager as any)._lastRestartTime = 0;

      expect(stateManager.getRestartCooldownRemaining()).toBe(0);
    });

    test('冷却时间已过时应返回 0', () => {
      (stateManager as any)._lastRestartTime = Date.now() - 70000;

      expect(stateManager.getRestartCooldownRemaining()).toBe(0);
    });

    test('冷却时间未过时应返回剩余时间', () => {
      (stateManager as any)._lastRestartTime = Date.now() - 30000;

      const remaining = stateManager.getRestartCooldownRemaining();

      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(30000);
    });
  });

  describe('pid 和 port setter 分支', () => {
    test('pid setter 应正确设置值', () => {
      stateManager.pid = 12345;

      expect(stateManager.pid).toBe(12345);
    });

    test('pid setter 应接受 null', () => {
      stateManager.pid = 12345;
      stateManager.pid = null;

      expect(stateManager.pid).toBeNull();
    });

    test('port setter 应正确设置值', () => {
      stateManager.port = 8188;

      expect(stateManager.port).toBe(8188);
    });

    test('port setter 应接受 null', () => {
      stateManager.port = 8188;
      stateManager.port = null;

      expect(stateManager.port).toBeNull();
    });
  });

  describe('restartAttempts 相关分支', () => {
    test('incrementRestartAttempts 应增加计数', () => {
      stateManager.incrementRestartAttempts();
      stateManager.incrementRestartAttempts();

      expect(stateManager.restartAttempts).toBe(2);
    });

    test('resetRestartAttempts 应重置计数和时间', () => {
      stateManager.incrementRestartAttempts();
      stateManager.incrementRestartAttempts();
      stateManager.resetRestartAttempts();

      expect(stateManager.restartAttempts).toBe(0);
      expect((stateManager as any)._lastRestartTime).toBe(0);
    });

    test('maxRestartAttempts 应返回正确值', () => {
      expect(stateManager.maxRestartAttempts).toBe(3);
    });
  });

  describe('isManualStop 分支', () => {
    test('setManualStop 应正确设置值', () => {
      stateManager.setManualStop(true);

      expect(stateManager.isManualStop).toBe(true);
    });

    test('默认值应为 false', () => {
      expect(stateManager.isManualStop).toBe(false);
    });
  });

  describe('getStateData 分支', () => {
    test('应返回正确的状态数据', () => {
      stateManager.status = Status.RUNNING;
      stateManager.pid = 12345;
      stateManager.port = 8188;

      const data = stateManager.getStateData();

      expect(data).toEqual({
        status: Status.RUNNING,
        pid: 12345,
        port: 8188
      });
    });

    test('状态变化后应返回新数据', () => {
      stateManager.status = Status.STOPPED;
      const data1 = stateManager.getStateData();

      stateManager.status = Status.RUNNING;
      const data2 = stateManager.getStateData();

      expect(data1.status).toBe(Status.STOPPED);
      expect(data2.status).toBe(Status.RUNNING);
    });
  });

  describe('reset 分支', () => {
    test('reset 应重置所有状态', () => {
      stateManager.status = Status.RUNNING;
      stateManager.pid = 12345;
      stateManager.port = 8188;
      stateManager.setManualStop(true);
      stateManager.incrementRestartAttempts();

      stateManager.reset();

      expect(stateManager.status).toBe(Status.STOPPED);
      expect(stateManager.pid).toBeNull();
      expect(stateManager.port).toBeNull();
      expect(stateManager.isManualStop).toBe(false);
      expect(stateManager.restartAttempts).toBe(0);
    });

    test('reset 应触发通知', () => {
      const listener = jest.fn();
      stateManager.addListener(listener);

      stateManager.status = Status.RUNNING;
      listener.mockClear();

      stateManager.reset();

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('状态转换完整流程', () => {
    test('正常启动流程', () => {
      const listener = jest.fn();
      stateManager.addListener(listener);

      // STOPPED -> STARTING
      stateManager.status = Status.STARTING;
      expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ status: Status.STARTING }));

      // STARTING -> RUNNING
      stateManager.status = Status.RUNNING;
      expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ status: Status.RUNNING }));
    });

    test('正常停止流程', () => {
      stateManager.status = Status.RUNNING;

      const listener = jest.fn();
      stateManager.addListener(listener);

      // RUNNING -> STOPPING
      stateManager.status = Status.STOPPING;
      expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ status: Status.STOPPING }));

      // STOPPING -> STOPPED
      stateManager.status = Status.STOPPED;
      expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ status: Status.STOPPED }));
    });

    test('启动失败流程', () => {
      stateManager.status = Status.STARTING;

      const listener = jest.fn();
      stateManager.addListener(listener);

      // STARTING -> FAILED
      stateManager.status = Status.FAILED;
      expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ status: Status.FAILED }));
    });

    test('重启流程', () => {
      stateManager.status = Status.RUNNING;

      const listener = jest.fn();
      stateManager.addListener(listener);

      // RUNNING -> RESTARTING
      stateManager.status = Status.RESTARTING;
      expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ status: Status.RESTARTING }));

      // RESTARTING -> STARTING
      stateManager.status = Status.STARTING;
      expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ status: Status.STARTING }));
    });
  });
});

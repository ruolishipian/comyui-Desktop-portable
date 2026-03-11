/**
 * StateManager 源代码集成测试
 * 直接测试 src/modules/state.ts 的实际代码
 */

import { StateManager, Status } from '../../src/modules/state';

describe('StateManager 源代码集成测试', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  describe('初始状态', () => {
    test('初始状态应为 stopped', () => {
      expect(stateManager.status).toBe(Status.STOPPED);
    });

    test('初始 PID 应为 null', () => {
      expect(stateManager.pid).toBeNull();
    });

    test('初始端口应为 null', () => {
      expect(stateManager.port).toBeNull();
    });

    test('初始重启次数应为 0', () => {
      expect(stateManager.restartAttempts).toBe(0);
    });

    test('初始手动停止标志应为 false', () => {
      expect(stateManager.isManualStop).toBe(false);
    });
  });

  describe('状态设置', () => {
    test('应该能设置状态', () => {
      stateManager.status = Status.STARTING;
      expect(stateManager.status).toBe(Status.STARTING);
    });

    test('设置相同状态不应触发通知', () => {
      const listener = jest.fn();
      stateManager.addListener(listener);

      stateManager.status = Status.STOPPED; // 已经是 stopped

      expect(listener).not.toHaveBeenCalled();
    });

    test('设置不同状态应触发通知', () => {
      const listener = jest.fn();
      stateManager.addListener(listener);

      stateManager.status = Status.STARTING;

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('PID 管理', () => {
    test('应该能设置 PID', () => {
      stateManager.pid = 12345;
      expect(stateManager.pid).toBe(12345);
    });

    test('应该能设置 PID 为 null', () => {
      stateManager.pid = 12345;
      stateManager.pid = null;
      expect(stateManager.pid).toBeNull();
    });
  });

  describe('端口管理', () => {
    test('应该能设置端口', () => {
      stateManager.port = 8188;
      expect(stateManager.port).toBe(8188);
    });

    test('应该能设置端口为 null', () => {
      stateManager.port = 8188;
      stateManager.port = null;
      expect(stateManager.port).toBeNull();
    });
  });

  describe('重启管理', () => {
    test('应该能增加重启次数', () => {
      stateManager.incrementRestartAttempts();
      expect(stateManager.restartAttempts).toBe(1);
    });

    test('应该能重置重启次数', () => {
      stateManager.incrementRestartAttempts();
      stateManager.incrementRestartAttempts();
      stateManager.resetRestartAttempts();
      expect(stateManager.restartAttempts).toBe(0);
    });

    test('应该能获取最大重启次数', () => {
      expect(stateManager.maxRestartAttempts).toBe(3);
    });
  });

  describe('手动停止', () => {
    test('应该能设置手动停止标志', () => {
      stateManager.setManualStop(true);
      expect(stateManager.isManualStop).toBe(true);
    });

    test('应该能清除手动停止标志', () => {
      stateManager.setManualStop(true);
      stateManager.setManualStop(false);
      expect(stateManager.isManualStop).toBe(false);
    });
  });

  describe('状态检查', () => {
    test('stopped 状态应允许启动', () => {
      expect(stateManager.canStart()).toBe(true);
    });

    test('starting 状态不应允许启动', () => {
      stateManager.status = Status.STARTING;
      expect(stateManager.canStart()).toBe(false);
    });

    test('running 状态不应允许启动', () => {
      stateManager.status = Status.RUNNING;
      expect(stateManager.canStart()).toBe(false);
    });

    test('failed 状态应允许启动', () => {
      stateManager.status = Status.FAILED;
      expect(stateManager.canStart()).toBe(true);
    });
  });

  describe('重启检查', () => {
    test('重启次数未达上限时应允许重启', () => {
      expect(stateManager.canRestart()).toBe(true);
    });

    test('重启次数达到上限时不应允许重启', () => {
      stateManager.incrementRestartAttempts();
      stateManager.incrementRestartAttempts();
      stateManager.incrementRestartAttempts();
      expect(stateManager.canRestart()).toBe(false);
    });
  });

  describe('监听器管理', () => {
    test('应该能添加监听器', () => {
      const listener = jest.fn();
      stateManager.addListener(listener);

      stateManager.status = Status.STARTING;

      expect(listener).toHaveBeenCalled();
    });

    test('应该能移除监听器', () => {
      const listener = jest.fn();
      const removeListener = stateManager.addListener(listener);
      removeListener();

      stateManager.status = Status.STARTING;

      expect(listener).not.toHaveBeenCalled();
    });

    test('状态变更应通知所有监听器', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      stateManager.addListener(listener1);
      stateManager.addListener(listener2);

      stateManager.status = Status.STARTING;

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('状态数据', () => {
    test('应该能获取完整状态数据', () => {
      stateManager.status = Status.RUNNING;
      stateManager.pid = 12345;
      stateManager.port = 8188;

      const data = stateManager.getStateData();

      expect(data.status).toBe(Status.RUNNING);
      expect(data.pid).toBe(12345);
      expect(data.port).toBe(8188);
    });
  });

  describe('状态转换', () => {
    test('stopped → starting 转换应成功', () => {
      stateManager.status = Status.STARTING;
      expect(stateManager.status).toBe(Status.STARTING);
    });

    test('starting → running 转换应成功', () => {
      stateManager.status = Status.STARTING;
      stateManager.status = Status.RUNNING;
      expect(stateManager.status).toBe(Status.RUNNING);
    });

    test('running → stopping 转换应成功', () => {
      stateManager.status = Status.RUNNING;
      stateManager.status = Status.STOPPING;
      expect(stateManager.status).toBe(Status.STOPPING);
    });

    test('stopping → stopped 转换应成功', () => {
      stateManager.status = Status.RUNNING;
      stateManager.status = Status.STOPPING;
      stateManager.status = Status.STOPPED;
      expect(stateManager.status).toBe(Status.STOPPED);
    });
  });

  describe('边界情况', () => {
    test('连续设置状态应正确处理', () => {
      stateManager.status = Status.STARTING;
      stateManager.status = Status.RUNNING;
      stateManager.status = Status.STOPPING;
      stateManager.status = Status.STOPPED;

      expect(stateManager.status).toBe(Status.STOPPED);
    });

    test('重启次数应正确累加', () => {
      for (let i = 0; i < 5; i++) {
        stateManager.incrementRestartAttempts();
      }

      expect(stateManager.restartAttempts).toBe(5);
    });
  });
});

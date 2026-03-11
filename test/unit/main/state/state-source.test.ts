/**
 * StateManager 源代码测试
 * 直接测试 src/modules/state.ts 的代码
 */

import { stateManager, Status } from '../../../../src/modules/state';

describe('StateManager 源代码测试', () => {
  beforeEach(() => {
    // 重置状态
    stateManager.status = Status.STOPPED;
    stateManager.pid = null;
    stateManager.port = null;
    stateManager.resetRestartAttempts();
    stateManager.setManualStop(false);
  });

  describe('状态管理', () => {
    test('初始状态应为 stopped', () => {
      expect(stateManager.status).toBe(Status.STOPPED);
    });

    test('应该能设置状态', () => {
      stateManager.status = Status.STARTING;
      expect(stateManager.status).toBe(Status.STARTING);
    });

    test('应该能设置 PID', () => {
      stateManager.pid = 12345;
      expect(stateManager.pid).toBe(12345);
    });

    test('应该能设置端口', () => {
      stateManager.port = 8188;
      expect(stateManager.port).toBe(8188);
    });
  });

  describe('启动检查', () => {
    test('stopped 状态应允许启动', () => {
      stateManager.status = Status.STOPPED;
      expect(stateManager.canStart()).toBe(true);
    });

    test('running 状态不应允许启动', () => {
      stateManager.status = Status.RUNNING;
      expect(stateManager.canStart()).toBe(false);
    });

    test('starting 状态不应允许启动', () => {
      stateManager.status = Status.STARTING;
      expect(stateManager.canStart()).toBe(false);
    });

    test('stopping 状态应允许启动（允许在停止过程中重启）', () => {
      stateManager.status = Status.STOPPING;
      expect(stateManager.canStart()).toBe(true);
    });

    test('failed 状态应允许启动', () => {
      stateManager.status = Status.FAILED;
      expect(stateManager.canStart()).toBe(true);
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

  describe('重启计数', () => {
    test('初始重启次数应为 0', () => {
      expect(stateManager.restartAttempts).toBe(0);
    });

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
  });

  describe('状态数据', () => {
    test('应该能获取状态数据', () => {
      const data = stateManager.getStateData();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('pid');
      expect(data).toHaveProperty('port');
    });
  });
});

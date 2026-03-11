/**
 * 服务状态测试
 * 测试 ComfyUI 服务的状态管理、状态转换、状态查询
 */

import { MockPortableService } from '../../../mocks/portable-service.mock';

describe('服务状态测试', () => {
  let service: MockPortableService;

  beforeEach(() => {
    service = new MockPortableService();
  });

  afterEach(() => {
    service.reset();
  });

  describe('初始状态', () => {
    test('初始状态应为 stopped', () => {
      expect(service.status).toBe('stopped');
    });

    test('初始 PID 应为 null', () => {
      expect(service.pid).toBeNull();
    });

    test('初始端口应为 null', () => {
      expect(service.port).toBeNull();
    });
  });

  describe('状态转换', () => {
    test('stopped → starting → running', async () => {
      expect(service.status).toBe('stopped');

      const startPromise = service.start('/test/comfyui', '/test/python', 8188);

      expect(service.status).toBe('starting');

      await startPromise;

      expect(service.status).toBe('running');
    });

    test('running → stopping → stopped', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      expect(service.status).toBe('running');

      const stopPromise = service.stop();

      expect(service.status).toBe('stopping');

      await stopPromise;

      expect(service.status).toBe('stopped');
    });

    test('running → restarting → running', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      expect(service.status).toBe('running');

      const restartPromise = service.restart();

      expect(service.status).toBe('restarting');

      await restartPromise;

      expect(service.status).toBe('running');
    });
  });

  describe('状态查询', () => {
    test('应能查询当前状态', () => {
      expect(service.status).toBe('stopped');
    });

    test('应能查询 PID', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      expect(service.pid).not.toBeNull();
      expect(typeof service.pid).toBe('number');
    });

    test('应能查询端口', async () => {
      await service.start('/test/comfyui', '/test/python', 9999);

      expect(service.port).toBe(9999);
    });
  });

  describe('状态一致性', () => {
    test('启动后状态和 PID 应一致', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      expect(service.status).toBe('running');
      expect(service.pid).not.toBeNull();
    });

    test('停止后状态和 PID 应一致', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      await service.stop();

      expect(service.status).toBe('stopped');
      expect(service.pid).toBeNull();
    });

    test('重启后状态和 PID 应一致', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      await service.restart();

      expect(service.status).toBe('running');
      expect(service.pid).not.toBeNull();
      // 注意：Mock 中 PID 可能相同，真实场景中应该不同
    });
  });

  describe('异常状态', () => {
    test('启动失败后状态应为 failed', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      service.simulateStartFailure();

      expect(service.status).toBe('failed');
    });

    test('进程崩溃后状态应为 failed', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      service.simulateCrash();

      expect(service.status).toBe('failed');
    });

    test('失败后 PID 应为 null', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      service.simulateCrash();

      expect(service.pid).toBeNull();
    });

    test('失败后端口应为 null', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      service.simulateCrash();

      expect(service.port).toBeNull();
    });
  });

  describe('状态恢复', () => {
    test('失败后应能重新启动', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      service.simulateCrash();

      expect(service.status).toBe('failed');

      await service.start('/test/comfyui', '/test/python', 9999);

      expect(service.status).toBe('running');
      expect(service.port).toBe(9999);
    });

    test('停止失败的服务应正常处理', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      service.simulateCrash();

      await service.stop();

      expect(service.status).toBe('stopped');
    });
  });

  describe('并发状态操作', () => {
    test('快速启动停止应保持状态一致', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      expect(service.status).toBe('running');

      await service.stop();
      expect(service.status).toBe('stopped');

      await service.start('/test/comfyui', '/test/python', 9999);
      expect(service.status).toBe('running');

      await service.stop();
      expect(service.status).toBe('stopped');
    });

    test('并发操作后状态应一致', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      await service.stop();
      await service.start('/test/comfyui', '/test/python', 9999);
      await service.stop();

      expect(service.status).toBe('stopped');
      expect(service.pid).toBeNull();
      expect(service.port).toBeNull();
    });
  });

  describe('状态持久性', () => {
    test('状态应在操作间保持', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      // 多次查询状态应保持一致
      expect(service.status).toBe('running');
      expect(service.status).toBe('running');
      expect(service.status).toBe('running');

      await service.stop();

      expect(service.status).toBe('stopped');
      expect(service.status).toBe('stopped');
    });

    test('PID 应在运行期间保持不变', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      const pid1 = service.pid;
      const pid2 = service.pid;
      const pid3 = service.pid;

      expect(pid1).toBe(pid2);
      expect(pid2).toBe(pid3);
    });
  });

  describe('边界情况', () => {
    test('未启动时查询 PID 应返回 null', () => {
      expect(service.pid).toBeNull();
    });

    test('未启动时查询端口应返回 null', () => {
      expect(service.port).toBeNull();
    });

    test('重置后状态应回到初始状态', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      service.reset();

      expect(service.status).toBe('stopped');
      expect(service.pid).toBeNull();
      expect(service.port).toBeNull();
    });
  });
});

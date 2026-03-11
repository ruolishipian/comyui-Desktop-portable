/**
 * 便携包启动测试
 * 测试 ComfyUI 便携包的启动、停止、状态管理
 */

import { MockPortableService } from '../../../mocks/portable-service.mock';

describe('便携包启动测试', () => {
  let service: MockPortableService;

  beforeEach(() => {
    service = new MockPortableService();
  });

  afterEach(() => {
    service.reset();
  });

  describe('启动服务', () => {
    test('应该成功启动服务', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      expect(service.status).toBe('running');
      expect(service.pid).toBe(12345);
      expect(service.port).toBe(8188);
    });

    test('启动时状态应变为 starting', async () => {
      const startPromise = service.start('/test/comfyui', '/test/python', 8188);

      // 在启动过程中检查状态
      expect(service.status).toBe('starting');

      await startPromise;
    });

    test('重复启动应抛出错误', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      await expect(service.start('/test/comfyui', '/test/python', 8188)).rejects.toThrow('Service is already running');
    });

    test('启动应分配 PID', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      expect(service.pid).not.toBeNull();
      expect(typeof service.pid).toBe('number');
    });

    test('启动应设置端口', async () => {
      await service.start('/test/comfyui', '/test/python', 9999);

      expect(service.port).toBe(9999);
    });
  });

  describe('停止服务', () => {
    test('应该成功停止服务', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      await service.stop();

      expect(service.status).toBe('stopped');
      expect(service.pid).toBeNull();
      expect(service.port).toBeNull();
    });

    test('停止时状态应变为 stopping', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      const stopPromise = service.stop();

      expect(service.status).toBe('stopping');

      await stopPromise;
    });

    test('停止已停止的服务应正常处理', async () => {
      await service.stop(); // 未启动就停止

      expect(service.status).toBe('stopped');
    });

    test('停止后 PID 应为 null', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      await service.stop();

      expect(service.pid).toBeNull();
    });
  });

  describe('重启服务', () => {
    test('应该成功重启服务', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      await service.restart();

      expect(service.status).toBe('running');
    });

    test('重启时状态应变为 restarting', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      const restartPromise = service.restart();

      expect(service.status).toBe('restarting');

      await restartPromise;
    });
  });

  describe('状态管理', () => {
    test('初始状态应为 stopped', () => {
      expect(service.status).toBe('stopped');
    });

    test('启动后状态应为 running', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      expect(service.status).toBe('running');
    });

    test('停止后状态应为 stopped', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      await service.stop();

      expect(service.status).toBe('stopped');
    });
  });

  describe('异常场景', () => {
    test('模拟启动失败', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      service.simulateStartFailure();

      expect(service.status).toBe('failed');
      expect(service.pid).toBeNull();
    });

    test('模拟进程崩溃', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      service.simulateCrash();

      expect(service.status).toBe('failed');
      expect(service.pid).toBeNull();
    });

    test('崩溃后应能重新启动', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      service.simulateCrash();

      await service.start('/test/comfyui', '/test/python', 8188);

      expect(service.status).toBe('running');
    });
  });

  describe('并发操作', () => {
    test('快速连续启动停止', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      await service.stop();
      await service.start('/test/comfyui', '/test/python', 8188);
      await service.stop();

      expect(service.status).toBe('stopped');
    });

    test('启动过程中停止', async () => {
      const startPromise = service.start('/test/comfyui', '/test/python', 8188);

      // 立即停止（不等待启动完成）
      const stopPromise = service.stop();

      // 等待所有操作完成
      await Promise.all([startPromise, stopPromise]);

      // 最终状态应为 stopped
      expect(service.status).toBe('stopped');
    });
  });

  describe('性能测试', () => {
    test('启动应在合理时间内完成', async () => {
      const startTime = Date.now();

      await service.start('/test/comfyui', '/test/python', 8188);

      const duration = Date.now() - startTime;

      // Mock 应该很快，设置 1 秒超时
      expect(duration).toBeLessThan(1000);
    });

    test('停止应在合理时间内完成', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      const startTime = Date.now();
      await service.stop();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });
});

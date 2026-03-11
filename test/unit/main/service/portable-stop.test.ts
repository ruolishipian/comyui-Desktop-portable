/**
 * 便携包停止测试
 * 测试 ComfyUI 便携包的停止、进程清理、端口释放
 */

import { MockPortableService } from '../../../mocks/portable-service.mock';

describe('便携包停止测试', () => {
  let service: MockPortableService;

  beforeEach(() => {
    service = new MockPortableService();
  });

  afterEach(() => {
    service.reset();
  });

  describe('正常停止', () => {
    test('应该成功停止运行中的服务', async () => {
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

    test('停止后进程应被清理', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      const pidBefore = service.pid;

      await service.stop();

      expect(pidBefore).not.toBeNull();
      expect(service.pid).toBeNull();
    });

    test('停止后端口应被释放', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      const portBefore = service.port;

      await service.stop();

      expect(portBefore).toBe(8188);
      expect(service.port).toBeNull();
    });
  });

  describe('停止已停止的服务', () => {
    test('停止未启动的服务应正常处理', async () => {
      await service.stop();

      expect(service.status).toBe('stopped');
    });

    test('重复停止应正常处理', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      await service.stop();
      await service.stop();

      expect(service.status).toBe('stopped');
    });

    test('多次停止不应抛出错误', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      await expect(async () => {
        await service.stop();
        await service.stop();
        await service.stop();
      }).not.toThrow();
    });
  });

  describe('停止过程中的状态', () => {
    test('停止过程中状态应为 stopping', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      const stopPromise = service.stop();

      // 在停止过程中检查状态
      expect(service.status).toBe('stopping');

      await stopPromise;

      // 停止完成后状态应为 stopped
      expect(service.status).toBe('stopped');
    });

    test('停止完成后应能重新启动', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      await service.stop();

      await service.start('/test/comfyui', '/test/python', 9999);

      expect(service.status).toBe('running');
      expect(service.port).toBe(9999);
    });
  });

  describe('异常停止', () => {
    test('进程崩溃后停止应正常处理', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      service.simulateCrash();

      await service.stop();

      expect(service.status).toBe('stopped');
      expect(service.pid).toBeNull();
    });

    test('启动失败后停止应正常处理', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      service.simulateStartFailure();

      await service.stop();

      expect(service.status).toBe('stopped');
    });
  });

  describe('并发停止', () => {
    test('同时多次调用停止应正常处理', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      // 同时调用多次停止
      await Promise.all([service.stop(), service.stop(), service.stop()]);

      expect(service.status).toBe('stopped');
    });

    test('停止过程中再次停止应正常处理', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      const stopPromise1 = service.stop();
      const stopPromise2 = service.stop();

      await Promise.all([stopPromise1, stopPromise2]);

      expect(service.status).toBe('stopped');
    });
  });

  describe('停止性能', () => {
    test('停止应在合理时间内完成', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      const startTime = Date.now();
      await service.stop();
      const duration = Date.now() - startTime;

      // Mock 应该很快，设置 1 秒超时
      expect(duration).toBeLessThan(1000);
    });

    test('停止不应阻塞后续操作', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      await service.stop();

      // 停止后应能立即执行其他操作
      await service.start('/test/comfyui', '/test/python', 9999);

      expect(service.status).toBe('running');
    });
  });

  describe('资源清理', () => {
    test('停止应清理所有资源', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);

      const pidBefore = service.pid;
      const portBefore = service.port;

      await service.stop();

      expect(pidBefore).not.toBeNull();
      expect(portBefore).not.toBeNull();
      expect(service.pid).toBeNull();
      expect(service.port).toBeNull();
    });

    test('停止后状态应完全重置', async () => {
      await service.start('/test/comfyui', '/test/python', 8188);
      await service.stop();

      expect(service.status).toBe('stopped');
      expect(service.pid).toBeNull();
      expect(service.port).toBeNull();
    });
  });
});

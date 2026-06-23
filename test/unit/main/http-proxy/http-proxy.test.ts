import { HttpProxyServer } from '../../../../src/modules/http-proxy';

describe('HttpProxyServer', () => {
  let proxy: HttpProxyServer;

  beforeEach(() => {
    proxy = new HttpProxyServer();
  });

  afterEach(() => {
    proxy.stop();
  });

  test('应该正确初始化', () => {
    expect(proxy.port).toBe(0);
    expect(proxy.url).toBe('http://127.0.0.1:0');
  });

  test('应该正确更新 ComfyUI 端口', () => {
    proxy.updateComfyuiPort(8188);
    expect(proxy.port).toBe(0);
  });

  test('stop 应该安全调用', () => {
    expect(() => proxy.stop()).not.toThrow();
  });
});
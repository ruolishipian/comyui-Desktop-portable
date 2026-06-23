import { AutoUpdateManager } from '../../../../src/modules/auto-update';

describe('AutoUpdateManager', () => {
  let manager: AutoUpdateManager;

  beforeEach(() => {
    manager = new AutoUpdateManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  test('应该正确初始化', () => {
    expect(manager.initialized).toBe(false);
  });

  test('init 应该设置 initialized 为 true', () => {
    manager.init();
    expect(manager.initialized).toBe(true);
  });

  test('destroy 应该设置 initialized 为 false', () => {
    manager.init();
    manager.destroy();
    expect(manager.initialized).toBe(false);
  });

  test('未初始化时 checkForUpdate 不应抛错', async () => {
    await expect(manager.checkForUpdate()).resolves.toBeUndefined();
  });

  test('未初始化时 downloadUpdate 不应抛错', async () => {
    await expect(manager.downloadUpdate()).resolves.toBeUndefined();
  });
});
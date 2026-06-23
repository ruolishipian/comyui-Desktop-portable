import { MultiViewManager } from '../../../../src/modules/multi-view';

describe('MultiViewManager', () => {
  let manager: MultiViewManager;

  beforeEach(() => {
    manager = new MultiViewManager();
  });

  test('getEntry 对不存在的窗口应返回 undefined', () => {
    expect(manager.getEntry(99999)).toBeUndefined();
  });

  test('destroyEntry 对不存在的窗口不应抛错', () => {
    expect(() => manager.destroyEntry(99999)).not.toThrow();
  });
});
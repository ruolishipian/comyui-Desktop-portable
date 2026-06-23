import { TerminalManager } from '../../../../src/modules/terminal';

describe('TerminalManager', () => {
  let manager: TerminalManager;

  beforeEach(() => {
    manager = new TerminalManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  test('destroy 应该安全调用', () => {
    expect(() => manager.destroy()).not.toThrow();
  });

  test('writeData 对不存在的 session 不应抛错', () => {
    expect(() => manager.writeData(99999, 'test')).not.toThrow();
  });

  test('resizeSession 对不存在的 session 不应抛错', () => {
    expect(() => manager.resizeSession(99999, 80, 24)).not.toThrow();
  });

  test('killSession 对不存在的 session 不应抛错', () => {
    expect(() => manager.killSession(99999)).not.toThrow();
  });
});
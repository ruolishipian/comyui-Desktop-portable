import { parseLogLine } from '../../../../src/modules/log-parser';

describe('log-parser', () => {
  test('应该解析 JSON 格式日志', () => {
    const result = parseLogLine('{"level":"info","message":"test message"}');
    expect(result).toBeDefined();
    expect(result?.level).toBe('info');
    expect(result?.message).toBe('test message');
  });

  test('应该处理非 JSON 格式日志', () => {
    const result = parseLogLine('plain text log line');
    expect(result).toBeDefined();
    expect(result?.message).toBe('plain text log line');
  });

  test('应该处理空行', () => {
    const result = parseLogLine('');
    expect(result).toBeNull();
  });
});
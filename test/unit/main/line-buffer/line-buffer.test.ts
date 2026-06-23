import { LineBuffer } from '../../../../src/modules/line-buffer';

describe('LineBuffer', () => {
  test('应该缓冲完整行并回调', () => {
    const lines: string[] = [];
    const buffer = new LineBuffer((line: string) => { lines.push(line); });
    buffer.push('line1\nline2\n');
    expect(lines).toEqual(['line1', 'line2']);
  });

  test('应该缓冲不完整行', () => {
    const lines: string[] = [];
    const buffer = new LineBuffer((line: string) => { lines.push(line); });
    buffer.push('partial');
    expect(lines).toEqual([]);
    buffer.push(' line\n');
    expect(lines).toEqual(['partial line']);
  });

  test('flush 应该回调未完成的行', () => {
    const lines: string[] = [];
    const buffer = new LineBuffer((line: string) => { lines.push(line); });
    buffer.push('incomplete');
    buffer.flush();
    expect(lines).toEqual(['incomplete']);
  });
});
/**
 * 行缓冲器
 * 解决 Node.js child_process data 事件不按行分割的问题
 * 缓存不完整的行，只在收到换行符时输出完整行
 */

export class LineBuffer {
  private _buffer: string = '';
  private _onLine: (line: string) => void;

  constructor(onLine: (line: string) => void) {
    this._onLine = onLine;
  }

  push(data: string): void {
    this._buffer += data;

    let newlineIndex: number;
    while ((newlineIndex = this._buffer.indexOf('\n')) !== -1) {
      const line = this._buffer.substring(0, newlineIndex);
      this._buffer = this._buffer.substring(newlineIndex + 1);

      const trimmed = line.replace(/\r$/, '').trim();
      if (trimmed) {
        this._onLine(trimmed);
      }
    }
  }

  flush(): void {
    const trimmed = this._buffer.trim();
    if (trimmed) {
      this._onLine(trimmed);
    }
    this._buffer = '';
  }

  reset(): void {
    this._buffer = '';
  }
}

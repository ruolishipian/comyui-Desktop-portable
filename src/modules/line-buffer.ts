/**
 * 行缓冲器
 * 解决 Node.js child_process data 事件不按行分割的问题
 * 缓存不完整的行，只在收到换行符时输出完整行
 *
 * 支持 \r 回车覆盖（tqdm 进度条等场景）：
 * - \r 开头：覆盖当前缓冲区内容（进度条更新）
 * - \n 结尾：正常换行输出
 */

export class LineBuffer {
  private _buffer: string = '';
  private _onLine: (line: string) => void;
  private readonly _maxBufferSize: number = 1024 * 1024;

  constructor(onLine: (line: string) => void) {
    this._onLine = onLine;
  }

  push(data: string): void {
    this._buffer += data;

    if (this._buffer.length > this._maxBufferSize) {
      const trimmed = this._buffer.substring(0, this._maxBufferSize).trim();
      if (trimmed) {
        this._onLine(trimmed);
      }
      this._buffer = '';
      return;
    }

    let newlineIndex: number;
    while ((newlineIndex = this._buffer.indexOf('\n')) !== -1) {
      const line = this._buffer.substring(0, newlineIndex);
      this._buffer = this._buffer.substring(newlineIndex + 1);

      const trimmed = line.replace(/\r$/, '').trim();
      if (trimmed) {
        this._onLine(trimmed);
      }
    }

    if (this._buffer.includes('\r')) {
      this._handleCarriageReturn();
    }
  }

  private _handleCarriageReturn(): void {
    const parts = this._buffer.split('\r');

    if (parts.length < 2) return;

    const lastPart = parts[parts.length - 1] ?? '';

    for (let i = 0; i < parts.length - 1; i++) {
      const trimmed = (parts[i] ?? '').trim();
      if (trimmed) {
        this._onLine(trimmed);
      }
    }

    this._buffer = lastPart;
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

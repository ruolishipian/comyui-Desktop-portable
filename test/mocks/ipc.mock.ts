/**
 * IPC Mock
 * 模拟主进程与渲染进程之间的通信
 */

type IpcHandler = (...args: unknown[]) => Promise<unknown> | unknown;
type IpcListener = (event: unknown, ...args: unknown[]) => void;

export class MockIpc {
  private _handlers: Map<string, IpcHandler> = new Map();
  private _listeners: Map<string, Set<IpcListener>> = new Map();

  // 注册处理器（主进程）
  public handle(channel: string, handler: IpcHandler): void {
    this._handlers.set(channel, handler);
  }

  // 移除处理器
  public removeHandler(channel: string): void {
    this._handlers.delete(channel);
  }

  // 调用处理器（渲染进程）
  public async invoke(channel: string, ...args: unknown[]): Promise<unknown> {
    const handler = this._handlers.get(channel);
    if (!handler) {
      throw new Error(`No handler registered for channel: ${channel}`);
    }
    return await handler(...args);
  }

  // 发送消息（渲染进程 -> 主进程）
  public send(channel: string, ...args: unknown[]): void {
    const listeners = this._listeners.get(channel);
    if (listeners) {
      const event = { sender: { send: jest.fn() } };
      listeners.forEach(listener => listener(event, ...args));
    }
  }

  // 监听消息（主进程）
  public on(channel: string, listener: IpcListener): void {
    if (!this._listeners.has(channel)) {
      this._listeners.set(channel, new Set());
    }
    this._listeners.get(channel)!.add(listener);
  }

  // 一次性监听
  public once(channel: string, listener: IpcListener): void {
    const onceListener: IpcListener = (event, ...args) => {
      listener(event, ...args);
      this.removeListener(channel, onceListener);
    };
    this.on(channel, onceListener);
  }

  // 移除监听器
  public removeListener(channel: string, listener: IpcListener): void {
    const listeners = this._listeners.get(channel);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  // 移除所有监听器
  public removeAllListeners(channel?: string): void {
    if (channel) {
      this._listeners.delete(channel);
    } else {
      this._listeners.clear();
    }
  }

  // 向渲染进程发送消息（主进程 -> 渲染进程）
  public sendToRenderer(channel: string, ...args: unknown[]): void {
    // 在实际 Electron 中，这会通过 webContents.send 发送
    // 这里我们触发对应的监听器
    const listeners = this._listeners.get(channel);
    if (listeners) {
      const event = {};
      listeners.forEach(listener => listener(event, ...args));
    }
  }

  // 清空所有
  public clear(): void {
    this._handlers.clear();
    this._listeners.clear();
  }

  // 用于测试：检查是否注册了处理器
  public hasHandler(channel: string): boolean {
    return this._handlers.has(channel);
  }

  // 用于测试：获取所有已注册的通道
  public getRegisteredChannels(): string[] {
    return Array.from(this._handlers.keys());
  }
}

// 导出主进程 IPC Mock
export const mockIpcMain = new MockIpc();

// 导出渲染进程 IPC Mock
export const mockIpcRenderer = new MockIpc();

// 导出默认
export default { mockIpcMain, mockIpcRenderer };

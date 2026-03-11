/**
 * 测试辅助函数模块
 * 提供统一的 Mock 对象创建、异步等待、事件触发等功能
 */

// ============== 类型定义 ==============

export interface MockEventEmitter {
  on: jest.Mock;
  off: jest.Mock;
  emit: jest.Mock;
  removeListener: jest.Mock;
}

export interface MockProcess {
  pid: number;
  killed: boolean;
  exitCode: number | null;
  signalCode: string | null;
  stdout: MockEventEmitter;
  stderr: MockEventEmitter;
  stdin: MockEventEmitter;
  on: jest.Mock;
  off: jest.Mock;
  kill: jest.Mock;
  disconnect: jest.Mock;
  unref: jest.Mock;
  ref: jest.Mock;
}

export interface MockWindow {
  id: number;
  isDestroyed: jest.Mock<() => boolean>;
  isMinimized: jest.Mock<() => boolean>;
  isVisible: jest.Mock<() => boolean>;
  isMaximized: jest.Mock<() => boolean>;
  isFocused: jest.Mock<() => boolean>;
  show: jest.Mock;
  hide: jest.Mock;
  close: jest.Mock;
  minimize: jest.Mock;
  maximize: jest.Mock;
  unmaximize: jest.Mock;
  restore: jest.Mock;
  focus: jest.Mock;
  blur: jest.Mock;
  reload: jest.Mock;
  getSize: jest.Mock<() => [number, number]>;
  getPosition: jest.Mock<() => [number, number]>;
  setSize: jest.Mock;
  setPosition: jest.Mock;
  setTitle: jest.Mock;
  getTitle: jest.Mock;
  loadFile: jest.Mock;
  loadURL: jest.Mock;
  on: jest.Mock;
  once: jest.Mock;
  removeListener: jest.Mock;
  removeAllListeners: jest.Mock;
  webContents: {
    id: number;
    send: jest.Mock;
    on: jest.Mock;
    once: jest.Mock;
    emit: jest.Mock;
    reload: jest.Mock;
    loadURL: jest.Mock;
    loadFile: jest.Mock;
    getURL: jest.Mock;
    getTitle: jest.Mock;
    isDestroyed: jest.Mock<() => boolean>;
    isLoading: jest.Mock<() => boolean>;
  };
}

export interface MockTray {
  setContextMenu: jest.Mock;
  setToolTip: jest.Mock;
  setTitle: jest.Mock;
  getImage: jest.Mock;
  setImage: jest.Mock;
  setPressedImage: jest.Mock;
  displayBalloon: jest.Mock;
  isDestroyed: jest.Mock<() => boolean>;
  destroy: jest.Mock;
  on: jest.Mock;
  once: jest.Mock;
  removeListener: jest.Mock;
  popUpContextMenu: jest.Mock;
  bounds: { x: number; y: number; width: number; height: number };
}

// ============== Mock 创建函数 ==============

/**
 * 创建 Mock 事件发射器
 */
export function createMockEventEmitter(): MockEventEmitter {
  const listeners: Map<string, Set<Function>> = new Map();

  return {
    on: jest.fn((event: string, callback: Function) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(callback);
    }),
    off: jest.fn((event: string, callback: Function) => {
      listeners.get(event)?.delete(callback);
    }),
    emit: jest.fn((event: string, ...args: unknown[]) => {
      listeners.get(event)?.forEach(cb => cb(...args));
    }),
    removeListener: jest.fn((event: string, callback: Function) => {
      listeners.get(event)?.delete(callback);
    })
  };
}

/**
 * 创建 Mock 进程对象
 * @param overrides 覆盖默认属性
 */
export function createMockProcess(overrides?: Partial<MockProcess>): MockProcess {
  const defaultProcess: MockProcess = {
    pid: 12345,
    killed: false,
    exitCode: null,
    signalCode: null,
    stdout: createMockEventEmitter(),
    stderr: createMockEventEmitter(),
    stdin: createMockEventEmitter(),
    on: jest.fn(),
    off: jest.fn(),
    kill: jest.fn(() => true),
    disconnect: jest.fn(),
    unref: jest.fn(),
    ref: jest.fn()
  };

  return { ...defaultProcess, ...overrides };
}

/**
 * 创建 Mock BrowserWindow 对象
 * @param overrides 覆盖默认属性
 */
export function createMockWindow(overrides?: Partial<MockWindow>): MockWindow {
  const defaultWindow: MockWindow = {
    id: 1,
    isDestroyed: jest.fn(() => false) as any,
    isMinimized: jest.fn(() => false) as any,
    isVisible: jest.fn(() => true) as any,
    isMaximized: jest.fn(() => false) as any,
    isFocused: jest.fn(() => true) as any,
    show: jest.fn(),
    hide: jest.fn(),
    close: jest.fn(),
    minimize: jest.fn(),
    maximize: jest.fn(),
    unmaximize: jest.fn(),
    restore: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
    reload: jest.fn(),
    getSize: jest.fn(() => [800, 600]) as any,
    getPosition: jest.fn(() => [100, 100]) as any,
    setSize: jest.fn(),
    setPosition: jest.fn(),
    setTitle: jest.fn(),
    getTitle: jest.fn(() => 'Test Window'),
    loadFile: jest.fn(),
    loadURL: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    webContents: {
      id: 1,
      send: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      emit: jest.fn(),
      reload: jest.fn(),
      loadURL: jest.fn(),
      loadFile: jest.fn(),
      getURL: jest.fn(() => 'file:///test.html'),
      getTitle: jest.fn(() => 'Test Page'),
      isDestroyed: jest.fn(() => false) as any,
      isLoading: jest.fn(() => false) as any
    }
  };

  return { ...defaultWindow, ...overrides };
}

/**
 * 创建 Mock Tray 对象
 * @param overrides 覆盖默认属性
 */
export function createMockTray(overrides?: Partial<MockTray>): MockTray {
  const defaultTray: MockTray = {
    setContextMenu: jest.fn(),
    setToolTip: jest.fn(),
    setTitle: jest.fn(),
    getImage: jest.fn(),
    setImage: jest.fn(),
    setPressedImage: jest.fn(),
    displayBalloon: jest.fn(),
    isDestroyed: jest.fn(() => false) as any,
    destroy: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
    popUpContextMenu: jest.fn(),
    bounds: { x: 0, y: 0, width: 16, height: 16 }
  };

  return { ...defaultTray, ...overrides };
}

// ============== 异步辅助函数 ==============

/**
 * 等待指定毫秒数
 * @param ms 等待时间（毫秒）
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 等待条件满足
 * @param condition 条件函数
 * @param timeout 超时时间（毫秒）
 * @param interval 检查间隔（毫秒）
 */
export async function waitForCondition(condition: () => boolean, timeout = 5000, interval = 50): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Timeout waiting for condition after ${timeout}ms`);
    }
    await waitFor(interval);
  }
}

/**
 * 等待 Mock 被调用
 * @param mock Jest Mock 对象
 * @param timeout 超时时间（毫秒）
 */
export async function waitForMockCall(mock: jest.Mock, timeout = 5000): Promise<void> {
  await waitForCondition(() => mock.mock.calls.length > 0, timeout);
}

// ============== 事件触发辅助函数 ==============

/**
 * 触发事件
 * @param emitter 事件发射器
 * @param event 事件名称
 * @param args 事件参数
 */
export function triggerEvent(emitter: { on: jest.Mock; emit?: jest.Mock }, event: string, ...args: unknown[]): void {
  // 找到注册的回调并执行
  const calls = emitter.on.mock.calls;
  for (const call of calls) {
    if (call[0] === event && typeof call[1] === 'function') {
      call[1](...args);
    }
  }
}

/**
 * 模拟进程退出事件
 * @param mockProcess Mock 进程对象
 * @param code 退出码
 * @param signal 信号
 */
export function simulateProcessExit(
  mockProcess: MockProcess,
  code: number | null = 0,
  signal: string | null = null
): void {
  triggerEvent(mockProcess, 'exit', code, signal);
}

/**
 * 模拟进程错误事件
 * @param mockProcess Mock 进程对象
 * @param error 错误对象
 */
export function simulateProcessError(mockProcess: MockProcess, error: Error): void {
  triggerEvent(mockProcess, 'error', error);
}

/**
 * 模拟进程标准输出
 * @param mockProcess Mock 进程对象
 * @param data 输出数据
 */
export function simulateProcessStdout(mockProcess: MockProcess, data: string): void {
  triggerEvent(mockProcess.stdout, 'data', Buffer.from(data));
}

/**
 * 模拟进程标准错误输出
 * @param mockProcess Mock 进程对象
 * @param data 错误输出数据
 */
export function simulateProcessStderr(mockProcess: MockProcess, data: string): void {
  triggerEvent(mockProcess.stderr, 'data', Buffer.from(data));
}

/**
 * 模拟窗口关闭事件
 * @param mockWindow Mock 窗口对象
 */
export function simulateWindowClose(mockWindow: MockWindow): void {
  triggerEvent(mockWindow, 'close');
}

/**
 * 模拟窗口准备就绪事件
 * @param mockWindow Mock 窗口对象
 */
export function simulateWindowReadyToShow(mockWindow: MockWindow): void {
  triggerEvent(mockWindow, 'ready-to-show');
}

// ============== 断言辅助函数 ==============

/**
 * 断言 Mock 被调用指定次数
 * @param mock Jest Mock 对象
 * @param times 期望调用次数
 */
export function assertCalledTimes(mock: jest.Mock, times: number): void {
  expect(mock).toHaveBeenCalledTimes(times);
}

/**
 * 断言 Mock 被调用时包含指定参数
 * @param mock Jest Mock 对象
 * @param args 期望的参数
 */
export function assertCalledWith(mock: jest.Mock, ...args: unknown[]): void {
  expect(mock).toHaveBeenCalledWith(...args);
}

/**
 * 断言 Mock 最后一次调用的参数
 * @param mock Jest Mock 对象
 * @param args 期望的参数
 */
export function assertLastCalledWith(mock: jest.Mock, ...args: unknown[]): void {
  expect(mock).toHaveBeenLastCalledWith(...args);
}

/**
 * 断言 Mock 返回值
 * @param mock Jest Mock 对象
 * @param value 期望的返回值
 */
export function assertReturned(mock: jest.Mock, value: unknown): void {
  expect(mock).toHaveReturnedWith(value);
}

// ============== Mock 状态辅助函数 ==============

/**
 * 创建一个可追踪状态的 Mock
 * @param initialValue 初始值
 */
export function createTrackableMock<T>(initialValue: T): {
  mock: jest.Mock<T, [T?]>;
  getValue: () => T;
  setValue: (value: T) => void;
} {
  let value = initialValue;
  const mock = jest.fn((newValue?: T) => {
    if (newValue !== undefined) {
      value = newValue;
    }
    return value;
  });

  return {
    mock,
    getValue: () => value,
    setValue: (newValue: T) => {
      value = newValue;
    }
  };
}

/**
 * 创建一个计数器 Mock
 */
export function createCounterMock(): {
  mock: jest.Mock;
  getCount: () => number;
  reset: () => void;
} {
  let count = 0;
  const mock = jest.fn(() => {
    count++;
    return count;
  });

  return {
    mock,
    getCount: () => count,
    reset: () => {
      count = 0;
      mock.mockClear();
    }
  };
}

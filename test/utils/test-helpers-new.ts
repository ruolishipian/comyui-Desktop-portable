/**
 * 测试工具函数库
 * 提供常用的测试辅助函数
 */

import { jest } from '@jest/globals';

// ============================================
// 异步工具
// ============================================

/**
 * 等待条件满足
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    errorMessage?: string;
  } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100, errorMessage } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(errorMessage || `Timeout waiting for condition after ${timeout}ms`);
}

/**
 * 延迟执行
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试异步操作
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delay: retryDelay = 1000, shouldRetry } = options;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts && (!shouldRetry || shouldRetry(lastError))) {
        await delay(retryDelay);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Retry failed');
}

// ============================================
// Mock 工具
// ============================================

/**
 * 创建 Mock 函数
 */
export function createMockFn<T extends (...args: any[]) => any>(implementation?: T) {
  return jest.fn(implementation);
}

/**
 * 创建 Mock 对象
 */
export function createMockObject<T extends object>(overrides: Partial<T> = {}): T {
  const mock = {} as T;

  Object.keys(overrides).forEach(key => {
    const value = (overrides as any)[key];
    if (typeof value === 'function') {
      (mock as any)[key] = jest.fn(value);
    } else {
      (mock as any)[key] = value;
    }
  });

  return mock;
}

/**
 * 创建 Spy
 */
export function createSpy<T extends object, K extends keyof T>(obj: T, method: K) {
  return jest.spyOn(obj, method as any);
}

// ============================================
// 测试数据生成
// ============================================

/**
 * 生成随机测试数据
 */
export const testData = {
  /**
   * 生成随机端口号
   */
  randomPort: (min = 1024, max = 65535): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * 生成随机路径
   */
  randomPath: (prefix = '/test'): string => {
    return `${prefix}/path-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  },

  /**
   * 生成随机字符串
   */
  randomString: (length = 10): string => {
    return Math.random()
      .toString(36)
      .substring(2, length + 2);
  },

  /**
   * 生成随机整数
   */
  randomInt: (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * 生成随机布尔值
   */
  randomBoolean: (): boolean => {
    return Math.random() > 0.5;
  },

  /**
   * 生成随机邮箱
   */
  randomEmail: (): string => {
    return `test-${Date.now()}@example.com`;
  },

  /**
   * 生成随机 URL
   */
  randomUrl: (): string => {
    return `https://example.com/${testData.randomString()}`;
  },

  /**
   * 生成随机日期
   */
  randomDate: (start = new Date(2020, 0, 1), end = new Date()): Date => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  },

  /**
   * 生成随机数组
   */
  randomArray: <T>(generator: () => T, length = 5): T[] => {
    return Array.from({ length }, generator);
  }
};

// ============================================
// 断言工具
// ============================================

/**
 * 断言函数抛出错误
 */
export async function expectToThrow(fn: () => Promise<any> | any, errorMessage?: string | RegExp): Promise<Error> {
  try {
    await fn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error) {
    if (errorMessage) {
      const message = (error as Error).message;
      if (typeof errorMessage === 'string') {
        expect(message).toContain(errorMessage);
      } else {
        expect(message).toMatch(errorMessage);
      }
    }
    return error as Error;
  }
}

/**
 * 断言异步函数抛出错误
 */
export async function expectAsyncToThrow(fn: () => Promise<any>, errorMessage?: string | RegExp): Promise<Error> {
  return expectToThrow(fn, errorMessage);
}

/**
 * 断言对象包含属性
 */
export function expectToHaveProperties<T extends object>(obj: T, properties: (keyof T)[]): void {
  properties.forEach(prop => {
    expect(obj).toHaveProperty(prop as string);
  });
}

// ============================================
// 文件系统工具
// ============================================

/**
 * 等待文件存在
 */
export async function waitForFile(filePath: string, timeout = 5000): Promise<void> {
  const fs = await import('fs/promises');

  await waitFor(
    async () => {
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    },
    { timeout, errorMessage: `File ${filePath} does not exist after ${timeout}ms` }
  );
}

/**
 * 等待文件内容包含指定文本
 */
export async function waitForFileContent(filePath: string, content: string, timeout = 5000): Promise<void> {
  const fs = await import('fs/promises');

  await waitFor(
    async () => {
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return fileContent.includes(content);
      } catch {
        return false;
      }
    },
    { timeout, errorMessage: `File ${filePath} does not contain "${content}" after ${timeout}ms` }
  );
}

// ============================================
// 进程工具
// ============================================

/**
 * 等待进程启动
 */
export async function waitForProcess(port: number, timeout = 30000): Promise<void> {
  const net = await import('net');

  await waitFor(
    () => {
      return new Promise(resolve => {
        const socket = new net.Socket();
        socket.setTimeout(1000);

        socket.on('connect', () => {
          socket.destroy();
          resolve(true);
        });

        socket.on('error', () => {
          resolve(false);
        });

        socket.on('timeout', () => {
          socket.destroy();
          resolve(false);
        });

        socket.connect(port, 'localhost');
      });
    },
    { timeout, errorMessage: `Process on port ${port} did not start after ${timeout}ms` }
  );
}

/**
 * 检查端口是否被占用
 */
export async function isPortInUse(port: number): Promise<boolean> {
  const net = await import('net');

  return new Promise(resolve => {
    const socket = new net.Socket();
    socket.setTimeout(1000);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      resolve(false);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, 'localhost');
  });
}

// ============================================
// 时间工具
// ============================================

/**
 * 模拟时间流逝
 */
export function mockDate(date: Date): any {
  return jest.spyOn(global, 'Date').mockImplementation(() => date as any);
}

/**
 * 恢复时间
 */
export function restoreDate(spy: any): void {
  spy.mockRestore();
}

// ============================================
// 日志工具
// ============================================

/**
 * 捕获控制台输出
 */
export function captureConsole(): {
  logs: string[];
  errors: string[];
  warnings: string[];
  restore: () => void;
} {
  const logs: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args: any[]) => {
    logs.push(args.join(' '));
    originalLog.apply(console, args);
  };

  console.error = (...args: any[]) => {
    errors.push(args.join(' '));
    originalError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    warnings.push(args.join(' '));
    originalWarn.apply(console, args);
  };

  return {
    logs,
    errors,
    warnings,
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }
  };
}

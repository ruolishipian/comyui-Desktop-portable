/**
 * Playwright 类型声明
 * 用于在没有安装 @playwright/test 时提供类型支持
 */

declare module '@playwright/test' {
  export interface TestConfig {
    testDir?: string;
    timeout?: number;
    fullyParallel?: boolean;
    retries?: number;
    workers?: number;
    reporter?: string | string[];
    use?: Record<string, unknown>;
    projects?: Array<{
      name: string;
      use?: Record<string, unknown>;
    }>;
  }

  export interface TestFixtures {
    page: unknown;
    context: unknown;
    browser: unknown;
    browserName: string;
  }

  export type TestType = {
    (title: string, fn: () => Promise<void> | void): void;
    only: (title: string, fn: () => Promise<void> | void) => void;
    skip: (title: string, fn: () => Promise<void> | void) => void;
    describe: {
      (title: string, fn: () => void): void;
      only: (title: string, fn: () => void) => void;
      skip: (title: string, fn: () => void) => void;
    };
    beforeAll: (fn: () => Promise<void> | void) => void;
    beforeEach: (fn: () => Promise<void> | void) => void;
    afterAll: (fn: () => Promise<void> | void) => void;
    afterEach: (fn: () => Promise<void> | void) => void;
  };

  export type ExpectType = {
    <T>(actual: T): {
      toBe: (expected: T) => void;
      toEqual: (expected: T) => void;
      toBeTruthy: () => void;
      toBeFalsy: () => void;
      toContain: (expected: T) => void;
      toHaveLength: (expected: number) => void;
      toBeNull: () => void;
      toBeUndefined: () => void;
      toBeDefined: () => void;
      toBeGreaterThan: (expected: number) => void;
      toBeLessThan: (expected: number) => void;
      toBeInstanceOf: (expected: Function) => void;
      toHaveProperty: (propertyPath: string, value?: unknown) => void;
      toMatch: (expected: string | RegExp) => void;
      toMatchObject: (expected: Record<string, unknown>) => void;
      toThrow: (expected?: string | RegExp | Error) => void;
      toThrowError: (expected?: string | RegExp | Error) => void;
      resolves: {
        toBe: (expected: T) => Promise<void>;
        toEqual: (expected: T) => Promise<void>;
      };
      rejects: {
        toThrow: (expected?: string | RegExp | Error) => Promise<void>;
      };
    };
  };

  export const test: TestType;
  export const expect: ExpectType;

  export function defineConfig(config: TestConfig): TestConfig;
}

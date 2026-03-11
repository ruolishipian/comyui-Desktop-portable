/**
 * 测试 Fixtures
 * 提供可复用的测试设置和工具
 */

import { test as base, expect } from '@playwright/test';
import { ConfigPage } from '../e2e/pages/ConfigPage';
import { MainPage } from '../e2e/pages/MainPage';
import { TestEnvironment } from '../utils/TestEnvironment';

// ============================================
// Fixtures 类型定义
// ============================================

/**
 * 自定义 Fixtures 类型
 */
type MyFixtures = {
  configPage: ConfigPage;
  mainPage: MainPage;
  testEnv: TestEnvironment;
};

// ============================================
// Playwright Fixtures
// ============================================

/**
 * 扩展的测试对象
 */
export const test = base.extend<MyFixtures>({
  /**
   * 配置页面 Fixture
   */
  configPage: async ({ page }, use) => {
    const configPage = new ConfigPage(page);
    await use(configPage);
  },

  /**
   * 主页面 Fixture
   */
  mainPage: async ({ page }, use) => {
    const mainPage = new MainPage(page);
    await use(mainPage);
  },

  /**
   * 测试环境 Fixture
   */
  testEnv: async ({}, use) => {
    const env = new TestEnvironment();
    await env.setup();
    await use(env);
    await env.cleanup();
  }
});

// 导出 expect
export { expect };

// ============================================
// Jest Fixtures (用于单元测试)
// ============================================

/**
 * 创建测试环境
 */
export function createTestEnv() {
  let env: TestEnvironment;

  beforeEach(async () => {
    env = new TestEnvironment();
    await env.setup();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  return {
    getEnv: () => env
  };
}

/**
 * 创建 Mock Store
 */
export function createTestStore() {
  const store = new Map<string, any>();

  return {
    get: (key: string) => store.get(key),
    set: (key: string, value: any) => store.set(key, value),
    has: (key: string) => store.has(key),
    delete: (key: string) => store.delete(key),
    clear: () => store.clear()
  };
}

/**
 * 创建测试配置
 */
export function createTestConfig(overrides: Partial<any> = {}) {
  return {
    port: 8188,
    autoStart: false,
    modelDir: '/test/models',
    ...overrides
  };
}

// ============================================
// 测试套件工具
// ============================================

/**
 * 描述测试套件
 */
export function describeSuite(
  name: string,
  fn: () => void,
  options: {
    skip?: boolean;
    only?: boolean;
    timeout?: number;
  } = {}
) {
  const { skip, only, timeout } = options;

  let describeFn = describe;

  if (skip) {
    describeFn = describe.skip;
  } else if (only) {
    describeFn = describe.only;
  }

  describeFn(name, () => {
    if (timeout) {
      jest.setTimeout(timeout);
    }
    fn();
  });
}

/**
 * 描述测试用例
 */
export function describeTest(
  name: string,
  fn: () => void | Promise<void>,
  options: {
    skip?: boolean;
    only?: boolean;
    timeout?: number;
  } = {}
) {
  const { skip, only, timeout } = options;

  let testFn = test;

  if (skip) {
    testFn = test.skip;
  } else if (only) {
    testFn = test.only;
  }

  testFn(name, async () => {
    if (timeout) {
      jest.setTimeout(timeout);
    }
    await fn();
  });
}

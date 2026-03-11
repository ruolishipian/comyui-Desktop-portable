/**
 * Jest 全局设置文件
 * 确保所有测试在正确的定时器状态下运行
 */

import { beforeAll, afterEach, afterAll, jest } from '@jest/globals';

// 在所有测试之前执行
beforeAll(() => {
  // 确保使用真实定时器
  jest.useRealTimers();
});

// 在每个测试之后执行
afterEach(() => {
  // 确保定时器被正确清理
  jest.useRealTimers();
});

// 在所有测试之后执行
afterAll(() => {
  // 最终清理
  jest.useRealTimers();
});

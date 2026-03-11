/**
 * 集成测试环境设置
 * 准备测试环境、清理测试数据
 */

import fs from 'fs';
import path from 'path';

// 测试目录
const testDir = path.join(__dirname, '../test-temp');
const testConfigDir = path.join(testDir, 'config');
const testLogsDir = path.join(testDir, 'logs');

// 创建测试目录
function setupTestEnvironment() {
  // 创建主测试目录
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // 创建配置目录
  if (!fs.existsSync(testConfigDir)) {
    fs.mkdirSync(testConfigDir, { recursive: true });
  }

  // 创建日志目录
  if (!fs.existsSync(testLogsDir)) {
    fs.mkdirSync(testLogsDir, { recursive: true });
  }

  console.log('测试环境已准备就绪');
}

// 清理测试数据
function cleanupTestEnvironment() {
  // 清理测试目录
  if (fs.existsSync(testDir)) {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
      console.log('测试环境已清理');
    } catch (error) {
      console.warn('清理测试环境时出错:', error);
    }
  }
}

// 全局设置
beforeAll(() => {
  setupTestEnvironment();
});

// 全局清理
afterAll(() => {
  cleanupTestEnvironment();
});

// 导出工具函数
export { testDir, testConfigDir, testLogsDir, setupTestEnvironment, cleanupTestEnvironment };

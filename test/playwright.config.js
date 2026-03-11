/**
 * Playwright 配置 - E2E 测试
 * 用于 Electron 应用的端到端测试
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Electron 测试建议单线程
  reporter: [['list'], ['html', { outputFolder: 'coverage/e2e-report' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'electron',
      use: {
        // Electron 特定配置将在测试文件中设置
      }
    }
  ],
  outputDir: 'test-results/',
  timeout: 30000,
  expect: {
    timeout: 10000
  }
});

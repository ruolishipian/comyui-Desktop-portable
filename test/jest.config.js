/**
 * Jest 配置 - 主进程单元测试
 * 适用于 Node 环境的测试
 */

module.exports = {
  rootDir: '../',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/unit/main/**/*.test.ts', '<rootDir>/test/unit/common/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['src/modules/**/*.ts', '!src/modules/**/*.d.ts', '!src/types/**/*.ts'],
  coverageDirectory: 'coverage/unit-main',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup-mocks.js', '<rootDir>/test/setup-timers.ts'],
  moduleNameMapper: {
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testTimeout: 10000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  // 排除参考项目和 E2E 测试
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/ComfyUI-Desktop-Analysis/', '/test/e2e/', '/test/integration/']
};

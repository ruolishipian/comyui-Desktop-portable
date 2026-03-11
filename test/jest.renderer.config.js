/**
 * Jest 配置 - 渲染进程单元测试
 * 适用于浏览器环境的测试
 */

module.exports = {
  rootDir: '../',
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/test/unit/renderer/**/*.test.tsx', '<rootDir>/test/unit/renderer/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json'
      }
    ]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['src/renderer/**/*.{ts,tsx}', '!src/renderer/**/*.d.ts'],
  coverageDirectory: 'coverage/unit-renderer',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup-mocks.js', '<rootDir>/test/setup-react.ts'],
  moduleNameMapper: {
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  testTimeout: 10000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  // 排除参考项目和 E2E 测试
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/ComfyUI-Desktop-Analysis/', '/test/e2e/', '/test/integration/']
};

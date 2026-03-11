/**
 * Jest 配置 - 集成测试
 * 测试实际源代码而非 Mock 对象
 */

module.exports = {
  rootDir: '../',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/integration/**/*.integration.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json'
      }
    ]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['src/modules/**/*.ts', '!src/modules/**/*.d.ts', '!src/types/**/*.ts'],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup-integration.ts'],
  moduleNameMapper: {
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testTimeout: 30000, // 集成测试需要更长时间
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  // 集成测试需要访问实际文件系统，排除参考项目和 E2E 测试
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/ComfyUI-Desktop-Analysis/', '/test/e2e/']
};

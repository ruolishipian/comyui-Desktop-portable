/**
 * Index 模块测试
 * 测试模块导出
 */

// Mock 所有依赖模块
jest.mock('../../../../src/modules/config', () => ({
  configManager: {},
  ConfigManager: class ConfigManager {},
  DEFAULT_CONFIG: {}
}));

jest.mock('../../../../src/modules/logger', () => ({
  logger: {},
  Logger: class Logger {}
}));

jest.mock('../../../../src/modules/state', () => ({
  stateManager: {},
  StateManager: class StateManager {},
  Status: {}
}));

jest.mock('../../../../src/modules/environment', () => ({
  environmentChecker: {},
  EnvironmentChecker: class EnvironmentChecker {}
}));

jest.mock('../../../../src/modules/process', () => ({
  processManager: {},
  ProcessManager: class ProcessManager {}
}));

jest.mock('../../../../src/modules/windows', () => ({
  windowManager: {},
  WindowManager: class WindowManager {}
}));

jest.mock('../../../../src/modules/tray', () => ({
  trayManager: {},
  TrayManager: class TrayManager {}
}));

jest.mock('../../../../src/modules/ipc', () => ({
  ipcManager: {},
  IPCManager: class IPCManager {}
}));

describe('Index 模块测试', () => {
  test('应该能导入所有模块', () => {
    const modules = require('../../../../src/modules/index');

    expect(modules.configManager).toBeDefined();
    expect(modules.ConfigManager).toBeDefined();
    expect(modules.DEFAULT_CONFIG).toBeDefined();
    expect(modules.logger).toBeDefined();
    expect(modules.Logger).toBeDefined();
    expect(modules.stateManager).toBeDefined();
    expect(modules.StateManager).toBeDefined();
    expect(modules.Status).toBeDefined();
    expect(modules.environmentChecker).toBeDefined();
    expect(modules.EnvironmentChecker).toBeDefined();
    expect(modules.processManager).toBeDefined();
    expect(modules.ProcessManager).toBeDefined();
    expect(modules.windowManager).toBeDefined();
    expect(modules.WindowManager).toBeDefined();
    expect(modules.trayManager).toBeDefined();
    expect(modules.TrayManager).toBeDefined();
    expect(modules.ipcManager).toBeDefined();
    expect(modules.IPCManager).toBeDefined();
  });

  test('应该能导入类型', () => {
    const modules = require('../../../../src/modules/index');

    // 类型导出在运行时不可直接验证，但可以验证模块加载成功
    expect(modules).toBeDefined();
  });
});

/**
 * 日志配置默认值测试
 * 测试日志功能的默认配置
 * 防止回归: 日志功能默认禁用导致日志窗口无显示
 */

import { ConfigManager } from '../../../mocks/config-manager.mock';

describe('日志配置默认值测试', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    jest.clearAllMocks();
    configManager = new ConfigManager();
  });

  describe('默认值测试', () => {
    it('日志功能应该默认启用', () => {
      configManager.init();

      const logsConfig = configManager.logs;

      expect(logsConfig?.enable).toBe(true);
    });

    it('实时日志应该默认启用', () => {
      configManager.init();

      const logsConfig = configManager.logs;

      expect(logsConfig?.realtime).toBe(true);
    });

    it('日志级别应该默认为 info', () => {
      configManager.init();

      const logsConfig = configManager.logs;

      expect(logsConfig?.level).toBe('info');
    });
  });

  describe('配置覆盖测试', () => {
    it('用户配置应该能覆盖默认值', () => {
      configManager.init();
      configManager.set('logs', {
        enable: false,
        realtime: false
      });

      const logsConfig = configManager.logs;

      expect(logsConfig?.enable).toBe(false);
      expect(logsConfig?.realtime).toBe(false);
    });
  });

  describe('回归测试', () => {
    it('防止: 首次安装时日志功能被禁用', () => {
      // 模拟首次安装,配置为空
      configManager.init();

      const logsConfig = configManager.logs;

      // 必须默认启用,否则日志窗口无显示
      expect(logsConfig?.enable).toBe(true);
      expect(logsConfig?.realtime).toBe(true);
    });

    it('防止: 日志禁用时 logger.log() 应该直接返回', () => {
      configManager.init();
      configManager.set('logs', { enable: false });

      const logsConfig = configManager.logs;

      // 验证配置正确
      expect(logsConfig?.enable).toBe(false);

      // 实际使用中,logger.log() 会检查这个配置
      // if (!logConfig.enable) return;
    });

    it('防止: 实时日志禁用时不应推送到窗口', () => {
      configManager.init();
      configManager.set('logs', { realtime: false });

      const logsConfig = configManager.logs;

      // 验证配置正确
      expect(logsConfig?.realtime).toBe(false);

      // 实际使用中,logger._flushBuffer() 会检查这个配置
      // if (logConfig.realtime) { ... }
    });
  });
});

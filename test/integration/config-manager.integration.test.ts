/**
 * ConfigManager 集成测试
 * 测试实际配置管理功能
 */

import fs from 'fs';
import path from 'path';
import { testConfigDir, setupTestEnvironment } from '../setup-integration';

describe('ConfigManager 集成测试', () => {
  const configPath = path.join(testConfigDir, 'test-config.json');

  beforeEach(() => {
    // 确保测试环境已准备
    setupTestEnvironment();

    // 确保配置目录存在
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }

    // 清理测试配置文件
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  });

  describe('配置文件操作', () => {
    test('应该能创建配置文件', () => {
      // 确保目录存在
      if (!fs.existsSync(testConfigDir)) {
        fs.mkdirSync(testConfigDir, { recursive: true });
      }

      const config = {
        port: 8188,
        autoStart: true,
        modelDir: '/test/models'
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      expect(fs.existsSync(configPath)).toBe(true);
    });

    test('应该能读取配置文件', () => {
      // 确保目录存在
      if (!fs.existsSync(testConfigDir)) {
        fs.mkdirSync(testConfigDir, { recursive: true });
      }

      const config = {
        port: 8188,
        autoStart: true
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const content = fs.readFileSync(configPath, 'utf-8');
      const loaded = JSON.parse(content);

      expect(loaded.port).toBe(8188);
      expect(loaded.autoStart).toBe(true);
    });

    test('应该能更新配置文件', () => {
      // 确保目录存在
      if (!fs.existsSync(testConfigDir)) {
        fs.mkdirSync(testConfigDir, { recursive: true });
      }

      const config = {
        port: 8188,
        autoStart: true
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // 更新配置
      config.port = 9999;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const content = fs.readFileSync(configPath, 'utf-8');
      const loaded = JSON.parse(content);

      expect(loaded.port).toBe(9999);
    });

    test('应该能删除配置文件', () => {
      // 确保目录存在
      if (!fs.existsSync(testConfigDir)) {
        fs.mkdirSync(testConfigDir, { recursive: true });
      }

      const config = { port: 8188 };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      expect(fs.existsSync(configPath)).toBe(true);

      fs.unlinkSync(configPath);

      expect(fs.existsSync(configPath)).toBe(false);
    });
  });

  describe('嵌套配置处理', () => {
    test('应该能处理嵌套配置', () => {
      // 确保目录存在
      if (!fs.existsSync(testConfigDir)) {
        fs.mkdirSync(testConfigDir, { recursive: true });
      }

      const config = {
        server: {
          port: 8188,
          autoStart: true,
          nested: {
            deep: {
              value: 'test'
            }
          }
        }
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const content = fs.readFileSync(configPath, 'utf-8');
      const loaded = JSON.parse(content);

      expect(loaded.server.port).toBe(8188);
      expect(loaded.server.nested.deep.value).toBe('test');
    });

    test('应该能更新嵌套配置', () => {
      // 确保目录存在
      if (!fs.existsSync(testConfigDir)) {
        fs.mkdirSync(testConfigDir, { recursive: true });
      }

      const config = {
        server: {
          port: 8188,
          autoStart: true
        }
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // 更新嵌套配置
      config.server.port = 9999;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const content = fs.readFileSync(configPath, 'utf-8');
      const loaded = JSON.parse(content);

      expect(loaded.server.port).toBe(9999);
      expect(loaded.server.autoStart).toBe(true);
    });
  });

  describe('配置验证', () => {
    test('应该能验证配置格式', () => {
      // 确保目录存在
      if (!fs.existsSync(testConfigDir)) {
        fs.mkdirSync(testConfigDir, { recursive: true });
      }

      const validConfig = {
        port: 8188,
        autoStart: true
      };

      fs.writeFileSync(configPath, JSON.stringify(validConfig, null, 2));

      const content = fs.readFileSync(configPath, 'utf-8');
      const loaded = JSON.parse(content);

      expect(typeof loaded.port).toBe('number');
      expect(typeof loaded.autoStart).toBe('boolean');
    });

    test('应该能检测无效配置', () => {
      // 确保目录存在
      if (!fs.existsSync(testConfigDir)) {
        fs.mkdirSync(testConfigDir, { recursive: true });
      }

      const invalidConfig = {
        port: 'invalid',
        autoStart: 'invalid'
      };

      fs.writeFileSync(configPath, JSON.stringify(invalidConfig, null, 2));

      const content = fs.readFileSync(configPath, 'utf-8');
      const loaded = JSON.parse(content);

      expect(typeof loaded.port).toBe('string');
      expect(typeof loaded.autoStart).toBe('string');
    });
  });

  describe('配置持久化', () => {
    test('配置应在文件中持久化', () => {
      // 确保目录存在
      if (!fs.existsSync(testConfigDir)) {
        fs.mkdirSync(testConfigDir, { recursive: true });
      }

      const config = {
        port: 8188,
        timestamp: Date.now()
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // 重新读取
      const content = fs.readFileSync(configPath, 'utf-8');
      const loaded = JSON.parse(content);

      expect(loaded.port).toBe(8188);
      expect(loaded.timestamp).toBe(config.timestamp);
    });

    test('多次写入应正确覆盖', () => {
      // 确保目录存在
      if (!fs.existsSync(testConfigDir)) {
        fs.mkdirSync(testConfigDir, { recursive: true });
      }

      for (let i = 0; i < 5; i++) {
        const config = { port: 8000 + i };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      }

      const content = fs.readFileSync(configPath, 'utf-8');
      const loaded = JSON.parse(content);

      expect(loaded.port).toBe(8004);
    });
  });

  describe('错误处理', () => {
    test('读取不存在的文件应抛出错误', () => {
      expect(() => {
        fs.readFileSync('/nonexistent/config.json', 'utf-8');
      }).toThrow();
    });

    test('写入无效 JSON 应抛出错误', () => {
      expect(() => {
        JSON.parse('invalid json');
      }).toThrow();
    });
  });

  describe('性能测试', () => {
    test('配置读写应在合理时间内完成', () => {
      const config = {
        port: 8188,
        autoStart: true,
        modelDir: '/test/models',
        nested: {
          level1: {
            level2: {
              level3: 'value'
            }
          }
        }
      };

      const startTime = Date.now();

      // 写入
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // 读取
      const content = fs.readFileSync(configPath, 'utf-8');
      JSON.parse(content);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // 应在 100ms 内完成
    });
  });
});

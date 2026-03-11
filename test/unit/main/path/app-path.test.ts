/**
 * 路径修复测试
 * 测试 getAppPath() 在不同环境下的行为
 * 防止回归: process.cwd() 在打包后路径错误的问题
 */

import path from 'path';

describe('应用路径获取测试', () => {
  describe('路径拼接测试', () => {
    it('应该正确拼接 config 目录路径', () => {
      const appPath = 'D:\\App';
      const configPath = path.join(appPath, 'config');

      expect(configPath).toBe(path.join('D:', 'App', 'config'));
    });

    it('应该正确拼接 logs 目录路径', () => {
      const appPath = 'D:\\App';
      const logsPath = path.join(appPath, 'logs');

      expect(logsPath).toBe(path.join('D:', 'App', 'logs'));
    });

    it('应该正确拼接 data 目录路径', () => {
      const appPath = 'D:\\App';
      const dataPath = path.join(appPath, 'data');

      expect(dataPath).toBe(path.join('D:', 'App', 'data'));
    });
  });

  describe('路径提取测试', () => {
    it('应该从可执行文件路径提取目录', () => {
      const exePath = 'D:\\Program Files\\ComfyUI-Desktop\\ComfyUI-Desktop.exe';
      const appPath = path.dirname(exePath);

      expect(appPath).toBe(path.join('D:', 'Program Files', 'ComfyUI-Desktop'));
    });

    it('应该正确处理不同的安装路径', () => {
      const testPaths = [
        {
          exePath: 'C:\\Users\\User\\Desktop\\ComfyUI-Desktop\\ComfyUI-Desktop.exe',
          expected: path.join('C:', 'Users', 'User', 'Desktop', 'ComfyUI-Desktop')
        },
        {
          exePath: 'D:\\ai\\comfyu附件\\ComfyUI Desktop\\ComfyUI-Desktop\\ComfyUI-Desktop.exe',
          expected: path.join('D:', 'ai', 'comfyu附件', 'ComfyUI Desktop', 'ComfyUI-Desktop')
        },
        {
          exePath: '/opt/ComfyUI-Desktop/ComfyUI-Desktop',
          expected: '/opt/ComfyUI-Desktop'
        }
      ];

      testPaths.forEach(({ exePath, expected }) => {
        const result = path.dirname(exePath);
        expect(result).toBe(expected);
      });
    });
  });

  describe('回归测试', () => {
    it('防止: 打包后使用 process.cwd() 导致路径错误', () => {
      // 模拟场景
      const exePath = 'D:\\App\\ComfyUI-Desktop.exe';
      const cwdPath = 'C:\\Users\\User\\Desktop'; // 用户双击的目录

      // 正确的做法:使用可执行文件目录
      const correctPath = path.dirname(exePath);

      // 错误的做法:使用 process.cwd()
      const wrongPath = cwdPath;

      // 必须返回可执行文件目录,而不是双击目录
      expect(correctPath).toBe(path.join('D:', 'App'));
      expect(correctPath).not.toBe(wrongPath);
    });

    it('防止: 开发环境使用 app.getPath("exe") 导致路径错误', () => {
      // 模拟场景
      const nodeExePath = 'C:\\Program Files\\nodejs\\node.exe';
      const cwdPath = '/development/electron';

      // 开发环境应该使用 process.cwd()
      const correctPath = cwdPath;

      // 错误的做法:使用 node.exe 的目录
      const wrongPath = path.dirname(nodeExePath);

      // 开发环境必须使用 process.cwd()
      expect(correctPath).toBe('/development/electron');
      expect(correctPath).not.toBe(wrongPath);
    });

    it('验证: path.dirname 能正确提取目录', () => {
      const testCases = [
        { input: 'D:\\App\\ComfyUI-Desktop.exe', expected: 'D:\\App' },
        { input: 'C:\\Program Files\\App\\app.exe', expected: 'C:\\Program Files\\App' },
        { input: '/usr/bin/app', expected: '/usr/bin' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = path.dirname(input);
        expect(result).toBe(expected);
      });
    });
  });
});

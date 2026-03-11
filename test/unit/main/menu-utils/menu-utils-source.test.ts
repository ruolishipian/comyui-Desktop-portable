/**
 * menu-utils 源代码测试
 * 直接测试 src/modules/menu-utils.ts 的代码
 */

import {
  createOpenLogsDirMenuItem,
  createOpenComfyUIDirMenuItem,
  createSeparatorMenuItem,
  createFileOperationMenuItems
} from '../../../../src/modules/menu-utils';

// Mock electron
jest.mock('electron', () => ({
  shell: {
    openPath: jest.fn(() => Promise.resolve(''))
  },
  dialog: {
    showMessageBox: jest.fn(() => Promise.resolve({ response: 0 }))
  }
}));

// Mock configManager
jest.mock('../../../../src/modules/config', () => ({
  configManager: {
    logsDir: '/test/logs',
    get: jest.fn((key: string) => {
      if (key === 'comfyuiPath') return '/test/comfyui';
      return '';
    })
  }
}));

describe('menu-utils 源代码测试', () => {
  const { shell } = require('electron');
  const { configManager } = require('../../../../src/modules/config');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOpenLogsDirMenuItem', () => {
    test('应返回正确的菜单项', () => {
      const item = createOpenLogsDirMenuItem();

      expect(item.label).toBe('打开日志目录');
      expect(item.click).toBeDefined();
    });

    test('点击应打开日志目录', () => {
      const item = createOpenLogsDirMenuItem();

      if (item.click) {
        (item.click as (menuItem: unknown, browserWindow: unknown, event: unknown) => void)({}, {}, {});
        expect(shell.openPath).toHaveBeenCalledWith('/test/logs');
      }
    });
  });

  describe('createOpenComfyUIDirMenuItem', () => {
    test('应返回正确的菜单项', () => {
      const item = createOpenComfyUIDirMenuItem();

      expect(item.label).toBe('打开 ComfyUI 目录');
      expect(item.click).toBeDefined();
    });

    test('点击应打开 ComfyUI 目录', () => {
      const item = createOpenComfyUIDirMenuItem();

      if (item.click) {
        (item.click as (menuItem: unknown, browserWindow: unknown, event: unknown) => void)({}, {}, {});
        expect(shell.openPath).toHaveBeenCalledWith('/test/comfyui');
      }
    });

    test('路径为空时应显示提示对话框', () => {
      configManager.get.mockReturnValueOnce(null);

      const item = createOpenComfyUIDirMenuItem();
      const { dialog } = require('electron');

      if (item.click) {
        (item.click as (menuItem: unknown, browserWindow: unknown, event: unknown) => void)({}, {}, {});
        expect(dialog.showMessageBox).toHaveBeenCalled();
      }
    });
  });

  describe('createSeparatorMenuItem', () => {
    test('应返回分隔符菜单项', () => {
      const item = createSeparatorMenuItem();

      expect(item.type).toBe('separator');
    });
  });

  describe('createFileOperationMenuItems', () => {
    test('应返回所有文件操作菜单项', () => {
      const items = createFileOperationMenuItems();

      expect(items).toHaveLength(3);
      expect(items[0]?.label).toBe('打开日志目录');
      expect(items[1]?.label).toBe('打开 ComfyUI 目录');
      expect(items[2]?.type).toBe('separator');
    });
  });
});

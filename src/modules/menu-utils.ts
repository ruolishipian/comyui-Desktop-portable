/**
 * 共享菜单工具
 * 提供通用的菜单项构建函数，避免代码重复
 */

import { shell, dialog } from 'electron';

import { configManager } from './config';

/**
 * 创建"打开日志目录"菜单项
 */
export function createOpenLogsDirMenuItem(): Electron.MenuItemConstructorOptions {
  return {
    label: '打开日志目录',
    click: (): void => {
      void shell.openPath(configManager.logsDir);
    }
  };
}

/**
 * 创建"打开 ComfyUI 目录"菜单项
 */
export function createOpenComfyUIDirMenuItem(): Electron.MenuItemConstructorOptions {
  return {
    label: '打开 ComfyUI 目录',
    click: (): void => {
      const comfyuiPath = configManager.get('comfyuiPath');
      if (comfyuiPath) {
        void shell.openPath(comfyuiPath);
      } else {
        void dialog.showMessageBox({
          type: 'warning',
          title: '提示',
          message: 'ComfyUI 路径未配置',
          detail: '请先在设置中配置 ComfyUI 路径'
        });
      }
    }
  };
}

/**
 * 创建分隔符菜单项
 */
export function createSeparatorMenuItem(): Electron.MenuItemConstructorOptions {
  return { type: 'separator' };
}

/**
 * 创建通用的文件操作菜单项
 */
export function createFileOperationMenuItems(): Electron.MenuItemConstructorOptions[] {
  return [createOpenLogsDirMenuItem(), createOpenComfyUIDirMenuItem(), createSeparatorMenuItem()];
}

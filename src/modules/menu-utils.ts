/**
 * 共享菜单工具
 * 提供通用的菜单项构建函数，避免代码重复
 */

import { shell, dialog, app } from 'electron';

import { configManager } from './config';
import { stateManager } from './state';

export interface MenuContext {
  windowManager?: {
    createLogWindow: () => void;
    createSettingsWindow: () => void;
    createEnvSelectWindow: () => void;
    focusWindow: (type: string) => void;

    resetConfig: () => Promise<void>;
  };
  processManager?: {
    start: () => Promise<void>;
    stop: () => Promise<void>;
    restart: () => Promise<void>;
  };
  terminalManager?: {
    createTerminalWindow: () => import('electron').BrowserWindow | null;
  };
}

/**
 * 创建启动/停止菜单项
 */
export function createStartStopMenuItem(context: MenuContext): Electron.MenuItemConstructorOptions {
  const status = stateManager.status;
  return {
    label: status === 'running' ? '停止 ComfyUI' : '启动 ComfyUI',
    click: () => {
      if (context.processManager) {
        status === 'running' ? void context.processManager.stop() : void context.processManager.start();
      }
    }
  };
}

/**
 * 创建重启菜单项
 */
export function createRestartMenuItem(context: MenuContext): Electron.MenuItemConstructorOptions {
  return {
    label: '重启 ComfyUI',
    click: () => {
      if (context.processManager) {
        void context.processManager.restart();
      }
    }
  };
}

/**
 * 创建共同的 ComfyUI 操作菜单项
 */
export function createComfyUIControlMenuItems(context: MenuContext): Electron.MenuItemConstructorOptions[] {
  return [
    createStartStopMenuItem(context),
    createRestartMenuItem(context),
    { type: 'separator' }
  ];
}

/**
 * 创建共同的导航菜单项（设置/日志/终端/环境选择）
 */
export function createCommonNavMenuItems(context: MenuContext): Electron.MenuItemConstructorOptions[] {
  return [
    {
      label: '查看实时日志',
      click: () => context.windowManager?.createLogWindow()
    },
    {
      label: '打开终端',
      click: () => context.terminalManager?.createTerminalWindow()
    },
    {
      label: '设置',
      click: () => context.windowManager?.createSettingsWindow()
    },
    {
      label: '重新选择环境',
      click: () => context.windowManager?.createEnvSelectWindow()
    }
  ];
}

/**
 * 创建刷新相关菜单项
 */
export function createRefreshMenuItems(handlers: {
  reload: () => void;
  forceReload: () => void;
  deepClean: () => void;
}): Electron.MenuItemConstructorOptions[] {
  return [
    {
      label: '刷新页面',
      click: () => handlers.reload()
    },
    {
      label: '强制刷新（清除缓存，保护工作流）',
      click: () => handlers.forceReload()
    },
    {
      label: '深度清理（清除所有数据，会丢失工作流）',
      click: () => handlers.deepClean()
    }
  ];
}

/**
 * 创建重置配置菜单项
 */
export function createResetConfigMenuItem(context: MenuContext): Electron.MenuItemConstructorOptions {
  return {
    label: '重置所有配置',
    click: () => {
      if (context.windowManager) {
        void context.windowManager.resetConfig();
      }
    }
  };
}

/**
 * 创建退出菜单项
 */
export function createQuitMenuItem(): Electron.MenuItemConstructorOptions {
  return {
    label: '退出',
    click: () => {
      (globalThis as { isQuiting?: boolean }).isQuiting = true;
      app.quit();
    }
  };
}

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

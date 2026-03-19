/**
 * 路径常量模块
 * 集中管理所有相对路径，避免因编译目录结构变化导致路径错误
 *
 * 开发环境目录结构：
 * dist/
 * ├── assets/           <- HTML 文件、图标等
 * └── src/
 *     └── modules/      <- __dirname 在这里
 *
 * 打包后目录结构：
 * app.asar/
 * ├── dist/
 * │   ├── assets/       <- ASAR 内的 assets（可能不完整）
 * │   └── src/modules/  <- __dirname 在这里
 * resources/
 * └── assets/           <- extraResources 复制到这里的完整 assets
 *
 * 因此需要根据是否打包来选择正确的 assets 路径
 */

import fs from 'fs';
import path from 'path';

import { app } from 'electron';

/**
 * 获取 assets 目录的绝对路径
 * - 开发环境: 从 dist/src/modules/ 向上两级到 dist，再进入 assets
 * - 打包后: 使用 process.resourcesPath/assets（extraResources 配置的位置）
 *          如果失败，回退到 app.getAppPath()/dist/assets
 */
export function getAssetsPath(...segments: string[]): string {
  // 开发环境使用 dist/assets
  if (!app.isPackaged) {
    return path.join(__dirname, '../../assets', ...segments);
  }

  // 打包后：尝试多个可能的路径
  const possiblePaths = [
    // 首选：electron-builder extraResources 配置的位置
    path.join(process.resourcesPath, 'assets', ...segments),
    // 备用1：app.asar 内的 assets
    path.join(app.getAppPath(), 'dist/assets', ...segments),
    // 备用2：可执行文件目录下的 resources/assets
    path.join(path.dirname(app.getPath('exe')), 'resources/assets', ...segments),
    // 备用3：从 __dirname 推算（兼容不同打包配置）
    path.join(__dirname, '../../assets', ...segments)
  ];

  // 返回第一个存在的路径，如果都不存在则返回首选路径（保持向后兼容）
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch {
      // 忽略错误，继续尝试下一个路径
    }
  }

  // 如果所有路径都不存在，返回首选路径并记录警告
  const defaultPath = possiblePaths[0] ?? path.join(process.resourcesPath, 'assets', ...segments);
  console.warn(`[PATHS] Assets not found in any location, using default: ${defaultPath}`);
  console.warn(`[PATHS] Tried paths: ${possiblePaths.join(', ')}`);
  return defaultPath;
}

/**
 * 获取 preload.js 的绝对路径
 * 从编译后的 dist/src/modules/ 向上一级到 dist/src
 */
export function getPreloadPath(): string {
  return path.join(__dirname, '../preload.js');
}

/**
 * 常用路径常量
 */
export const PATHS = {
  // HTML 文件路径
  SELECT_ENV_HTML: (): string => getAssetsPath('select-env.html'),
  LOADING_HTML: (): string => getAssetsPath('loading.html'),
  LOG_HTML: (): string => getAssetsPath('log.html'),
  SETTINGS_HTML: (): string => getAssetsPath('settings.html'),
  ERROR_HTML: (): string => getAssetsPath('error.html'),

  // 图标文件路径
  TRAY_ICON: (): string => getAssetsPath('icon-tray.png'),
  APP_ICON: (): string => getAssetsPath('icon-512.png'),

  // preload 路径
  PRELOAD_JS: getPreloadPath(),

  // assets 目录
  ASSETS_DIR: (...segments: string[]): string => getAssetsPath(...segments)
} as const;

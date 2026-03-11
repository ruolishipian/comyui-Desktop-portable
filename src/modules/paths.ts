/**
 * 路径常量模块
 * 集中管理所有相对路径，避免因编译目录结构变化导致路径错误
 *
 * 编译后目录结构：
 * dist/
 * ├── assets/           <- HTML 文件、图标等
 * └── src/
 *     └── modules/      <- __dirname 在这里
 *
 * 因此从 modules 目录访问 assets 需要 ../../assets
 */

import path from 'path';

/**
 * 获取 assets 目录的绝对路径
 * 从编译后的 dist/src/modules/ 向上两级到 dist，再进入 assets
 */
export function getAssetsPath(...segments: string[]): string {
  return path.join(__dirname, '../../assets', ...segments);
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
  TRAY_ICON: (): string => getAssetsPath('tray.ico'),
  APP_ICON: (): string => getAssetsPath('icon.ico'),

  // preload 路径
  PRELOAD_JS: getPreloadPath(),

  // assets 目录
  ASSETS_DIR: (...segments: string[]): string => getAssetsPath(...segments)
} as const;

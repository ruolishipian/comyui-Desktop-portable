/**
 * 应用路径工具函数
 * 统一管理应用根目录的获取逻辑
 */

import path from 'path';

import { app } from 'electron';

/**
 * 获取应用根目录
 * - 打包后: 可执行文件所在目录 (ComfyUI-Desktop.exe 所在目录)
 * - 开发环境: electron/ 目录
 */
export function getAppPath(): string {
  if (app.isPackaged) {
    // 打包后：使用可执行文件所在目录
    return path.dirname(app.getPath('exe'));
  } else {
    // 开发环境：使用当前工作目录
    return process.cwd();
  }
}

/**
 * 路径检测工具
 * 提供自动检测 ComfyUI 路径的功能
 */

import fs from 'fs';
import path from 'path';

/**
 * 检测可能的 ComfyUI 路径
 * @param appPath 应用根目录
 * @returns 检测到的 ComfyUI 路径，如果未找到则返回 null
 */
export function detectComfyUIPath(appPath: string): string | null {
  const possiblePaths = [
    // 便携包内路径（优先）
    path.join(appPath, 'ComfyUI'),
    path.join(appPath, 'comfyui'),
    // 兼容旧版便携包结构（ComfyUI 在父目录）
    path.join(appPath, '..', 'ComfyUI'),
    path.join(appPath, '..', 'comfyui')
  ];

  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      const mainPyPath = path.join(possiblePath, 'main.py');
      if (fs.existsSync(mainPyPath)) {
        return possiblePath;
      }
    }
  }

  return null;
}

/**
 * 检测可能的 Python 路径
 * @param appPath 应用根目录
 * @returns 检测到的 Python 路径，如果未找到则返回 null
 */
export function detectPythonPath(appPath: string): string | null {
  const possiblePaths = [
    // Windows
    path.join(appPath, 'python', 'python.exe'),
    path.join(appPath, 'python3', 'python.exe'),
    path.join(appPath, 'python_embeded', 'python.exe'),
    // Linux/macOS
    path.join(appPath, 'python', 'bin', 'python3'),
    path.join(appPath, 'python', 'bin', 'python')
  ];

  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      return possiblePath;
    }
  }

  return null;
}

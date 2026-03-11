/**
 * 路径工具函数
 * 提供路径检测相关的共享功能
 */

import fsSync from 'fs';
import path from 'path';

/**
 * 获取可能的 Python 路径列表
 * @param appPath 应用根目录
 * @returns 可能的 Python 可执行文件路径列表
 */
export function getPossiblePythonPaths(appPath: string): string[] {
  return [
    // Windows 便携包常见路径
    path.join(appPath, 'python_embeded', 'python.exe'),
    path.join(appPath, 'python', 'python.exe'),
    path.join(appPath, '..', 'python_embeded', 'python.exe'),
    path.join(appPath, '..', 'python', 'python.exe'),
    // Linux/macOS 路径
    path.join(appPath, 'python_embeded', 'bin', 'python3'),
    path.join(appPath, 'python', 'bin', 'python3')
  ];
}

/**
 * 查找第一个存在的 Python 路径
 * @param appPath 应用根目录
 * @returns 找到的 Python 路径，如果没找到则返回 null
 */
export function findPythonPath(appPath: string): string | null {
  const possiblePaths = getPossiblePythonPaths(appPath);
  for (const possiblePath of possiblePaths) {
    if (fsSync.existsSync(possiblePath)) {
      return possiblePath;
    }
  }
  return null;
}

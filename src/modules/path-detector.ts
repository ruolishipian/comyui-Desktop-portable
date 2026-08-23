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

/**
 * 统一环境检测结果
 */
export interface EnvironmentDetectionResult {
  comfyuiPath: string | null;
  pythonPath: string | null;
}

/**
 * 统一检测 ComfyUI 和 Python 路径
 * 供 ConfigManager.isEnvironmentConfigured 和 EnvironmentChecker 共用
 * @param appPath 应用根目录
 * @param comfyuiParentDir 可选的 ComfyUI 父目录（用于在其下查找 python_embeded）
 */
export function detectEnvironment(
  appPath: string,
  comfyuiParentDir?: string
): EnvironmentDetectionResult {
  const comfyuiPath = detectComfyUIPath(appPath);

  // Python 检测：优先在 ComfyUI 父目录下查找
  const pythonSearchDirs: string[] = [];
  if (comfyuiPath) {
    const parent = path.dirname(comfyuiPath);
    pythonSearchDirs.push(parent);
  }
  if (comfyuiParentDir && comfyuiParentDir !== path.dirname(comfyuiPath ?? '')) {
    pythonSearchDirs.push(comfyuiParentDir);
  }
  pythonSearchDirs.push(appPath);

  let pythonPath: string | null = null;
  for (const dir of pythonSearchDirs) {
    const candidates = [
      path.join(dir, 'python_embeded', 'python.exe'),
      path.join(dir, 'python', 'python.exe'),
      path.join(dir, 'python_embeded', 'bin', 'python3'),
      path.join(dir, 'python', 'bin', 'python3'),
      path.join(dir, 'python', 'bin', 'python')
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        pythonPath = candidate;
        break;
      }
    }
    if (pythonPath) break;
  }

  return { comfyuiPath, pythonPath };
}

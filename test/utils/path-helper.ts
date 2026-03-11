/**
 * 路径辅助工具
 * 用于路径相关的测试
 */

import path from 'path';

// 判断是否是 Windows 系统
export function isWindows(): boolean {
  return process.platform === 'win32';
}

// 判断是否是 macOS 系统
export function isMacOS(): boolean {
  return process.platform === 'darwin';
}

// 判断是否是 Linux 系统
export function isLinux(): boolean {
  return process.platform === 'linux';
}

// 获取跨平台路径分隔符
export function getSeparator(): string {
  return path.sep;
}

// 规范化路径（跨平台）
export function normalizePath(p: string): string {
  return path.normalize(p);
}

// 连接路径
export function joinPath(...paths: string[]): string {
  return path.join(...paths);
}

// 解析路径
export function resolvePath(...paths: string[]): string {
  return path.resolve(...paths);
}

// 获取路径目录名
export function getDirName(p: string): string {
  return path.dirname(p);
}

// 获取路径基础名
export function getBaseName(p: string): string {
  return path.basename(p);
}

// 获取路径扩展名
export function getExtName(p: string): string {
  return path.extname(p);
}

// 判断是否是绝对路径
export function isAbsolute(p: string): boolean {
  return path.isAbsolute(p);
}

// 判断路径是否有效
export function isValidPath(p: string): boolean {
  if (!p || p.trim() === '') return false;

  // 检查非法字符
  const invalidChars = isWindows() ? /[<>:"|?*]/ : /\0/;
  if (invalidChars.test(p)) return false;

  return true;
}

// 判断路径是否包含嵌套
export function isNestedPath(key: string): boolean {
  return key.includes('.');
}

// 解析嵌套路径
export function parseNestedPath(key: string): string[] {
  return key.split('.');
}

// 构建嵌套路径
export function buildNestedPath(...parts: string[]): string {
  return parts.join('.');
}

// 创建测试路径
export function createTestPath(type: 'valid' | 'invalid' | 'edge'): string[] {
  const paths = {
    valid: ['/test/path', '/test/path/with/subdir', isWindows() ? 'C:\\test\\path' : '/test/path'],
    invalid: ['', '   ', 'relative/path', isWindows() ? 'invalid:path' : '/path/with\0null'],
    edge: ['/', '/.', '/..', isWindows() ? 'C:\\' : '/']
  };

  return paths[type];
}

// 模拟 ComfyUI 路径结构
export function createComfyUIPath(basePath: string): {
  root: string;
  mainPy: string;
  models: string;
  output: string;
  customNodes: string;
} {
  return {
    root: basePath,
    mainPy: joinPath(basePath, 'main.py'),
    models: joinPath(basePath, 'models'),
    output: joinPath(basePath, 'output'),
    customNodes: joinPath(basePath, 'custom_nodes')
  };
}

// 模拟 Python 路径
export function createPythonPath(basePath: string): {
  python: string;
  pythonExe: string;
  scripts: string;
} {
  const pythonDir = joinPath(basePath, 'python');
  return {
    python: pythonDir,
    pythonExe: isWindows() ? joinPath(pythonDir, 'python.exe') : joinPath(pythonDir, 'bin', 'python'),
    scripts: isWindows() ? joinPath(pythonDir, 'Scripts') : joinPath(pythonDir, 'bin')
  };
}

// 验证路径格式
export function validatePathFormat(p: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!p) {
    errors.push('Path is empty');
  }

  if (p.includes('..')) {
    errors.push('Path contains parent directory references');
  }

  if (p.includes('//') || (isWindows() && p.includes('\\\\'))) {
    errors.push('Path contains double separators');
  }

  if (isWindows() && /[<>:"|?*]/.test(p)) {
    errors.push('Path contains invalid characters for Windows');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// 比较路径（跨平台）
export function comparePaths(p1: string, p2: string): boolean {
  return normalizePath(p1) === normalizePath(p2);
}

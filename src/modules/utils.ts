/**
 * 公共工具函数
 * 提供跨模块复用的基础工具
 */

import { app } from 'electron';

/**
 * 调试日志：仅在非打包环境下输出到 console
 */
export function debugLog(...args: unknown[]): void {
  if (!app.isPackaged) {
    console.log(...args);
  }
}

/**
 * 将 unknown 错误安全转换为 Error 对象
 */
export function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  return new Error(String(err));
}

/**
 * 从 unknown 错误中安全提取错误消息
 */
export function safeErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * 检查路径是否包含路径穿越攻击（包括 URL 编码绕过）
 */
export function isPathTraversal(relativePath: string): boolean {
  const decoded = safeDecodeUri(relativePath);
  const segments = decoded.replace(/\\/g, '/').split('/');
  return segments.some(seg => seg === '..' || seg === '.' || seg === '');
}

/**
 * 安全解码 URI 组件（不抛出异常）
 */
export function safeDecodeUri(uri: string): string {
  try {
    let result = uri;
    let prev = '';
    while (prev !== result) {
      prev = result;
      result = decodeURIComponent(result);
    }
    return result;
  } catch {
    return uri;
  }
}

/**
 * 安全解码 Buffer 为字符串（处理多字节字符跨 chunk 分割）
 * 先尝试 UTF-8，失败时回退到 latin1
 */
export function safeBufferDecode(data: Buffer): string {
  try {
    return data.toString('utf8');
  } catch {
    return data.toString('latin1');
  }
}

/**
 * 创建带超时的 Promise
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message ?? `操作超时 (${ms}ms)`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * 节流函数：确保函数在指定间隔内最多执行一次
 */
export function throttle<T extends (...args: unknown[]) => void>(fn: T, interval: number): T {
  let lastTime = 0;
  return ((...args: unknown[]) => {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn(...args);
    }
  }) as T;
}

/**
 * 确认对话框辅助函数
 */
export async function showConfirmDialog(
  options: {
    title: string;
    message: string;
    detail?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'warning' | 'info' | 'question';
  },
  parentWindow?: import('electron').BrowserWindow
): Promise<boolean> {
  const { dialog, BrowserWindow } = await import('electron');
  const win = parentWindow ?? BrowserWindow.getFocusedWindow();
  const msgOptions = {
    type: options.type ?? 'warning',
    title: options.title,
    message: options.message,
    detail: options.detail,
    buttons: [options.cancelLabel ?? '取消', options.confirmLabel ?? '确认'],
    defaultId: 0,
    cancelId: 0
  };
  const result =
    win && !win.isDestroyed()
      ? await dialog.showMessageBox(win, msgOptions)
      : await dialog.showMessageBox(msgOptions);
  return result.response === 1;
}

/**
 * 日志解析器
 * 优先尝试 JSON 结构化解析（ComfyUI structlog 输出）
 * 失败时回退到关键词推断（插件/底层输出兜底）
 */

import { LogLevel } from '../types';

// ANSI 转义码正则
const ANSI_REGEX = /[\u001B\u009B][#();?[]*(?:\d{1,4}(?:;\d{0,4})*)?[\d<=>A-ORZcf-nqry]/g;

// structlog JSON 输出结构
interface StructuredLog {
  timestamp?: string;
  level?: string;
  event?: string;
  message?: string;
  [key: string]: unknown;
}

// 解析结果
export interface ParsedLogEntry {
  level: LogLevel;
  message: string;
  timestamp?: string;
  structured: boolean;
}

// 级别映射：ComfyUI structlog 级别 → LogLevel
const LEVEL_MAP: Record<string, LogLevel> = {
  critical: 'error',
  error: 'error',
  exception: 'error',
  warning: 'warn',
  warn: 'warn',
  info: 'info',
  debug: 'info',
  notset: 'info'
};

// 英文标签级别映射
const TAG_LEVEL_MAP: Record<string, LogLevel> = {
  '[error]': 'error',
  '[exception]': 'error',
  '[warn]': 'warn',
  '[warning]': 'warn',
  '[info]': 'info',
  '[debug]': 'info'
};

// ANSI 清理
function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, '');
}

// 尝试 JSON 解析
function tryParseJson(line: string): StructuredLog | null {
  if (!line.startsWith('{')) return null;
  try {
    const obj = JSON.parse(line) as StructuredLog;
    // JSON.parse 结果需运行时校验，类型断言不足以保证安全
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (obj !== null && typeof obj === 'object' && !Array.isArray(obj) && (obj.level ?? obj.event ?? obj.message)) {
      return obj;
    }
  } catch {
    // 不是 JSON，忽略
  }
  return null;
}

// 从 JSON 对象构建消息文本
function buildMessageFromJson(obj: StructuredLog): string {
  const parts: string[] = [];

  if (obj.event) {
    parts.push(String(obj.event));
  }

  if (obj.message && obj.message !== obj.event) {
    parts.push(String(obj.message));
  }

  // 附加额外字段（排除已使用的内部字段）
  const knownKeys = new Set(['timestamp', 'level', 'event', 'message']);
  for (const [key, value] of Object.entries(obj)) {
    if (!knownKeys.has(key) && value !== undefined && value !== null && value !== '') {
      parts.push(`${key}=${String(value)}`);
    }
  }

  return parts.join(' | ');
}

// 从文本推断级别（标签 + 关键词）
function inferLevelFromText(text: string): { level: LogLevel; cleaned: string } {
  const lowerText = text.toLowerCase();

  // 优先检查标签 [error] [warn] [info]
  for (const [tag, level] of Object.entries(TAG_LEVEL_MAP)) {
    if (lowerText.includes(tag)) {
      const cleaned = text.replace(new RegExp(`\\s*${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'gi'), ' ').trim();
      return { level, cleaned };
    }
  }

  // 关键词推断
  if (
    lowerText.includes('warning') ||
    lowerText.includes('warn:') ||
    lowerText.includes('deprecated')
  ) {
    return { level: 'warn', cleaned: text };
  }

  if (
    (lowerText.includes('error') || lowerText.includes('exception') || lowerText.includes('failed')) &&
    !lowerText.includes('round-off error') &&
    !lowerText.includes('numerical error') &&
    !lowerText.includes('floating-point error')
  ) {
    return { level: 'error', cleaned: text };
  }

  return { level: 'info', cleaned: text };
}

// 主解析函数
export function parseLogLine(line: string): ParsedLogEntry {
  const cleanLine = stripAnsi(line);

  // 优先尝试 JSON 结构化解析
  const json = tryParseJson(cleanLine);
  if (json) {
    const level = LEVEL_MAP[json.level?.toLowerCase() ?? ''] ?? 'info';
    const message = buildMessageFromJson(json);
    return {
      level,
      message: message || cleanLine,
      timestamp: json.timestamp,
      structured: true
    };
  }

  // 兜底：关键词推断
  const { level, cleaned } = inferLevelFromText(cleanLine);
  return {
    level,
    message: cleaned,
    structured: false
  };
}

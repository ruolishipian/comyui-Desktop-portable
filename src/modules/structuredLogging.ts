/**
 * 结构化日志模块
 * 提供结构化对象日志格式化功能
 */

import { formatWithOptions } from 'node:util';

import type { FileTransport, MainTransports, TransformFn } from 'electron-log';

// ANSI 转义码正则表达式
export const ansiCodes = /[\u001B\u009B][#();?[]*(?:\d{1,4}(?:;\d{0,4})*)?[\d<=>A-ORZcf-nqry]/g;

/**
 * 清理 ANSI 转义码
 */
export function removeAnsiCodes(x: unknown) {
  return typeof x === 'string' ? x.replaceAll(ansiCodes, '') : x;
}

/**
 * ANSI 转义码清理转换器
 */
export function removeAnsiCodesTransform({ data }: Parameters<TransformFn>[0]): unknown[] {
  return data.map(x => removeAnsiCodes(x));
}

/**
 * 替换文件日志转换器
 * 实现结构化日志格式化
 */
export function replaceFileLoggingTransform(transports: MainTransports) {
  const { transforms } = transports.file;
  transforms.pop();
  // electron-log 类型定义不完整，需要类型断言
  transforms.push(formatForFileLogging as unknown as TransformFn);
}

/**
 * 格式化文件日志
 * 将结构化数据转换为单行紧凑格式
 */
function formatForFileLogging({ data, transport }: { data: unknown[]; transport: FileTransport }) {
  // inspectOptions 类型为 InspectOptions，直接使用
  const inspectOptions = transport.inspectOptions;
  const formattableData = data.map(item => toFormattable(item));
  return formatWithOptions(inspectOptions, ...formattableData);
}

/**
 * 转换为可格式化对象
 * 处理 Error、Date、Map、Set 等特殊对象
 */
function toFormattable(item: unknown) {
  try {
    if (typeof item === 'object' && item !== null) {
      if (item instanceof Error) return item.stack;
      if (item instanceof Date) return item.toISOString();

      return JSON.stringify(item, toStringifiable);
    }
  } catch {
    // 转换失败，使用默认值
  }

  return item;
}

/**
 * 转换为可序列化对象
 * 支持 Map 和 Set 的序列化
 */
function toStringifiable(_key: unknown, value: unknown) {
  if (value instanceof Map) return Object.fromEntries<Map<unknown, unknown>>(value);
  if (value instanceof Set) return [...(value as Set<unknown>)];

  return value;
}

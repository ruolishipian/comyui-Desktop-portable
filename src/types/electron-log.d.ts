/**
 * electron-log 类型补充声明
 * 为 electron-log 库提供局部类型定义
 */

declare module 'electron-log' {
  export interface LogMessage {
    data: unknown[];
    date: Date;
    level: string;
    message?: string;
    variables: Record<string, unknown>;
  }

  export interface LogLevels {
    error: string;
    warn: string;
    info: string;
    verbose: string;
    debug: string;
    silly: string;
  }

  export interface FileTransport {
    level: string | false;
    maxSize: number;
    archiveLog: (file: string) => string;
    resolvePath: (vars: Record<string, string>) => string;
    resolvePathFn?: () => string;
    fileName?: string;
    readAllLogs: boolean;
    format: string | ((message: LogMessage) => string);
    getFile: () => { path: string; bytes: number };
    inspectOptions: InspectOptions;
    transforms: TransformFn[];
  }

  export interface ConsoleTransport {
    level: string | false;
    format: string | ((message: LogMessage) => string);
    transforms: TransformFn[];
  }

  export interface MainTransports {
    file: FileTransport;
    console: ConsoleTransport;
    [key: string]: unknown;
  }

  export type TransformFn = (msg: { data: unknown[] }) => unknown[];

  export interface InspectOptions {
    depth?: number;
    colors?: boolean;
    showHidden?: boolean;
    maxArrayLength?: number;
    maxStringLength?: number;
    compact?: boolean | number;
    sorted?: boolean | ((a: string, b: string) => number);
    getters?: boolean | 'get' | 'set';
    numericSeparator?: boolean;
  }

  export interface LogFunctions {
    error(...params: unknown[]): void;
    warn(...params: unknown[]): void;
    info(...params: unknown[]): void;
    verbose(...params: unknown[]): void;
    debug(...params: unknown[]): void;
    silly(...params: unknown[]): void;
    log(...params: unknown[]): void;
  }

  export interface ElectronLog extends LogFunctions {
    transports: MainTransports;
    create: (options: { logId: string }) => ElectronLog;
    initialize: () => void;
  }

  export default ElectronLog;
}

declare module 'electron-log/main' {
  import type { ElectronLog } from 'electron-log';

  const log: ElectronLog;
  export default log;
}

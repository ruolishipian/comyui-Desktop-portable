/**
 * Electron 类型扩展
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { AppConfig } from './index';

declare module 'electron' {
  interface App {
    isQuiting: boolean;
  }
}

declare module 'electron-store' {
  interface Store<T extends Record<string, unknown> = Record<string, unknown>> {
    store: T;
    defaults: T;
  }
}

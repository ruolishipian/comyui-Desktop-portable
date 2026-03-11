/**
 * electron-store 类型声明扩展
 * 扩展 Store 类以支持嵌套路径设置和获取
 */

import 'electron-store';

// 定义路径值类型
type PathValue<T, P extends string> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? PathValue<T[Key], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

declare module 'electron-store' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export interface StoreOptions<T extends Record<string, any>> {
    defaults?: Partial<T>;
    name?: string;
    cwd?: string;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export default class Store<T extends Record<string, any>> {
    constructor(options?: StoreOptions<T>);

    // 原有方法
    get<K extends keyof T>(key: K): T[K];
    get<K extends keyof T>(key: K, defaultValue: T[K]): T[K];

    // 扩展：支持嵌套路径的 get 方法
    get<P extends string>(key: P): PathValue<T, P>;

    // 原有方法
    set<K extends keyof T>(key: K, value: T[K]): void;
    set(object: Partial<T>): void;

    // 扩展：支持嵌套路径的 set 方法
    set<P extends string>(key: P, value: PathValue<T, P>): void;

    // 其他方法
    has(key: keyof T): boolean;
    delete(key: keyof T): void;
    clear(): void;
    readonly size: number;
    readonly store: T;
    path: string;
    onDidChange<Key extends keyof T>(key: Key, callback: (newValue: T[Key], oldValue: T[Key]) => void): () => void;
  }
}

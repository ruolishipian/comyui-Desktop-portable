/**
 * electron-store Mock
 * 模拟配置存储，支持嵌套路径
 */

import type { AppConfig } from '../../src/types';

export class MockElectronStore {
  private _store: Record<string, unknown> = {};
  private _path = '/mock/config/store.json';

  constructor(options?: { defaults?: Partial<AppConfig> }) {
    if (options?.defaults) {
      this._store = { ...options.defaults };
    }
  }

  // 获取值（支持嵌套路径）
  public get<T = unknown>(key: string): T {
    const keys = key.split('.');
    let value: unknown = this._store;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return undefined as T;
      }
    }

    return value as T;
  }

  // 验证路径合法性
  private validateKey(key: string): void {
    if (!key || key === '') {
      throw new Error('Key cannot be empty');
    }
    if (key === '.' || key === '..') {
      throw new Error('Invalid key: ' + key);
    }
    if (key.startsWith('.') || key.endsWith('.')) {
      throw new Error('Key cannot start or end with dot: ' + key);
    }
    if (key.includes('..')) {
      throw new Error('Key cannot contain consecutive dots: ' + key);
    }
  }

  // 设置值（支持嵌套路径）
  public set(key: string, value: unknown): void {
    this.validateKey(key);

    const keys = key.split('.');

    if (keys.length === 1) {
      this._store[key] = value;
      return;
    }

    let current: Record<string, unknown> = this._store;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (k === undefined) continue;
      if (!(k in current)) {
        current[k] = {};
      }
      current = current[k] as Record<string, unknown>;
    }

    const lastKey = keys[keys.length - 1];
    if (lastKey !== undefined) {
      current[lastKey] = value;
    }
  }

  // 检查键是否存在
  public has(key: string): boolean {
    const keys = key.split('.');
    let value: unknown = this._store;

    for (const k of keys) {
      if (k === undefined) return false;
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return false;
      }
    }

    return true;
  }

  // 删除键
  public delete(key: string): void {
    const keys = key.split('.');

    if (keys.length === 1) {
      delete this._store[key];
      return;
    }

    let current: Record<string, unknown> = this._store;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (k === undefined) continue;
      if (!(k in current)) {
        return;
      }
      current = current[k] as Record<string, unknown>;
    }

    const lastKey = keys[keys.length - 1];
    if (lastKey !== undefined) {
      delete current[lastKey];
    }
  }

  // 清空所有
  public clear(): void {
    this._store = {};
  }

  // 获取路径
  public get path(): string {
    return this._path;
  }

  // 获取所有数据
  public get store(): Record<string, unknown> {
    return { ...this._store };
  }

  // 设置所有数据
  public set store(data: Record<string, unknown>) {
    this._store = { ...data };
  }

  // 重置为默认值
  public reset(): void {
    this._store = {};
  }

  // 用于测试：获取内部存储
  public _getInternalStore(): Record<string, unknown> {
    return this._store;
  }

  // 用于测试：设置内部存储
  public _setInternalStore(data: Record<string, unknown>): void {
    this._store = data;
  }
}

// 导出 Mock 工厂函数
export const createMockStore = (defaults?: Partial<AppConfig>): MockElectronStore => {
  return new MockElectronStore({ defaults });
};

// 导出默认实例
export const mockStore = new MockElectronStore();

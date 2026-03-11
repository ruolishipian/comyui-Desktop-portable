/**
 * ConfigManager Mock
 * 模拟配置管理器用于测试
 */

import { DEFAULT_CONFIG } from '../../src/modules/config';
import type { AppConfig, ServerConfig, LogsConfig, TrayConfig, AdvancedConfig, WindowConfig } from '../../src/types';

export class ConfigManager {
  private _configDir: string | null = null;
  private _logsDir: string | null = null;
  private _store: Map<string, unknown> = new Map();
  private _initialized: boolean = false;

  // 初始化配置
  public init(): void {
    if (this._initialized) return;

    this._configDir = '/mock/app/config';
    this._logsDir = '/mock/app/logs';

    // 初始化默认配置
    this._initDefaults();

    this._initialized = true;
  }

  // 初始化默认值（现在 DEFAULT_CONFIG 为空对象，所以初始化空配置）
  private _initDefaults(): void {
    // 顶层配置
    this._store.set('comfyuiPath', DEFAULT_CONFIG.comfyuiPath || '');
    this._store.set('pythonPath', DEFAULT_CONFIG.pythonPath || '');

    // 嵌套配置（使用空对象或默认值）
    this._store.set('server', DEFAULT_CONFIG.server || {});
    this._store.set('window', DEFAULT_CONFIG.window || {});
    // 日志配置默认启用
    this._store.set('logs', DEFAULT_CONFIG.logs || { enable: true, realtime: true, level: 'info' });
    this._store.set('tray', DEFAULT_CONFIG.tray || {});
    this._store.set('advanced', DEFAULT_CONFIG.advanced || {});
  }

  // 获取配置目录
  public get configDir(): string {
    this._checkInitialized();
    return this._configDir!;
  }

  // 获取日志目录
  public get logsDir(): string {
    this._checkInitialized();
    return this._logsDir!;
  }

  // 获取配置值
  public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    this._checkInitialized();
    return this._store.get(key) as AppConfig[K];
  }

  // 设置配置值
  public set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void;

  // 设置嵌套配置值
  public set(key: string, value: unknown): void;

  // 实现
  public set(key: string, value: unknown): void {
    this._checkInitialized();

    // 参数校验
    if (key === '') {
      throw new Error('配置键不能为空');
    }

    // 路径合法性校验
    if (key.includes('.')) {
      const parts = key.split('.');

      // 检查是否有空字符串部分
      if (parts.some(part => part === '')) {
        throw new Error(`配置路径格式错误：${key}`);
      }

      // 检查路径深度
      if (parts.length > 5) {
        throw new Error(`配置路径层级过深：${key}`);
      }

      // 处理嵌套路径
      this._setNestedValue(parts, value);
    } else {
      this._store.set(key, value);
    }
  }

  // 设置嵌套值
  private _setNestedValue(parts: string[], value: unknown): void {
    const topLevelKey = parts[0] as keyof AppConfig;
    const topLevelValue = this._store.get(topLevelKey) as Record<string, unknown>;

    if (parts.length === 1) {
      this._store.set(topLevelKey, value);
      return;
    }

    if (!topLevelValue || typeof topLevelValue !== 'object') {
      return;
    }

    // 创建新的对象以避免引用问题
    const newValue = { ...topLevelValue };
    let current: Record<string, unknown> = newValue;

    for (let i = 1; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part === undefined) continue;
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    const lastPart = parts[parts.length - 1];
    if (lastPart !== undefined) {
      current[lastPart] = value;
    }
    this._store.set(topLevelKey, newValue);
  }

  // 获取所有配置
  public getAll(): AppConfig {
    this._checkInitialized();
    return {
      comfyuiPath: this._store.get('comfyuiPath') as string,
      pythonPath: this._store.get('pythonPath') as string,
      server: this._store.get('server') as ServerConfig,
      window: this._store.get('window') as WindowConfig,
      logs: this._store.get('logs') as LogsConfig,
      tray: this._store.get('tray') as TrayConfig,
      advanced: this._store.get('advanced') as AdvancedConfig
    };
  }

  // 重置配置
  public reset(): void {
    this._store.clear();
    this._initialized = false;
    this._configDir = null;
    this._logsDir = null;
  }

  // 获取服务器配置
  public get server(): ServerConfig | undefined {
    return this.get('server');
  }

  // 获取日志配置
  public get logs(): LogsConfig | undefined {
    return this.get('logs');
  }

  // 获取高级配置
  public get advanced(): AdvancedConfig | undefined {
    return this.get('advanced');
  }

  // 获取托盘配置
  public get tray(): TrayConfig | undefined {
    return this.get('tray');
  }

  // 获取窗口配置
  public get window(): WindowConfig | undefined {
    return this.get('window');
  }

  // 检查环境是否已配置
  public isEnvironmentConfigured(): boolean {
    const comfyuiPath = this.get('comfyuiPath');
    const pythonPath = this.get('pythonPath');
    return Boolean(comfyuiPath && pythonPath);
  }

  // 检查是否已初始化
  private _checkInitialized(): void {
    if (!this._initialized) {
      throw new Error('ConfigManager 未初始化，请先调用 init()');
    }
  }
}

// 导出 DEFAULT_CONFIG
export { DEFAULT_CONFIG };

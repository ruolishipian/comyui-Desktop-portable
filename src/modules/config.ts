/**
 * 配置管理模块
 * 集中管理所有配置项，提供统一的配置读写接口
 */

import fsSync from 'fs';
import path from 'path';

import Store from 'electron-store';

import type { AppConfig, ServerConfig, LogsConfig, TrayConfig, AdvancedConfig, WindowConfig } from '../types';

import { getAppPath } from './app-path';
import { detectEnvironment } from './path-detector';
import { debugLog } from './utils';

// 默认配置（空配置，所有值从环境变量或设置界面获取）
export const DEFAULT_CONFIG: AppConfig = {};

// 配置管理器
export class ConfigManager {
  private _configDir: string | null = null;
  private _logsDir: string | null = null;
  private _store: Store<AppConfig> | null = null;
  private _initialized: boolean = false;

  // getter 缓存 + 独立脏标记
  private _serverCache: ServerConfig | null = null;
  private _logsCache: LogsConfig | null = null;
  private _trayCache: TrayConfig | null = null;
  private _windowCache: WindowConfig | null = null;
  private _advancedCache: AdvancedConfig | null = null;
  private _serverCacheDirty: boolean = true;
  private _logsCacheDirty: boolean = true;
  private _trayCacheDirty: boolean = true;
  private _windowCacheDirty: boolean = true;
  private _advancedCacheDirty: boolean = true;

  // 初始化配置（必须在 app ready 后调用）
  public init(): void {
    if (this._initialized) return;

    // 获取应用根目录（可执行文件所在目录）
    const appPath = getAppPath();

    debugLog('[Config] 应用根目录:', appPath);

    this._configDir = path.join(appPath, 'config');
    this._logsDir = path.join(appPath, 'logs');

    // 确保目录存在
    this._ensureDir(this._configDir);
    this._ensureDir(this._logsDir);

    debugLog('[Config] 配置目录:', this._configDir);
    debugLog('[Config] 日志目录:', this._logsDir);

    // 初始化存储
    this._store = new Store<AppConfig>({
      cwd: this._configDir,
      name: 'portable-config',
      defaults: DEFAULT_CONFIG
    });

    this._initialized = true;
  }

  // 确保目录存在
  private _ensureDir(dir: string | null): void {
    if (dir !== null && dir !== '' && !fsSync.existsSync(dir)) {
      fsSync.mkdirSync(dir, { recursive: true });
    }
  }

  // 获取配置目录
  public get configDir(): string {
    this._checkInitialized();
    // _checkInitialized 确保初始化后，_configDir 一定存在
    if (!this._configDir) {
      throw new Error('配置目录未初始化');
    }
    return this._configDir;
  }

  // 获取日志目录
  public get logsDir(): string {
    this._checkInitialized();
    // _checkInitialized 确保初始化后，_logsDir 一定存在
    if (!this._logsDir) {
      throw new Error('日志目录未初始化');
    }
    return this._logsDir;
  }

  // 获取配置值
  public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    this._checkInitialized();
    // _checkInitialized 确保初始化后，_store 一定存在
    if (!this._store) {
      throw new Error('存储未初始化');
    }
    return this._store.get(key);
  }

  // 设置配置值
  public set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void;

  // 设置嵌套配置值（支持 'server.port' 这样的路径）
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

      // 检查是否有空字符串部分（如 'server..port' 或 '.port' 或 'server.'）
      if (parts.some(part => part === '')) {
        throw new Error(`配置路径格式错误：${key}`);
      }

      // 检查路径深度（防止过深的嵌套）
      if (parts.length > 5) {
        throw new Error(`配置路径层级过深：${key}`);
      }
    }

    // 使用 electron-store 的原生支持
    // electron-store 原生支持嵌套路径（如 'server.port'）
    // 通过类型声明扩展，TypeScript 现在可以识别嵌套路径功能
    if (!this._store) {
      throw new Error('存储未初始化');
    }
    const store = this._store;

    // 使用类型断言来处理动态键值
    // 由于 key 是动态的，我们需要使用类型断言
    // 但这比 any 更安全，因为类型声明扩展提供了类型检查
    store.set(key as keyof AppConfig, value as AppConfig[keyof AppConfig]);
    // 标记所有缓存为脏
    this._serverCacheDirty = true;
    this._logsCacheDirty = true;
    this._trayCacheDirty = true;
    this._windowCacheDirty = true;
    this._advancedCacheDirty = true;
  }

  // 获取所有配置
  public getAll(): AppConfig {
    this._checkInitialized();
    // _checkInitialized 确保初始化后，_store 一定存在
    if (!this._store) {
      throw new Error('存储未初始化');
    }
    return this._store.store;
  }

  // 重置配置
  public reset(): void {
    this._checkInitialized();
    // _checkInitialized 确保初始化后，_store 一定存在
    if (!this._store) {
      throw new Error('存储未初始化');
    }
    this._store.clear();
  }

  // 获取服务器配置（从环境变量或配置文件读取，带缓存）
  public get server(): ServerConfig {
    if (!this._serverCacheDirty && this._serverCache) return this._serverCache;
    const config = this.get('server') ?? {};
    this._serverCache = {
      port: this._getEnvNumber('COMFYUI_PORT', config.port),
      autoStart: this._getEnvBoolean('COMFYUI_AUTO_START', config.autoStart),
      autoRestart: this._getEnvBoolean('COMFYUI_AUTO_RESTART', config.autoRestart),
      cpuMode: this._getEnvBoolean('COMFYUI_CPU_MODE', config.cpuMode),
      listenAll: this._getEnvBoolean('COMFYUI_LISTEN_ALL', config.listenAll),
      disableCUDA: this._getEnvBoolean('COMFYUI_DISABLE_CUDA', config.disableCUDA),
      disableIPEX: this._getEnvBoolean('COMFYUI_DISABLE_IPEX', config.disableIPEX),
      modelDir: this._getEnvString('COMFYUI_MODEL_DIR', config.modelDir),
      outputDir: this._getEnvString('COMFYUI_OUTPUT_DIR', config.outputDir),
      customArgs: this._getEnvString('COMFYUI_CUSTOM_ARGS', config.customArgs),
      timeout: this._getEnvNumber('COMFYUI_TIMEOUT', config.timeout),
      argNames: {
        baseDirectory: this._getEnvString('COMFYUI_ARG_BASE_DIR', config.argNames?.baseDirectory),
        outputDirectory: this._getEnvString('COMFYUI_ARG_OUTPUT_DIR', config.argNames?.outputDirectory),
        extraModelPathsConfig: this._getEnvString('COMFYUI_ARG_EXTRA_MODEL', config.argNames?.extraModelPathsConfig),
        disableCudaMalloc: this._getEnvString('COMFYUI_ARG_DISABLE_CUDA_MALLOC', config.argNames?.disableCudaMalloc),
        disableIpexOptimize: this._getEnvString('COMFYUI_ARG_DISABLE_IPEX', config.argNames?.disableIpexOptimize)
      }
    };
    this._serverCacheDirty = false;
    return this._serverCache;
  }

  // 获取日志配置（从环境变量或配置文件读取，带缓存）
  public get logs(): LogsConfig {
    if (!this._logsCacheDirty && this._logsCache) return this._logsCache;
    const config = this.get('logs') ?? {};
    this._logsCache = {
      enable: this._getEnvBoolean('COMFYUI_LOG_ENABLE', config.enable ?? true), // 默认启用
      level: this._getEnvString('COMFYUI_LOG_LEVEL', config.level) as 'error' | 'warn' | 'info',
      maxSize: this._getEnvNumber('COMFYUI_LOG_MAX_SIZE', config.maxSize),
      keepDays: this._getEnvNumber('COMFYUI_LOG_KEEP_DAYS', config.keepDays),
      realtime: this._getEnvBoolean('COMFYUI_LOG_REALTIME', config.realtime ?? true) // 默认启用实时日志
    };
    this._logsCacheDirty = false;
    return this._logsCache;
  }

  // 获取高级配置（从环境变量或配置文件读取，带缓存）
  public get advanced(): AdvancedConfig {
    if (!this._advancedCacheDirty && this._advancedCache) return this._advancedCache;
    const config = this.get('advanced') ?? {};
    this._advancedCache = {
      singleInstance: this._getEnvBoolean('COMFYUI_SINGLE_INSTANCE', config.singleInstance ?? true), // 默认启用单实例
      stdoutThrottle: this._getEnvNumber('COMFYUI_STDOUT_THROTTLE', config.stdoutThrottle)
    };
    this._advancedCacheDirty = false;
    return this._advancedCache;
  }

  // 获取托盘配置（从环境变量或配置文件读取，带缓存）
  public get tray(): TrayConfig {
    if (!this._trayCacheDirty && this._trayCache) return this._trayCache;
    const config = this.get('tray') ?? {};
    this._trayCache = {
      minimizeToTray: this._getEnvBoolean('COMFYUI_MINIMIZE_TO_TRAY', config.minimizeToTray)
    };
    this._trayCacheDirty = false;
    return this._trayCache;
  }

  // 获取窗口配置（从环境变量或配置文件读取，带缓存）
  public get window(): WindowConfig {
    if (!this._windowCacheDirty && this._windowCache) return this._windowCache;
    const config = this.get('window') ?? {};
    this._windowCache = {
      width: this._getEnvNumber('COMFYUI_WINDOW_WIDTH', config.width),
      height: this._getEnvNumber('COMFYUI_WINDOW_HEIGHT', config.height),
      x: this._getEnvNumber('COMFYUI_WINDOW_X', config.x),
      y: this._getEnvNumber('COMFYUI_WINDOW_Y', config.y),
      maximized: this._getEnvBoolean('COMFYUI_WINDOW_MAXIMIZED', config.maximized)
    };
    this._windowCacheDirty = false;
    return this._windowCache;
  }

  // 从环境变量获取字符串值
  private _getEnvString(envKey: string, configValue?: string): string {
    const envValue = process.env[envKey];
    if (envValue !== undefined && envValue !== '') {
      return envValue;
    }
    return configValue ?? '';
  }

  // 从环境变量获取数字值
  private _getEnvNumber(envKey: string, configValue?: number | null): number | undefined {
    const envValue = process.env[envKey];
    if (envValue !== undefined && envValue !== '') {
      const num = parseInt(envValue, 10);
      if (!isNaN(num)) {
        return num;
      }
    }
    return configValue ?? undefined;
  }

  // 从环境变量获取布尔值
  private _getEnvBoolean(envKey: string, configValue?: boolean): boolean {
    const envValue = process.env[envKey];
    if (envValue !== undefined && envValue !== '') {
      return envValue.toLowerCase() === 'true' || envValue === '1';
    }
    return configValue ?? false;
  }

  // 检查环境是否已配置（同时验证路径是否存在）
  public isEnvironmentConfigured(): boolean {
    const comfyuiPath = this.get('comfyuiPath');
    const pythonPath = this.get('pythonPath');

    // 便携包模式：尝试自动检测路径
    if (comfyuiPath === undefined || comfyuiPath === '' || pythonPath === undefined || pythonPath === '') {
      const appPath = process.cwd();
      const { comfyuiPath: detectedComfyui, pythonPath: detectedPython } = detectEnvironment(appPath);

      if (!comfyuiPath && detectedComfyui) {
        this.set('comfyuiPath', detectedComfyui);
        debugLog(`[Config] 自动检测到 ComfyUI: ${detectedComfyui}`);
      }

      if (!pythonPath && detectedPython) {
        this.set('pythonPath', detectedPython);
        debugLog(`[Config] 自动检测到 Python: ${detectedPython}`);
      }

      const newComfyuiPath = this.get('comfyuiPath');
      const newPythonPath = this.get('pythonPath');

      if (!newComfyuiPath || !newPythonPath) {
        debugLog('[Config] 未找到 ComfyUI 或 Python 路径');
        return false;
      }
    }

    // 验证路径是否存在
    const finalComfyuiPath = this.get('comfyuiPath');
    if (finalComfyuiPath && !fsSync.existsSync(finalComfyuiPath)) {
      debugLog(`[Config] ComfyUI 路径不存在: ${finalComfyuiPath}`);
      return false;
    }

    const finalPythonPath = this.get('pythonPath');
    if (finalPythonPath && !fsSync.existsSync(finalPythonPath)) {
      debugLog(`[Config] Python 路径不存在: ${finalPythonPath}`);
      return false;
    }

    debugLog('[Config] 环境检查通过');
    return true;
  }

  // 检查是否已初始化
  private _checkInitialized(): void {
    if (!this._initialized) {
      throw new Error('ConfigManager 未初始化，请先调用 init()');
    }
  }
}

// 导出单例
export const configManager = new ConfigManager();

/**
 * 配置管理模块
 * 集中管理所有配置项，提供统一的配置读写接口
 */

import fsSync from 'fs';
import path from 'path';

import Store from 'electron-store';

import type { AppConfig, ServerConfig, LogsConfig, TrayConfig, AdvancedConfig, WindowConfig } from '../types';

import { getAppPath } from './app-path';
import { findPythonPath } from './path-utils';

// 默认配置（空配置，所有值从环境变量或设置界面获取）
export const DEFAULT_CONFIG: AppConfig = {};

// 配置管理器
export class ConfigManager {
  private _configDir: string | null = null;
  private _logsDir: string | null = null;
  private _store: Store<AppConfig> | null = null;
  private _initialized: boolean = false;

  // 初始化配置（必须在 app ready 后调用）
  public init(): void {
    if (this._initialized) return;

    // 获取应用根目录（可执行文件所在目录）
    const appPath = getAppPath();

    console.log('[Config] 应用根目录:', appPath);

    this._configDir = path.join(appPath, 'config');
    this._logsDir = path.join(appPath, 'logs');

    // 确保目录存在
    this._ensureDir(this._configDir);
    this._ensureDir(this._logsDir);

    console.log('[Config] 配置目录:', this._configDir);
    console.log('[Config] 日志目录:', this._logsDir);

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

  // 获取服务器配置（从环境变量或配置文件读取）
  public get server(): ServerConfig {
    const config = this.get('server') ?? {};
    return {
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
  }

  // 获取日志配置（从环境变量或配置文件读取）
  public get logs(): LogsConfig {
    const config = this.get('logs') ?? {};
    return {
      enable: this._getEnvBoolean('COMFYUI_LOG_ENABLE', config.enable ?? true), // 默认启用
      level: this._getEnvString('COMFYUI_LOG_LEVEL', config.level) as 'error' | 'warn' | 'info',
      maxSize: this._getEnvNumber('COMFYUI_LOG_MAX_SIZE', config.maxSize),
      keepDays: this._getEnvNumber('COMFYUI_LOG_KEEP_DAYS', config.keepDays),
      realtime: this._getEnvBoolean('COMFYUI_LOG_REALTIME', config.realtime ?? true) // 默认启用实时日志
    };
  }

  // 获取高级配置（从环境变量或配置文件读取）
  public get advanced(): AdvancedConfig {
    const config = this.get('advanced') ?? {};
    return {
      singleInstance: this._getEnvBoolean('COMFYUI_SINGLE_INSTANCE', config.singleInstance ?? true), // 默认启用单实例
      stdoutThrottle: this._getEnvNumber('COMFYUI_STDOUT_THROTTLE', config.stdoutThrottle)
    };
  }

  // 获取托盘配置（从环境变量或配置文件读取）
  public get tray(): TrayConfig {
    const config = this.get('tray') ?? {};
    return {
      minimizeToTray: this._getEnvBoolean('COMFYUI_MINIMIZE_TO_TRAY', config.minimizeToTray)
    };
  }

  // 获取窗口配置（从环境变量或配置文件读取）
  public get window(): WindowConfig {
    const config = this.get('window') ?? {};
    return {
      width: this._getEnvNumber('COMFYUI_WINDOW_WIDTH', config.width),
      height: this._getEnvNumber('COMFYUI_WINDOW_HEIGHT', config.height),
      x: this._getEnvNumber('COMFYUI_WINDOW_X', config.x),
      y: this._getEnvNumber('COMFYUI_WINDOW_Y', config.y),
      maximized: this._getEnvBoolean('COMFYUI_WINDOW_MAXIMIZED', config.maximized)
    };
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
      // 尝试自动检测便携包内的路径
      const appPath = process.cwd();

      // 检测 ComfyUI
      if (comfyuiPath === undefined || comfyuiPath === '') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { detectComfyUIPath } = require('./path-detector') as { detectComfyUIPath: (appPath: string) => string | null };
        const detectedPath = detectComfyUIPath(appPath);
        if (detectedPath) {
          this.set('comfyuiPath', detectedPath);
          console.log(`[Config] 自动检测到 ComfyUI: ${detectedPath}`);
        }
      }

      // 检测 Python
      if (!pythonPath) {
        const newComfyuiPath = this.get('comfyuiPath');
        const possiblePythonPaths: string[] = [];

        // 如果有 ComfyUI 路径,优先检测其父目录下的 python_embeded
        if (newComfyuiPath) {
          const comfyuiParent = path.dirname(newComfyuiPath);
          possiblePythonPaths.push(
            path.join(comfyuiParent, 'python_embeded', 'python.exe'),
            path.join(comfyuiParent, 'python', 'python.exe')
          );
        }

        // 使用共享函数查找 Python 路径
        const pythonPath = findPythonPath(appPath);
        if (pythonPath) {
          this.set('pythonPath', pythonPath);
          console.log(`[Config] 自动检测到 Python: ${pythonPath}`);
        }
      }

      // 重新获取路径
      const newComfyuiPath = this.get('comfyuiPath');
      const newPythonPath = this.get('pythonPath');

      if (!newComfyuiPath || !newPythonPath) {
        console.log('[Config] 未找到 ComfyUI 或 Python 路径');
        return false;
      }
    }

    // 验证 ComfyUI 路径是否存在
    const finalComfyuiPath = this.get('comfyuiPath');
    if (finalComfyuiPath && !fsSync.existsSync(finalComfyuiPath)) {
      console.log(`[Config] ComfyUI 路径不存在: ${finalComfyuiPath}`);
      return false;
    }

    // 验证 Python 可执行文件是否存在
    const finalPythonPath = this.get('pythonPath');
    if (finalPythonPath && !fsSync.existsSync(finalPythonPath)) {
      console.log(`[Config] Python 路径不存在: ${finalPythonPath}`);
      return false;
    }

    console.log('[Config] 环境检查通过');
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

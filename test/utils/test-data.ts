/**
 * 测试数据工厂
 * 生成各种测试场景所需的数据
 */

import type {
  AppConfig,
  ServerConfig,
  WindowConfig,
  LogsConfig,
  TrayConfig,
  AdvancedConfig,
  StateData,
  LogLevel
} from '../../src/types';

// 默认配置
export const DEFAULT_TEST_CONFIG: AppConfig = {
  comfyuiPath: '/test/comfyui',
  pythonPath: '/test/python/python.exe',
  window: {
    width: 1280,
    height: 720,
    x: null,
    y: null,
    maximized: false
  },
  server: {
    port: 8188,
    autoStart: true,
    autoRestart: true,
    cpuMode: false,
    listenAll: false,
    disableCUDA: false,
    disableIPEX: false,
    modelDir: '/test/models',
    outputDir: '/test/output',
    customArgs: '',
    timeout: 30000
  },
  logs: {
    enable: true,
    level: 'info',
    maxSize: 10485760,
    keepDays: 7,
    realtime: true
  },
  tray: {
    minimizeToTray: true
  },
  advanced: {
    singleInstance: true,
    stdoutThrottle: 100
  }
};

// 创建测试配置
export function createTestConfig(overrides?: Partial<AppConfig>): AppConfig {
  return {
    ...DEFAULT_TEST_CONFIG,
    ...overrides,
    window: { ...DEFAULT_TEST_CONFIG.window, ...overrides?.window },
    server: { ...DEFAULT_TEST_CONFIG.server, ...overrides?.server },
    logs: { ...DEFAULT_TEST_CONFIG.logs, ...overrides?.logs },
    tray: { ...DEFAULT_TEST_CONFIG.tray, ...overrides?.tray },
    advanced: { ...DEFAULT_TEST_CONFIG.advanced, ...overrides?.advanced }
  };
}

// 创建无效配置（用于测试异常场景）
export function createInvalidConfig(): Partial<AppConfig> {
  return {
    comfyuiPath: '',
    pythonPath: '',
    server: {
      port: 'invalid' as unknown as number, // 类型错误
      autoStart: 'yes' as unknown as boolean
    } as unknown as ServerConfig
  };
}

// 创建边界配置
export function createBoundaryConfig(): AppConfig {
  return createTestConfig({
    comfyuiPath: '', // 空路径
    pythonPath: '', // 空路径
    server: {
      port: 0, // 最小端口
      autoStart: false,
      autoRestart: false,
      cpuMode: true,
      listenAll: true,
      disableCUDA: true,
      disableIPEX: true,
      modelDir: '',
      outputDir: '',
      customArgs: '--very-long-args --another-arg',
      timeout: 0
    },
    window: {
      width: 1, // 最小窗口
      height: 1,
      x: -9999, // 超出屏幕
      y: -9999,
      maximized: false
    }
  });
}

// 创建嵌套路径测试数据
export function createNestedPathTestData(): Record<string, unknown> {
  return {
    'server.port': 8188,
    'server.autoStart': true,
    'server.modelDir': '/test/models',
    'window.width': 1280,
    'window.height': 720,
    'logs.level': 'info',
    'tray.minimizeToTray': true,
    'advanced.singleInstance': true
  };
}

// 创建非法嵌套路径测试数据
export function createInvalidNestedPaths(): string[] {
  return [
    '', // 空路径
    '.', // 单点
    '..', // 双点
    'server.', // 末尾点
    '.server', // 开头点
    'server..port', // 连续点
    'server.port.extra', // 过深路径
    'invalid.key' // 不存在的键
  ];
}

// 创建路径测试数据
export function createPathTestData(): {
  valid: string[];
  invalid: string[];
  edge: string[];
} {
  return {
    valid: [
      '/valid/path',
      'C:\\valid\\windows\\path',
      '/path/with spaces',
      '/path/with-dashes',
      '/path/with_underscores'
    ],
    invalid: [
      '', // 空路径
      '   ', // 空白路径
      'relative/path', // 相对路径
      'not-a-path', // 非路径字符串
      '/path/with<>invalid|chars' // 非法字符
    ],
    edge: [
      '/', // 根路径
      '/very/deep/nested/path/that/goes/on/forever',
      '/path/with/unicode/中文/路径',
      '/path/with/special@#$chars'
    ]
  };
}

// 创建进程信息测试数据
export function createProcessInfoTestData(): {
  valid: { pid: number; port: number }[];
  invalid: { pid: number | null; port: number | null }[];
} {
  return {
    valid: [
      { pid: 12345, port: 8188 },
      { pid: 1, port: 1 },
      { pid: 99999, port: 65535 }
    ],
    invalid: [
      { pid: null, port: null },
      { pid: 0, port: 0 },
      { pid: -1, port: -1 },
      { pid: 12345, port: null },
      { pid: null, port: 8188 }
    ]
  };
}

// 创建日志测试数据
export function createLogTestData(): {
  entries: Array<{ level: 'error' | 'warn' | 'info'; content: string }>;
  large: string;
} {
  return {
    entries: [
      { level: 'info', content: 'Application started' },
      { level: 'warn', content: 'Config file not found, using defaults' },
      { level: 'error', content: 'Failed to start ComfyUI' },
      { level: 'info', content: 'ComfyUI started on port 8188' }
    ],
    large: 'x'.repeat(1024 * 1024) // 1MB 日志
  };
}

// ============== 新增测试数据生成函数 ==============

/**
 * 创建测试状态数据
 * @param overrides 覆盖默认属性
 */
export function createTestState(overrides?: Partial<StateData>): StateData {
  const defaultState: StateData = {
    status: 'stopped',
    pid: null,
    port: null
  };

  return { ...defaultState, ...overrides };
}

/**
 * 创建测试日志条目
 * @param level 日志级别
 * @param message 日志消息
 */
export function createTestLogEntry(
  level: LogLevel,
  message: string
): {
  level: LogLevel;
  message: string;
  timestamp: string;
} {
  return {
    level,
    message,
    timestamp: new Date().toLocaleTimeString()
  };
}

/**
 * 创建进程状态测试数据
 */
export function createProcessStatusTestData(): {
  valid: Array<{ status: string; canStart: boolean; canStop: boolean }>;
  transitions: Array<{ from: string; to: string; valid: boolean }>;
} {
  return {
    valid: [
      { status: 'stopped', canStart: true, canStop: false },
      { status: 'starting', canStart: false, canStop: false },
      { status: 'running', canStart: false, canStop: true },
      { status: 'stopping', canStart: true, canStop: false },
      { status: 'failed', canStart: true, canStop: false },
      { status: 'restarting', canStart: true, canStop: false }
    ],
    transitions: [
      { from: 'stopped', to: 'starting', valid: true },
      { from: 'starting', to: 'running', valid: true },
      { from: 'starting', to: 'failed', valid: true },
      { from: 'running', to: 'stopping', valid: true },
      { from: 'running', to: 'failed', valid: true },
      { from: 'stopping', to: 'stopped', valid: true },
      { from: 'failed', to: 'starting', valid: true },
      { from: 'stopped', to: 'running', valid: false },
      { from: 'running', to: 'starting', valid: false }
    ]
  };
}

/**
 * 创建窗口配置测试数据
 */
export function createWindowConfigTestData(): {
  valid: WindowConfig[];
  invalid: Partial<WindowConfig>[];
  edge: WindowConfig[];
} {
  return {
    valid: [
      { width: 800, height: 600, x: 100, y: 100, maximized: false },
      { width: 1920, height: 1080, x: null, y: null, maximized: true },
      { width: 1280, height: 720, x: 0, y: 0, maximized: false }
    ],
    invalid: [
      { width: 0, height: 600, x: 100, y: 100, maximized: false },
      { width: 800, height: 0, x: 100, y: 100, maximized: false },
      { width: -100, height: 600, x: 100, y: 100, maximized: false }
    ],
    edge: [
      { width: 1, height: 1, x: null, y: null, maximized: false },
      { width: 10000, height: 10000, x: 99999, y: 99999, maximized: false }
    ]
  };
}

/**
 * 创建服务器配置测试数据
 */
export function createServerConfigTestData(): {
  valid: ServerConfig[];
  edge: ServerConfig[];
} {
  return {
    valid: [
      {
        port: 8188,
        autoStart: true,
        autoRestart: true,
        cpuMode: false,
        listenAll: false,
        disableCUDA: false,
        disableIPEX: false,
        modelDir: '',
        outputDir: '',
        customArgs: '',
        timeout: 30000
      }
    ],
    edge: [
      {
        port: 1,
        autoStart: false,
        autoRestart: false,
        cpuMode: true,
        listenAll: true,
        disableCUDA: true,
        disableIPEX: true,
        modelDir: '/very/long/path/that/might/cause/issues',
        outputDir: '/another/long/path',
        customArgs: '--arg1 --arg2 --arg3 --arg4 --arg5',
        timeout: 1
      }
    ]
  };
}

/**
 * 创建日志配置测试数据
 */
export function createLogsConfigTestData(): {
  valid: LogsConfig[];
  edge: LogsConfig[];
} {
  return {
    valid: [
      { enable: true, level: 'info', maxSize: 10485760, keepDays: 7, realtime: true },
      { enable: true, level: 'warn', maxSize: 10485760, keepDays: 7, realtime: false },
      { enable: true, level: 'error', maxSize: 10485760, keepDays: 7, realtime: true }
    ],
    edge: [
      { enable: false, level: 'info', maxSize: 0, keepDays: 0, realtime: false },
      { enable: true, level: 'info', maxSize: 1, keepDays: 365, realtime: true }
    ]
  };
}

/**
 * 创建托盘配置测试数据
 */
export function createTrayConfigTestData(): {
  valid: TrayConfig[];
} {
  return {
    valid: [{ minimizeToTray: true }, { minimizeToTray: false }]
  };
}

/**
 * 创建高级配置测试数据
 */
export function createAdvancedConfigTestData(): {
  valid: AdvancedConfig[];
  edge: AdvancedConfig[];
} {
  return {
    valid: [
      { singleInstance: true, stdoutThrottle: 100 },
      { singleInstance: false, stdoutThrottle: 200 }
    ],
    edge: [
      { singleInstance: true, stdoutThrottle: 0 },
      { singleInstance: true, stdoutThrottle: 10000 }
    ]
  };
}

/**
 * 创建 IPC 消息测试数据
 */
export function createIpcMessageTestData(): {
  channels: string[];
  validMessages: Record<string, unknown>;
  invalidMessages: Record<string, unknown>;
} {
  return {
    channels: [
      'getConfig',
      'updateConfig',
      'resetConfig',
      'startComfyui',
      'stopComfyui',
      'restartComfyui',
      'getLogContent',
      'clearLog',
      'saveEnvPath',
      'selectComfyuiPath',
      'selectPythonPath',
      'selectDirectory',
      'restartApp',
      'closeWindow'
    ],
    validMessages: {
      updateConfig: { key: 'server.port', value: 8188 },
      saveEnvPath: { comfyuiPath: '/test/comfyui', pythonPath: '/test/python', envArgs: '', envVars: '' },
      selectDirectory: { title: '选择文件夹' }
    },
    invalidMessages: {
      updateConfig: { key: '', value: null },
      saveEnvPath: { comfyuiPath: '', pythonPath: '' },
      selectDirectory: { title: 123 }
    }
  };
}

/**
 * 创建环境检查结果测试数据
 */
export function createEnvironmentCheckTestData(): {
  success: Array<{ type: 'error' | 'warn' | 'info'; msg: string }>;
  warnings: Array<{ type: 'error' | 'warn' | 'info'; msg: string }>;
  errors: Array<{ type: 'error' | 'warn' | 'info'; msg: string }>;
} {
  return {
    success: [
      { type: 'info', msg: 'Python 版本检查通过' },
      { type: 'info', msg: 'ComfyUI 路径检查通过' }
    ],
    warnings: [
      { type: 'warn', msg: 'GPU 内存不足，建议使用 CPU 模式' },
      { type: 'warn', msg: '端口 8188 已被占用，将使用 8189' }
    ],
    errors: [
      { type: 'error', msg: 'Python 未找到' },
      { type: 'error', msg: 'ComfyUI 路径不存在' },
      { type: 'error', msg: 'main.py 文件缺失' }
    ]
  };
}

/**
 * 创建进程输出测试数据
 */
export function createProcessOutputTestData(): {
  startupSuccess: string[];
  startupFailure: string[];
  normalOutput: string[];
  errorOutput: string[];
} {
  return {
    startupSuccess: ['ComfyUI server started on port 8188', 'To see the GUI go to: http://127.0.0.1:8188'],
    startupFailure: [
      'Error: Address already in use',
      'ImportError: No module named torch',
      'RuntimeError: CUDA out of memory'
    ],
    normalOutput: ['Loading model weights...', 'Model loaded successfully', 'Processing image...'],
    errorOutput: ['WARNING: CUDA not available', 'ERROR: Failed to load model', 'Exception: Out of memory']
  };
}

/**
 * 创建菜单项测试数据
 */
export function createMenuItemTestData(): {
  trayMenuItems: Array<{ label: string; enabled: boolean; action: string }>;
  contextMenuItems: Array<{ label: string; enabled: boolean; action: string }>;
} {
  return {
    trayMenuItems: [
      { label: '启动 ComfyUI', enabled: true, action: 'start' },
      { label: '停止 ComfyUI', enabled: true, action: 'stop' },
      { label: '重启 ComfyUI', enabled: true, action: 'restart' },
      { label: '查看实时日志', enabled: true, action: 'showLog' },
      { label: '设置', enabled: true, action: 'showSettings' },
      { label: '退出', enabled: true, action: 'quit' }
    ],
    contextMenuItems: [
      { label: '刷新页面', enabled: true, action: 'reload' },
      { label: '重置所有配置', enabled: true, action: 'resetConfig' }
    ]
  };
}

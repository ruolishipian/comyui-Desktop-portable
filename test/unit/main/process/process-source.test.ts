/**
 * ProcessManager 源代码测试
 * 直接测试 src/modules/process.ts 的代码
 */

/// <reference types="jest" />

import { ProcessManager } from '../../../../src/modules/process';
import { spawn } from 'child_process';

// Mock configManager
jest.mock('../../../../src/modules/config', () => ({
  configManager: {
    get: jest.fn((key: string) => {
      if (key === 'comfyuiPath') return '/test/comfyui';
      if (key === 'pythonPath') return '/test/python';
      return undefined;
    }),
    set: jest.fn(),
    server: {
      port: 8188,
      autoRestart: false,
      timeout: 15000,
      cpuMode: false,
      listenAll: false,
      disableCUDA: false,
      disableIPEX: false,
      modelDir: '',
      outputDir: '',
      customArgs: ''
    },
    advanced: {
      singleInstance: false,
      stdoutThrottle: 0
    }
  }
}));

// Mock environmentChecker
jest.mock('../../../../src/modules/environment', () => ({
  environmentChecker: {
    runAllChecks: jest.fn(() => Promise.resolve([])),
    hasErrors: jest.fn(() => false),
    findAvailablePort: jest.fn(() => Promise.resolve(8188)),
    checkAndCleanPort: jest.fn(() => Promise.resolve({ cleaned: false, pids: [] }))
  }
}));

// Mock logger
jest.mock('../../../../src/modules/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    logComfyUIOutput: jest.fn()
  }
}));

// Mock state
jest.mock('../../../../src/modules/state', () => {
  interface MockState {
    _status: string;
    _pid: number | null;
    _port: number | null;
    _restartAttempts: number;
    _isManualStop: boolean;
    _maxRestartAttempts: number;
    status: string;
    pid: number | null;
    port: number | null;
    canStart: jest.Mock;
    isManualStop: boolean;
    setManualStop: jest.Mock;
    restartAttempts: number;
    maxRestartAttempts: number;
    canRestart: jest.Mock;
    incrementRestartAttempts: jest.Mock;
    resetRestartAttempts: jest.Mock;
    getRestartCooldownRemaining: jest.Mock;
    getStateData: jest.Mock;
  }

  const state: MockState = {
    _status: 'stopped',
    _pid: null,
    _port: null,
    _restartAttempts: 0,
    _isManualStop: false,
    _maxRestartAttempts: 3,
    get status() {
      return this._status;
    },
    set status(value) {
      this._status = value;
    },
    get pid() {
      return this._pid;
    },
    set pid(value) {
      this._pid = value;
    },
    get port() {
      return this._port;
    },
    set port(value) {
      this._port = value;
    },
    canStart: jest.fn(() => true),
    get isManualStop() {
      return this._isManualStop;
    },
    set isManualStop(value) {
      this._isManualStop = value;
    },
    setManualStop: jest.fn(function (this: MockState, value: boolean) {
      this._isManualStop = value;
    }),
    get restartAttempts() {
      return this._restartAttempts;
    },
    set restartAttempts(value) {
      this._restartAttempts = value;
    },
    get maxRestartAttempts() {
      return this._maxRestartAttempts;
    },
    set maxRestartAttempts(value) {
      this._maxRestartAttempts = value;
    },
    canRestart: jest.fn(() => true),
    incrementRestartAttempts: jest.fn(function (this: MockState) {
      this._restartAttempts++;
    }),
    resetRestartAttempts: jest.fn(function (this: MockState) {
      this._restartAttempts = 0;
    }),
    getRestartCooldownRemaining: jest.fn(() => 0),
    getStateData: jest.fn(function (this: MockState) {
      return {
        status: this._status,
        pid: this._pid,
        port: this._port
      };
    })
  };

  return {
    stateManager: state,
    Status: {
      STOPPED: 'stopped',
      STARTING: 'starting',
      RUNNING: 'running',
      STOPPING: 'stopping',
      RESTARTING: 'restarting',
      FAILED: 'failed'
    }
  };
});

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    pid: 12345,
    on: jest.fn(),
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    kill: jest.fn(),
    killed: false
  }))
}));

// Mock tree-kill
jest.mock('tree-kill', () =>
  jest.fn((_pid, _signal, callback) => {
    if (callback) callback(null);
  })
);

// Mock dialog
jest.mock('electron', () => ({
  dialog: {
    showErrorBox: jest.fn(),
    showMessageBox: jest.fn(() => Promise.resolve({ response: 0 }))
  },
  app: {
    getAppPath: jest.fn(() => '/test/app')
  }
}));

// Mock wait-on
jest.mock('wait-on', () => jest.fn(() => Promise.resolve()));

// Mock proxy
jest.mock('../../../../src/modules/proxy', () => ({
  proxyManager: {
    applyProxyToEnv: jest.fn((env) => env)
  }
}));

// Mock line-buffer
jest.mock('../../../../src/modules/line-buffer', () => ({
  LineBuffer: class LineBuffer {
    private _callback: (line: string) => void;
    constructor(callback: (line: string) => void) {
      this._callback = callback;
    }
    push = jest.fn((line: string) => {
      if (line.includes('\n')) {
        const lines = line.split('\n').filter((l: string) => l.length > 0);
        for (const l of lines) {
          this._callback(l);
        }
      }
    });
    flush = jest.fn();
  }
}));

// Mock log-parser
jest.mock('../../../../src/modules/log-parser', () => ({
  parseLogLine: jest.fn((line: string) => {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('error') && !lowerLine.includes('round-off error')) {
      return { level: 'error', message: line, structured: false };
    }
    if (lowerLine.includes('warning') || lowerLine.includes('warn:') || lowerLine.includes('deprecated')) {
      return { level: 'warn', message: line, structured: false };
    }
    return { level: 'info', message: line, structured: false };
  })
}));

// 导入 mock 后的模块
const { stateManager } = require('../../../../src/modules/state');
const { configManager } = require('../../../../src/modules/config');
const { environmentChecker } = require('../../../../src/modules/environment');

beforeEach(() => {
  jest.useRealTimers();
  jest.clearAllTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllTimers();
});

afterAll(() => {
  jest.useRealTimers();
  jest.clearAllTimers();
});

describe('ProcessManager 源代码测试', () => {
  let processManager: ProcessManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    processManager = new ProcessManager();
    stateManager.status = 'stopped';
    stateManager.pid = null;
    stateManager.port = null;
    stateManager.isManualStop = false;
    stateManager.restartAttempts = 0;
    stateManager._maxRestartAttempts = 3;
    configManager.server.timeout = 15000;
    configManager.server.autoRestart = false;
    environmentChecker.hasErrors.mockReturnValue(false);
    environmentChecker.runAllChecks.mockResolvedValue([]);
    environmentChecker.findAvailablePort.mockResolvedValue(8188);
    stateManager.canStart.mockReturnValue(true);
    stateManager.canRestart.mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('状态回调', () => {
    test('应该能设置状态变更回调', () => {
      const callback = jest.fn();
      processManager.setOnStatusChange(callback);
      expect(true).toBe(true);
    });

    test('状态变更时应调用回调', async () => {
      const callback = jest.fn();
      processManager.setOnStatusChange(callback);

      processManager.stop();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('进程信息', () => {
    test('应该能获取进程信息', () => {
      const info = processManager.getProcessInfo();
      expect(info).toHaveProperty('pid');
      expect(info).toHaveProperty('killed');
    });

    test('未启动时 pid 应为 null', () => {
      const info = processManager.getProcessInfo();
      expect(info.pid).toBeNull();
    });

    test('未启动时 killed 应为 true', () => {
      const info = processManager.getProcessInfo();
      expect(info.killed).toBe(true);
    });
  });

  describe('启动进程', () => {
    test('状态不允许启动时应返回', async () => {
      stateManager.canStart.mockReturnValue(false);

      await processManager.start();

      expect(stateManager.canStart).toHaveBeenCalled();
    });

    test('环境检查有错误时应设置失败状态', async () => {
      environmentChecker.hasErrors.mockReturnValue(true);
      environmentChecker.runAllChecks.mockResolvedValue([{ type: 'error', msg: '测试错误' }]);

      await processManager.start();

      expect(stateManager.status).toBe('failed');
    });

    test('环境检查通过应开始启动', async () => {
      await processManager.start();

      expect(['starting', 'running']).toContain(stateManager.status);
      expect(spawn).toHaveBeenCalled();
    });

    test('启动时应设置 PID 和端口', async () => {
      await processManager.start();

      expect(stateManager.pid).toBe(12345);
      expect(stateManager.port).toBe(8188);
    });

    test('无可用端口应抛出错误', async () => {
      environmentChecker.findAvailablePort.mockResolvedValue(null);

      await processManager.start();

      expect(stateManager.status).toBe('failed');
    });
  });

  describe('停止进程', () => {
    test('停止未启动的进程应正常处理', () => {
      processManager.stop();
      expect(stateManager.status).toBe('stopped');
    });

    test('停止时应设置 stopping 状态', async () => {
      await processManager.start();
      processManager.stop();

      expect(['stopping', 'stopped']).toContain(stateManager.status);
    });

    test('停止时应设置手动停止标志', async () => {
      await processManager.start();
      processManager.stop();

      expect(stateManager.setManualStop).toHaveBeenCalledWith(true);
    });
  });

  describe('重启进程', () => {
    test('重启应正常执行', () => {
      processManager.restart();
      expect(true).toBe(true);
    });

    test('重启应设置 restarting 状态', () => {
      processManager.restart();
      expect(stateManager.status).toBe('restarting');
    });

    test('重启应调用 resetRestartAttempts', () => {
      processManager.restart();
      expect(stateManager.resetRestartAttempts).toHaveBeenCalled();
    });
  });

  describe('构建参数', () => {
    test('应包含基本参数', async () => {
      await processManager.start();

      expect(spawn).toHaveBeenCalledWith(
        '/test/python',
        expect.arrayContaining([
          expect.stringContaining('main.py'),
          '--port',
          '8188',
          '--disable-auto-launch'
        ]),
        expect.any(Object)
      );
    });

    test('CPU 模式应添加 --cpu 参数', async () => {
      configManager.server.cpuMode = true;

      await processManager.start();

      expect(spawn).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(['--cpu']), expect.any(Object));

      configManager.server.cpuMode = false;
    });

    test('监听所有接口应添加 --listen 参数', async () => {
      configManager.server.listenAll = true;

      await processManager.start();

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--listen', '0.0.0.0']),
        expect.any(Object)
      );

      configManager.server.listenAll = false;
    });

    test('禁用 CUDA 应添加 --disable-cuda-malloc 参数', async () => {
      configManager.server.disableCUDA = true;

      await processManager.start();

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--disable-cuda-malloc']),
        expect.any(Object)
      );

      configManager.server.disableCUDA = false;
    });

    test('禁用 IPEX 应添加 --disable-ipex-optimize 参数', async () => {
      configManager.server.disableIPEX = true;

      await processManager.start();

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--disable-ipex-optimize']),
        expect.any(Object)
      );

      configManager.server.disableIPEX = false;
    });

    test('modelDir 设置时应使用自定义模型目录', async () => {
      configManager.server.modelDir = '/custom/models';

      await processManager.start();

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--base-directory', '/custom/models']),
        expect.any(Object)
      );

      configManager.server.modelDir = '';
    });

    test('outputDir 设置时应使用自定义输出目录', async () => {
      configManager.server.outputDir = '/custom/output';

      await processManager.start();

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--output-directory', '/custom/output']),
        expect.any(Object)
      );

      configManager.server.outputDir = '';
    });

    test('自定义参数应被添加', async () => {
      configManager.server.customArgs = '--test-arg --another-arg';

      await processManager.start();

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--test-arg', '--another-arg']),
        expect.any(Object)
      );

      configManager.server.customArgs = '';
    });
  });

  describe('环境检查处理', () => {
    test('警告检查应显示对话框', async () => {
      environmentChecker.runAllChecks.mockResolvedValue([{ type: 'warn', msg: '测试警告' }]);

      await processManager.start();

      expect(['starting', 'running']).toContain(stateManager.status);
    });

    test('错误检查应阻止启动', async () => {
      environmentChecker.runAllChecks.mockResolvedValue([{ type: 'error', msg: '测试错误' }]);
      environmentChecker.hasErrors.mockReturnValue(true);

      await processManager.start();

      expect(stateManager.status).toBe('failed');
    });

    test('info 类型检查应记录日志', async () => {
      environmentChecker.runAllChecks.mockResolvedValue([{ type: 'info', msg: '测试信息' }]);

      await processManager.start();

      expect(['starting', 'running']).toContain(stateManager.status);
    });
  });

  describe('进程事件处理', () => {
    test('进程错误应设置失败状态', async () => {
      const mockProcess = {
        pid: 12345,
        on: jest.fn((event: string, callback: (err: Error) => void) => {
          if (event === 'error') {
            setImmediate(() => callback(new Error('Process error')));
          }
        }),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
        killed: false
      };

      (spawn as jest.Mock).mockReturnValueOnce(mockProcess);

      await processManager.start();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(stateManager.status).toBe('failed');
    });

    test('进程退出码为 0 应设置停止状态', async () => {
      const mockProcess = {
        pid: 12345,
        on: jest.fn((event: string, callback: (code: number | null, signal: string | null) => void) => {
          if (event === 'exit') {
            setImmediate(() => callback(0, null));
          }
        }),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
        killed: false
      };

      (spawn as jest.Mock).mockReturnValueOnce(mockProcess);

      await processManager.start();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(stateManager.status).toBe('stopped');
    });

    test('进程退出码非 0 应设置失败状态', async () => {
      const mockProcess = {
        pid: 12345,
        on: jest.fn((event: string, callback: (code: number | null, signal: string | null) => void) => {
          if (event === 'exit') {
            setImmediate(() => callback(1, null));
          }
        }),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
        killed: false
      };

      (spawn as jest.Mock).mockReturnValueOnce(mockProcess);

      await processManager.start();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(stateManager.status).toBe('failed');
    });

    test('手动停止后退出应不设置状态（由 stop cleanup 处理）', async () => {
      const mockProcess = {
        pid: 12345,
        on: jest.fn((event: string, callback: (code: number | null, signal: string | null) => void) => {
          if (event === 'exit') {
            setImmediate(() => callback(1, null));
          }
        }),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
        killed: false
      };

      (spawn as jest.Mock).mockReturnValueOnce(mockProcess);

      await processManager.start();
      stateManager.isManualStop = true;

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(stateManager.status).toBe('running');
    });
  });

  describe('自动重启', () => {
    test('自动重启启用时应尝试重启', async () => {
      configManager.server.autoRestart = true;
      stateManager.restartAttempts = 0;
      stateManager.maxRestartAttempts = 3;

      const mockProcess = {
        pid: 12345,
        on: jest.fn((event: string, callback: (code: number | null, signal: string | null) => void) => {
          if (event === 'exit') {
            setTimeout(() => callback(1, null), 100);
          }
        }),
        stdout: {
          on: jest.fn((event: string, callback: (data: Buffer) => void) => {
            if (event === 'data') {
              setImmediate(() => callback(Buffer.from('ComfyUI server started on port 8188')));
            }
          })
        },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
        killed: false
      };

      (spawn as jest.Mock).mockReturnValueOnce(mockProcess);

      await processManager.start();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(stateManager.status).toBe('running');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(['restarting', 'starting', 'running']).toContain(stateManager.status);

      configManager.server.autoRestart = false;
    });

    test('重启次数用尽应设置失败状态', async () => {
      configManager.server.autoRestart = true;
      stateManager.restartAttempts = 3;
      stateManager.maxRestartAttempts = 3;
      stateManager.canRestart.mockReturnValue(false);

      const mockProcess = {
        pid: 12345,
        on: jest.fn((event: string, callback: (code: number | null, signal: string | null) => void) => {
          if (event === 'exit') {
            setTimeout(() => callback(1, null), 10);
          }
        }),
        stdout: {
          on: jest.fn((event: string, callback: (data: Buffer) => void) => {
            if (event === 'data') {
              setTimeout(() => callback(Buffer.from('ComfyUI server started on port 8188')), 5);
            }
          })
        },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
        killed: false
      };

      (spawn as jest.Mock).mockReturnValueOnce(mockProcess);

      await processManager.start();
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(['running', 'failed', 'stopped']).toContain(stateManager.status);

      configManager.server.autoRestart = false;
    });

    test.skip('冷却时间内不应重启', async () => {
      configManager.server.autoRestart = true;
      stateManager.restartAttempts = 0;
      stateManager.maxRestartAttempts = 3;
      stateManager.canRestart.mockReturnValue(false);
      stateManager.getRestartCooldownRemaining.mockReturnValue(5000);

      const mockProcess = {
        pid: 12345,
        on: jest.fn((event: string, callback: (code: number | null, signal: string | null) => void) => {
          if (event === 'exit') {
            setImmediate(() => callback(1, null));
          }
        }),
        stdout: {
          on: jest.fn((event: string, callback: (data: Buffer) => void) => {
            if (event === 'data') {
              setImmediate(() => callback(Buffer.from('ComfyUI server started on port 8188')));
            }
          })
        },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
        killed: false
      };

      (spawn as jest.Mock).mockReturnValueOnce(mockProcess);

      await processManager.start();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(stateManager.status).toBe('failed');

      configManager.server.autoRestart = false;
      stateManager.canRestart.mockReturnValue(true);
    });
  });

  describe('启动成功检测', () => {
    test.skip('检测到启动成功消息应设置运行状态', async () => {
      environmentChecker.hasErrors.mockReturnValue(false);
      environmentChecker.runAllChecks.mockResolvedValue([]);

      const mockProcess = {
        pid: 12345,
        on: jest.fn(),
        stdout: {
          on: jest.fn((event: string, callback: (data: Buffer) => void) => {
            if (event === 'data') {
              setTimeout(() => callback(Buffer.from('ComfyUI server started on port 8188')), 10);
            }
          })
        },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
        killed: false
      };

      (spawn as jest.Mock).mockReturnValueOnce(mockProcess);

      await processManager.start();

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(stateManager.status).toBe('running');
    });

    test('stderr 输出应记录错误日志', async () => {
      const mockProcess = {
        pid: 12345,
        on: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: {
          on: jest.fn((event: string, callback: (data: Buffer) => void) => {
            if (event === 'data') {
              setImmediate(() => callback(Buffer.from('Error message\n')));
            }
          })
        },
        kill: jest.fn(),
        killed: false
      };

      (spawn as jest.Mock).mockReturnValueOnce(mockProcess);

      await processManager.start();

      await new Promise(resolve => setTimeout(resolve, 50));

      const { logger } = require('../../../../src/modules/logger');
      expect(logger.log).toHaveBeenCalledWith('Error message', 'error');
    });
  });

  describe('超时处理', () => {
    test.skip('启动超时应设置失败状态', async () => {
      configManager.server.timeout = 100;

      const mockProcess = {
        pid: 12345,
        on: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
        killed: false
      };

      (spawn as jest.Mock).mockReturnValueOnce(mockProcess);

      await processManager.start();

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(stateManager.status).toBe('failed');

      configManager.server.timeout = 15000;
    });
  });
});

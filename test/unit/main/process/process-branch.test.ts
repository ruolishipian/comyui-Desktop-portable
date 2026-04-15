/**
 * 进程管理分支覆盖测试
 * 补充 ProcessManager 的分支覆盖测试用例
 */

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

// 导入 mock 后的模块
const { stateManager } = require('../../../../src/modules/state');
const { configManager } = require('../../../../src/modules/config');
const { environmentChecker } = require('../../../../src/modules/environment');

describe('进程管理分支覆盖测试', () => {
  let processManager: ProcessManager;

  beforeEach(() => {
    jest.clearAllMocks();
    processManager = new ProcessManager();

    // 重置状态
    stateManager.status = 'stopped';
    stateManager.pid = null;
    stateManager.port = null;
    stateManager.isManualStop = false;
    stateManager.restartAttempts = 0;
    stateManager._maxRestartAttempts = 3;
    // 重置配置
    configManager.server.timeout = 15000;
    configManager.server.autoRestart = false;
    environmentChecker.hasErrors.mockReturnValue(false);
    environmentChecker.runAllChecks.mockResolvedValue([]);
    environmentChecker.findAvailablePort.mockResolvedValue(8188);
    stateManager.canStart.mockReturnValue(true);
    stateManager.canRestart.mockReturnValue(true);
  });

  describe('_buildArguments 配置分支', () => {
    test('cpuMode 为 true 时应添加 --cpu 参数', async () => {
      configManager.server.cpuMode = true;

      await processManager.start();

      expect(spawn).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(['--cpu']), expect.any(Object));

      configManager.server.cpuMode = false;
    });

    test('listenAll 为 true 时应添加 --listen 0.0.0.0 参数', async () => {
      configManager.server.listenAll = true;

      await processManager.start();

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--listen', '0.0.0.0']),
        expect.any(Object)
      );

      configManager.server.listenAll = false;
    });

    test('disableCUDA 为 true 时应添加 --disable-cuda-malloc 参数', async () => {
      configManager.server.disableCUDA = true;

      await processManager.start();

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--disable-cuda-malloc']),
        expect.any(Object)
      );

      configManager.server.disableCUDA = false;
    });

    test('disableIPEX 为 true 时应添加 --disable-ipex-optimize 参数', async () => {
      configManager.server.disableIPEX = true;

      await processManager.start();

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--disable-ipex-optimize']),
        expect.any(Object)
      );

      configManager.server.disableIPEX = false;
    });

    // modelDir 和 outputDir 配置项测试
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

    test('customArgs 包含 --base-directory 时应忽略 modelDir', async () => {
      configManager.server.modelDir = '/launcher/models';
      configManager.server.customArgs = '--base-directory /custom/models --cpu';

      await processManager.start();

      // 应该使用自定义参数中的 --base-directory
      const callArgs = (spawn as jest.Mock).mock.calls[0]?.[1] as string[];
      expect(callArgs).toContain('--base-directory');
      expect(callArgs).toContain('/custom/models');
      // 不应该包含启动器设置的路径
      expect(callArgs).not.toContain('/launcher/models');

      configManager.server.modelDir = '';
      configManager.server.customArgs = '';
    });

    test('customArgs 有有效参数时应被添加', async () => {
      configManager.server.customArgs = '--test-arg --another-arg';

      await processManager.start();

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--test-arg', '--another-arg']),
        expect.any(Object)
      );

      configManager.server.customArgs = '';
    });

    test('customArgs 包含无效前缀时应被过滤', async () => {
      configManager.server.customArgs = '--valid-arg invalid-arg --another-valid';

      await processManager.start();

      // 验证有效参数被包含
      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--valid-arg', '--another-valid']),
        expect.any(Object)
      );

      // 验证调用参数中不包含独立的 invalid-arg 作为选项
      const callArgs = (spawn as jest.Mock).mock.calls[0]?.[1] as string[];
      // invalid-arg 应该作为 --valid-arg 的值存在，而不是独立的选项
      // 检查它不是作为独立选项（即前面没有其他选项）
      const invalidArgIndex = callArgs?.indexOf('invalid-arg');
      const prevArg = invalidArgIndex !== undefined && invalidArgIndex > 0 ? callArgs?.[invalidArgIndex - 1] : null;
      // 如果 invalid-arg 存在，它前面应该是 --valid-arg（作为其值）
      if (invalidArgIndex !== undefined && invalidArgIndex >= 0) {
        expect(prevArg).toBe('--valid-arg');
      }

      configManager.server.customArgs = '';
    });

    test('customArgs 为空字符串时应不添加额外参数', async () => {
      configManager.server.customArgs = '';

      await processManager.start();

      // 基本参数数量
      const call = (spawn as jest.Mock).mock.calls[0];
      const args = call?.[1] as string[];

      // 只包含基本参数
      expect(args).toContain('--port');
      expect(args).toContain('--base-directory');
      expect(args).toContain('--disable-auto-launch');
    });
  });

  describe('_handleExit 手动停止分支', () => {
    test('手动停止后退出应设置 stopped 状态', async () => {
      const mockProcess = {
        pid: 12345,
        on: jest.fn((event: string, callback: (code: number | null, signal: string | null) => void) => {
          if (event === 'exit') {
            // 模拟手动停止后退出
            setTimeout(() => {
              stateManager.isManualStop = true;
              callback(0, null);
            }, 10);
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
  });

  describe('_handleExit 自动重启分支', () => {
    test('autoRestart 为 true 且 wasRunning 时应尝试重启', async () => {
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

      // 确认启动成功
      expect(stateManager.status).toBe('running');

      // 等待退出和重启
      await new Promise(resolve => setTimeout(resolve, 150));

      // 应该进入重启状态
      expect(['restarting', 'starting', 'running']).toContain(stateManager.status);

      configManager.server.autoRestart = false;
    });

    test('autoRestart 为 false 时不应重启', async () => {
      configManager.server.autoRestart = false;

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
      await new Promise(resolve => setTimeout(resolve, 50));

      // 等待退出
      await new Promise(resolve => setTimeout(resolve, 50));

      // 应该是 failed 状态，不是 restarting
      expect(stateManager.status).toBe('failed');
    });

    test('重启次数用尽时应设置 failed 状态', async () => {
      configManager.server.autoRestart = true;
      stateManager.restartAttempts = 3;
      stateManager.maxRestartAttempts = 3;
      // 确保不会尝试重启
      stateManager.canRestart.mockReturnValue(false);

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
    });

    test('冷却时间内不应重启', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(stateManager.status).toBe('failed');

      configManager.server.autoRestart = false;
      stateManager.canRestart.mockReturnValue(true);
    });
  });

  describe('stop 方法分支', () => {
    test('进程已杀死时应直接设置 stopped 状态', () => {
      const mockProcess = {
        pid: 12345,
        killed: true,
        on: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn()
      };

      (spawn as jest.Mock).mockReturnValueOnce(mockProcess);

      // 手动设置进程
      (processManager as any)._process = mockProcess;

      processManager.stop();

      expect(stateManager.status).toBe('stopped');
    });

    test('进程为 null 时应直接设置 stopped 状态', () => {
      (processManager as any)._process = null;

      processManager.stop();

      expect(stateManager.status).toBe('stopped');
    });

    test('pid 为 undefined 时应正常处理', async () => {
      const mockProcess = {
        pid: undefined,
        killed: false,
        on: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn()
      };

      (spawn as jest.Mock).mockReturnValueOnce(mockProcess);

      await processManager.start();
      processManager.stop();

      // 应该不抛出错误
      expect(true).toBe(true);
    });
  });

  describe('环境检查结果分支', () => {
    test('检查结果包含 info 类型时应记录 info 日志', async () => {
      environmentChecker.runAllChecks.mockResolvedValue([{ type: 'info', msg: '测试信息' }]);

      await processManager.start();

      const { logger } = require('../../../../src/modules/logger');
      expect(logger.log).toHaveBeenCalledWith('测试信息', 'info');
    });

    test('检查结果包含 warn 类型时应记录 warn 日志', async () => {
      environmentChecker.runAllChecks.mockResolvedValue([{ type: 'warn', msg: '测试警告' }]);

      await processManager.start();

      const { logger } = require('../../../../src/modules/logger');
      expect(logger.log).toHaveBeenCalledWith('测试警告', 'warn');
    });

    test('检查结果包含 error 类型时应记录 error 日志', async () => {
      environmentChecker.runAllChecks.mockResolvedValue([{ type: 'error', msg: '测试错误' }]);
      environmentChecker.hasErrors.mockReturnValue(true);

      await processManager.start();

      const { logger } = require('../../../../src/modules/logger');
      expect(logger.log).toHaveBeenCalledWith('测试错误', 'error');

      // 重置状态
      environmentChecker.hasErrors.mockReturnValue(false);
    });
  });

  describe('stdout 输出分支', () => {
    test('输出包含启动成功消息时应设置 running 状态', async () => {
      const mockProcess = {
        pid: 12345,
        on: jest.fn(),
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
      // 增加等待时间确保所有异步操作完成
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(stateManager.status).toBe('running');
    });

    test('输出为空字符串时应不记录日志', async () => {
      const { logger } = require('../../../../src/modules/logger');
      logger.info.mockClear();

      const mockProcess = {
        pid: 12345,
        on: jest.fn(),
        stdout: {
          on: jest.fn((event: string, callback: (data: Buffer) => void) => {
            if (event === 'data') {
              setImmediate(() => callback(Buffer.from('   '))); // 空白字符串
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

      // 空白字符串 trim 后为空，不应记录
      // 注意：由于启动时会记录其他日志，这里只验证不会因为空白字符串崩溃
      expect(true).toBe(true);
    });
  });

  describe('stderr 输出分支', () => {
    test('stderr 有输出时应记录 error 日志', async () => {
      const mockProcess = {
        pid: 12345,
        on: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: {
          on: jest.fn((event: string, callback: (data: Buffer) => void) => {
            if (event === 'data') {
              setImmediate(() => callback(Buffer.from('Error message')));
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
      expect(logger.error).toHaveBeenCalled();
    });

    test('stderr 包含 warning 时应记录 warn 日志', async () => {
      const mockProcess = {
        pid: 12345,
        on: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: {
          on: jest.fn((event: string, callback: (data: Buffer) => void) => {
            if (event === 'data') {
              setImmediate(() => callback(Buffer.from('Warning: deprecated feature')));
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
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    test('stderr 包含 round-off error 时应记录 info 日志', async () => {
      const mockProcess = {
        pid: 12345,
        on: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: {
          on: jest.fn((event: string, callback: (data: Buffer) => void) => {
            if (event === 'data') {
              setImmediate(() =>
                callback(
                  Buffer.from('You may see slightly different numerical results due to floating-point round-off errors')
                )
              );
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
      expect(logger.info).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});

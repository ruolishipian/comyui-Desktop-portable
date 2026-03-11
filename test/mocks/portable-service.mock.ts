/**
 * 便携包服务 Mock
 * 模拟 ComfyUI 便携包的启动、停止、状态管理
 */

import type { ComfyUIStatus } from '../../src/types';

export interface MockProcess {
  pid: number;
  killed: boolean;
  stdout: { on: jest.Mock };
  stderr: { on: jest.Mock };
  on: jest.Mock;
  kill: jest.Mock;
}

export class MockPortableService {
  private _status: ComfyUIStatus = 'stopped';
  private _pid: number | null = null;
  private _port: number | null = null;
  private _process: MockProcess | null = null;
  private _startCancelled = false;

  // 启动服务
  public async start(_comfyuiPath: string, _pythonPath: string, port: number): Promise<void> {
    if (this._status === 'running') {
      throw new Error('Service is already running');
    }

    this._status = 'starting';
    this._startCancelled = false;

    // 模拟启动延迟
    await new Promise(resolve => setTimeout(resolve, 100));

    // 如果启动被取消，直接返回
    if (this._startCancelled) {
      return;
    }

    // 模拟进程
    this._process = {
      pid: 12345,
      killed: false,
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn(),
      kill: jest.fn()
    };

    this._pid = this._process.pid;
    this._port = port;
    this._status = 'running';
  }

  // 停止服务
  public async stop(): Promise<void> {
    if (this._status === 'stopped') {
      return;
    }

    // 如果正在启动，取消启动
    if (this._status === 'starting') {
      this._startCancelled = true;
    }

    // 如果正在重启，保持 restarting 状态
    const isRestarting = this._status === 'restarting';
    if (!isRestarting) {
      this._status = 'stopping';
    }

    // 让出事件循环，允许测试检查中间状态
    await new Promise(resolve => setImmediate(resolve));

    // 模拟停止延迟
    await new Promise(resolve => setTimeout(resolve, 50));

    if (this._process) {
      this._process.killed = true;
      this._process.kill.mockReturnValue(true);
    }

    this._pid = null;
    this._port = null;
    this._process = null;
    this._status = 'stopped';
  }

  // 重启服务
  public async restart(): Promise<void> {
    this._status = 'restarting';
    await this.stop();
    await this.start('/mock/comfyui', '/mock/python', 8188);
  }

  // 获取状态
  public get status(): ComfyUIStatus {
    return this._status;
  }

  // 获取 PID
  public get pid(): number | null {
    return this._pid;
  }

  // 获取端口
  public get port(): number | null {
    return this._port;
  }

  // 模拟启动失败
  public simulateStartFailure(): void {
    this._status = 'failed';
    this._pid = null;
    this._port = null;
    this._process = null;
  }

  // 模拟进程崩溃
  public simulateCrash(): void {
    if (this._process) {
      this._process.killed = true;
    }
    this._status = 'failed';
    this._pid = null;
    this._port = null;
  }

  // 重置状态
  public reset(): void {
    this._status = 'stopped';
    this._pid = null;
    this._port = null;
    this._process = null;
    this._startCancelled = false;
  }
}

// 导出单例
export const mockPortableService = new MockPortableService();

/**
 * 状态管理模块
 * 集中管理应用状态，提供状态变更通知机制
 */

import { StateData, ComfyUIStatus } from '../types';

// 状态枚举
export const Status = {
  STOPPED: 'stopped',
  STARTING: 'starting',
  RUNNING: 'running',
  FAILED: 'failed',
  RESTARTING: 'restarting',
  STOPPING: 'stopping'
} as const;

export type StatusType = (typeof Status)[keyof typeof Status];

// 启动阶段定义（适配便携包）
export const StartupStage = {
  IDLE: 'idle',
  APP_INITIALIZING: 'app_initializing',
  CHECKING_ENVIRONMENT: 'checking_environment',
  CHECKING_PATHS: 'checking_paths',
  CHECKING_FRONTEND: 'checking_frontend',
  CHECKING_DATABASE: 'checking_database',
  CREATING_DIRECTORIES: 'creating_directories',
  BUILDING_ARGUMENTS: 'building_arguments',
  STARTING_PROCESS: 'starting_process',
  WAITING_SERVER: 'waiting_server',
  HEALTH_CHECK: 'health_check',
  READY: 'ready',
  ERROR: 'error'
} as const;

export type StartupStageName = (typeof StartupStage)[keyof typeof StartupStage];

// 启动阶段信息
export interface StartupStageInfo {
  stage: StartupStageName;
  progress?: number; // 0-100
  message?: string;
  error?: string;
  timestamp: number;
}

// 状态变更监听器类型
export type StateListener = (data: StateData) => void;

// 状态管理器
export class StateManager {
  private _status: ComfyUIStatus = Status.STOPPED;
  private _pid: number | null = null;
  private _port: number | null = null;
  private _restartAttempts: number = 0;
  private readonly _maxRestartAttempts: number = 3;
  private _isManualStop: boolean = false;
  private readonly _listeners: Set<StateListener> = new Set();
  private _lastRestartTime: number = 0;
  private readonly _restartCooldown: number = 60000; // 1分钟冷却时间
  private _startTime: number = 0;
  private readonly _minUptimeForSuccess: number = 10000; // 运行10秒才算成功

  // 启动阶段追踪
  private _startupStage: StartupStageInfo = {
    stage: StartupStage.IDLE,
    timestamp: Date.now()
  };

  // 生命周期状态
  private _isQuitting: boolean = false;
  private _isLoaded: boolean = false;
  private _isIpcReady: boolean = false;

  // 获取当前状态
  public get status(): ComfyUIStatus {
    return this._status;
  }

  // 设置状态（自动触发通知）
  public set status(value: ComfyUIStatus) {
    if (this._status !== value) {
      this._status = value;
      // 记录启动时间
      if (value === Status.STARTING) {
        this._startTime = Date.now();
      }
      // 检查是否成功运行足够长时间
      if (value === Status.RUNNING && this._startTime > 0) {
        const uptime = Date.now() - this._startTime;
        if (uptime >= this._minUptimeForSuccess) {
          // 运行成功，重置重启计数
          this._restartAttempts = 0;
          this._lastRestartTime = 0;
        }
      }
      this._notifyListeners();
    }
  }

  public get pid(): number | null {
    return this._pid;
  }

  public set pid(value: number | null) {
    this._pid = value;
  }

  public get port(): number | null {
    return this._port;
  }

  public set port(value: number | null) {
    this._port = value;
  }

  public get restartAttempts(): number {
    return this._restartAttempts;
  }

  public get maxRestartAttempts(): number {
    return this._maxRestartAttempts;
  }

  public get isManualStop(): boolean {
    return this._isManualStop;
  }

  // 重置重启计数
  public resetRestartAttempts(): void {
    this._restartAttempts = 0;
    this._lastRestartTime = 0;
  }

  // 增加重启计数
  public incrementRestartAttempts(): void {
    this._restartAttempts++;
    this._lastRestartTime = Date.now();
  }

  // 检查是否可以重启（冷却时间检查）
  public canRestart(): boolean {
    if (this._lastRestartTime === 0) return true;
    const elapsed = Date.now() - this._lastRestartTime;
    return elapsed >= this._restartCooldown;
  }

  // 获取距离下次可重启的剩余时间（毫秒）
  public getRestartCooldownRemaining(): number {
    if (this._lastRestartTime === 0) return 0;
    const elapsed = Date.now() - this._lastRestartTime;
    return Math.max(0, this._restartCooldown - elapsed);
  }

  // 标记手动停止
  public setManualStop(value: boolean): void {
    this._isManualStop = value;
  }

  // 检查是否可以启动
  public canStart(): boolean {
    // restarting 状态允许启动（重启流程中）
    // stopping 状态也允许启动（用户可能在停止过程中点击重启）
    return !['starting', 'running'].includes(this._status);
  }

  // 检查是否可以停止（允许在启动过程中停止）
  public canStop(): boolean {
    return this._status === Status.RUNNING || this._status === Status.STARTING;
  }

  // ========== 启动阶段管理 ==========

  // 设置启动阶段
  public setStartupStage(
    stage: StartupStageName,
    options?: { progress?: number; message?: string; error?: string }
  ): void {
    this._startupStage = {
      stage,
      progress: options?.progress,
      message: options?.message,
      error: options?.error,
      timestamp: Date.now()
    };
    this._notifyListeners();
  }

  // 获取启动阶段
  public getStartupStage(): StartupStageInfo {
    return this._startupStage;
  }

  // ========== 生命周期状态管理 ==========

  // 退出状态
  public get isQuitting(): boolean {
    return this._isQuitting;
  }

  public set isQuitting(value: boolean) {
    this._isQuitting = value;
  }

  // 加载完成状态
  public get isLoaded(): boolean {
    return this._isLoaded;
  }

  public set isLoaded(value: boolean) {
    if (this._isLoaded !== value) {
      this._isLoaded = value;
      this._notifyListeners();
    }
  }

  // IPC 就绪状态
  public get isIpcReady(): boolean {
    return this._isIpcReady;
  }

  public set isIpcReady(value: boolean) {
    if (this._isIpcReady !== value) {
      this._isIpcReady = value;
      this._notifyListeners();
    }
  }

  // 获取状态数据（用于UI同步）
  public getStateData(): StateData {
    return {
      status: this._status,
      pid: this._pid,
      port: this._port
    };
  }

  // 添加状态变更监听器
  public addListener(callback: StateListener): () => void {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  // 通知所有监听器
  private _notifyListeners(): void {
    const data = this.getStateData();
    this._listeners.forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error('[StateManager] 监听器执行错误:', err);
      }
    });
  }

  // 重置所有状态
  public reset(): void {
    this._status = Status.STOPPED;
    this._pid = null;
    this._port = null;
    this._restartAttempts = 0;
    this._isManualStop = false;
    this._startupStage = {
      stage: StartupStage.IDLE,
      timestamp: Date.now()
    };
    this._isQuitting = false;
    this._isLoaded = false;
    this._isIpcReady = false;
    this._notifyListeners();
  }
}

// 导出单例
export const stateManager = new StateManager();

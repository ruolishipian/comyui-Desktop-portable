# ComfyUI 便携桌面版优化方案

> 基于 [Comfy-Org/Desktop](https://github.com/Comfy-Org/Desktop) 官方项目分析

---

## 一、项目对比分析

### 1.1 架构对比

| 功能模块 | 当前项目 | 官方项目 | 差距评估 |
|---------|---------|---------|---------|
| 启动检测 | 日志关键词匹配 | HTTP 端点检测 (wait-on) | ✅ 已优化 |
| 超时机制 | 固定超时 (60秒) | 30分钟超时 + 1秒检查间隔 | ✅ 已优化 |
| 日志处理 | 基础日志 + 轮转 | ANSI清理 + 结构化日志 | ✅ 已优化 |
| 进程管理 | tree-kill + 自动重启 | 优雅退出 + before-quit 钩子 | ✅ 已优化 |
| 窗口管理 | 基础窗口 | 消息队列 + 状态恢复 | ✅ 已优化 |
| IPC 通信 | 基础 IPC | 类型安全的 strictIpcMain | ✅ 已优化 |
| 配置管理 | electron-store | electron-store + 环境变量 | ✅ 相似 |
| 健康检查 | 无 | 定期 HTTP 检查 | ✅ 已优化 |
| 错误处理 | 基础处理 | FatalError + AppError | ✅ 已优化 |

### 1.2 优化优先级

| 优先级 | 优化项 | 状态 | 收益 |
|-------|-------|------|------|
| P0 | 启动成功检测 (HTTP端点) | ✅ 已完成 | 高 |
| P0 | ANSI 码清理 | ✅ 已完成 | 中 |
| P1 | 超时机制优化 | ✅ 已完成 | 高 |
| P2 | 窗口消息队列 | ✅ 已完成 | 中 |
| P2 | IPC 类型安全 | ✅ 已完成 | 中 |
| P3 | 独立日志文件 | ✅ 已完成 | 低 |
| P3 | 健康检查机制 | ✅ 已完成 | 中 |
| P3 | 优雅退出处理 | ✅ 已完成 | 中 |
| P3 | 错误处理优化 | ✅ 已完成 | 中 |

---

## 二、已实施优化

### 2.1 启动成功检测机制优化

**问题分析：**
- 原方案使用日志关键词匹配检测启动成功
- ComfyUI 不同版本输出格式可能不同
- 日志输出可能被缓冲，导致检测延迟
- 存在误判风险

**优化方案：**
使用 `wait-on` 库检测 HTTP 端点可用性

```typescript
// 安装依赖
npm install wait-on @types/wait-on

// 实现代码
import waitOn from 'wait-on';

private _waitForServerReady(port: number): void {
  const options: waitOn.WaitOnOptions = {
    resources: [`http://localhost:${port}/queue`],
    timeout: 30 * 60 * 1000,  // 30分钟最大等待
    interval: 1000,           // 1秒检查一次
  };

  waitOn(options)
    .then(() => {
      stateManager.status = Status.RUNNING;
      logger.info(`ComfyUI启动成功，端口：${port}`);
    })
    .catch((error: Error) => {
      stateManager.status = Status.FAILED;
      logger.error(`服务器启动超时: ${error.message}`);
    });
}
```

**优化效果：**
- ✅ 更可靠的启动检测
- ✅ 支持长时间启动（首次安装依赖等）
- ✅ 避免日志格式变化导致的误判
- ✅ 检测实际服务可用性

### 2.2 ANSI 转义码清理

**问题分析：**
- Python/PyTorch 输出可能包含 ANSI 转义码
- 影响日志可读性和文件存储

**优化方案：**
在日志记录前清理 ANSI 转义码

```typescript
// ANSI 转义码正则表达式
const ANSI_CODES_REGEX = /[\u001B\u009B][#();?[]*(?:\d{1,4}(?:;\d{0,4})*)?[\d<=>A-ORZcf-nqry]/g;

// 清理方法
private _removeAnsiCodes(text: string): string {
  return text.replace(ANSI_CODES_REGEX, '');
}

// 在 log() 方法中应用
public log(content: string, level: LogLevel = 'info'): void {
  const cleanContent = this._removeAnsiCodes(content);
  // ... 其余逻辑
}
```

**优化效果：**
- ✅ 日志更清晰易读
- ✅ 减少日志文件体积
- ✅ 避免终端显示异常

### 2.3 超时机制优化

**问题分析：**
- 原超时时间 15 秒太短
- 加载多个自定义节点时不够用

**优化方案：**
- 将超时时间增加到 60 秒（配置文件）
- HTTP 端点检测使用 30 分钟最大等待

**优化效果：**
- ✅ 支持加载大量自定义节点
- ✅ 支持首次安装依赖场景
- ✅ 减少误判超时

### 2.4 窗口消息队列（P2）

**问题分析：**
- 窗口未准备好时发送的消息可能丢失
- 状态更新可能不及时

**优化方案：**
```typescript
export class WindowManager {
  private _messageQueue: Map<WindowType, QueuedMessage[]> = new Map();
  private _rendererReady: Map<WindowType, boolean> = new Map();

  public sendToWindow(windowType: WindowType, channel: string, data: unknown): void {
    const win = this._windows.get(windowType);
    const isReady = this._rendererReady.get(windowType);

    if (!win || win.isDestroyed()) return;

    if (!isReady) {
      // 窗口未准备好，加入队列
      if (!this._messageQueue.has(windowType)) {
        this._messageQueue.set(windowType, []);
      }
      this._messageQueue.get(windowType)!.push({ channel, data });
      return;
    }

    // 发送队列中的消息
    this._flushQueue(windowType);

    // 发送当前消息
    win.webContents.send(channel, data);
  }

  public setRendererReady(windowType: WindowType): void {
    this._rendererReady.set(windowType, true);
    this._flushQueue(windowType);
  }

  private _flushQueue(windowType: WindowType): void {
    const win = this._windows.get(windowType);
    const queue = this._messageQueue.get(windowType) || [];

    while (queue.length > 0 && win && !win.isDestroyed()) {
      const msg = queue.shift()!;
      win.webContents.send(msg.channel, msg.data);
    }
  }
}
```

**优化效果：**
- ✅ 避免消息丢失
- ✅ 确保状态同步
- ✅ 提升用户体验

### 2.5 IPC 类型安全（P2）

**问题分析：**
- IPC 通信缺乏类型检查
- 可能出现参数类型错误

**优化方案：**
```typescript
// src/modules/ipc-types.ts
export interface IpcChannels {
  'get-config': { params: []; return: AppConfig };
  'update-config': { params: [key: string, value: unknown]; return: AppConfig };
  'start-comfyui': { params: []; return: void };
  'stop-comfyui': { params: []; return: void };
  'restart-comfyui': { params: []; return: void };
  'status-update': { params: [data: StateData]; return: void };
  'log-update': { params: [content: string]; return: void };
  'renderer-ready': { params: []; return: void };
}

// 类型安全的 handle 包装函数
export function typedHandle<K extends keyof IpcChannels>(
  channel: K,
  handler: (
    event: IpcMainInvokeEvent,
    ...args: IpcChannels[K]['params']
  ) => IpcChannels[K]['return'] | Promise<IpcChannels[K]['return']>
): void {
  ipcMain.handle(channel, handler as (...args: unknown[]) => unknown);
}
```

**优化效果：**
- ✅ 编译时类型检查
- ✅ 减少运行时错误
- ✅ 更好的 IDE 支持

### 2.6 独立日志文件（P3）

**问题分析：**
- ComfyUI 输出与应用日志混合
- 难以单独分析 ComfyUI 输出

**优化方案：**
```typescript
// 在 logger.ts 中添加
private _comfyUILogFile: string = '';
private _comfyUIWriteQueue: string[] = [];
private _isComfyUIWriting: boolean = false;

public init(): void {
  this._initialized = true;
  this._comfyUILogFile = path.join(configManager.logsDir, 'comfyui-output.log');
}

public logComfyUIOutput(data: string): void {
  if (!this._initialized || !this._comfyUILogFile) return;

  const cleanData = this._removeAnsiCodes(data);
  const timestamp = new Date().toLocaleTimeString();
  const line = `[${timestamp}] ${cleanData}\n`;

  this._comfyUIWriteQueue.push(line);
  if (!this._isComfyUIWriting) {
    void this._processComfyUIWriteQueue();
  }
}
```

**优化效果：**
- ✅ 日志分类清晰
- ✅ 便于问题排查
- ✅ 支持日志分析工具

### 2.7 健康检查机制

**问题分析：**
- 服务运行时可能意外崩溃
- 无法及时发现服务异常

**优化方案：**
```typescript
// 启动健康检查
private _startHealthCheck(port: number): void {
  this._stopHealthCheck();

  this._healthCheckTimer = setInterval(async () => {
    if (stateManager.status !== Status.RUNNING) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:${port}/system_stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        logger.warn(`ComfyUI 服务异常，HTTP 状态码: ${response.status}`);
      }
    } catch (err) {
      const error = err as Error;
      if (error.name !== 'AbortError') {
        logger.error(`ComfyUI 服务无响应: ${error.message}`);
        stateManager.status = Status.FAILED;
        this._notifyStatusChange();
        this._stopHealthCheck();
      }
    }
  }, 30000); // 30秒检查一次
}
```

**优化效果：**
- ✅ 及时发现服务异常
- ✅ 自动更新状态
- ✅ 提升系统可靠性

### 2.8 优雅退出处理

**问题分析：**
- 直接退出可能导致数据丢失
- 进程未正确清理

**优化方案：**
```typescript
app.on('before-quit', async event => {
  if (global.isQuiting) return;

  if (stateManager.status === 'running' || stateManager.status === 'starting') {
    event.preventDefault();
    global.isQuiting = true;

    logger.info('正在关闭 ComfyUI...');
    processManager.stop();

    // 等待进程退出（最多等待 10 秒）
    const maxWait = 10000;
    const startTime = Date.now();

    await new Promise<void>(resolve => {
      const checkInterval = setInterval(() => {
        const status = stateManager.status;
        const elapsed = Date.now() - startTime;

        if (status === 'stopped' || status === 'failed' || elapsed >= maxWait) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    app.quit();
  } else {
    global.isQuiting = true;
    logger.info('ComfyUI便携桌面版开始退出');
  }
});
```

**优化效果：**
- ✅ 确保进程正确停止
- ✅ 避免数据丢失
- ✅ 提升用户体验

### 2.9 错误处理优化

**问题分析：**
- 错误处理分散
- 缺乏统一的错误分类

**优化方案：**
```typescript
// src/modules/errors.ts
export class FatalError extends Error {
  public static handle(options: FatalErrorOptions): never {
    const { message, error, title, exitCode } = options;

    if (error instanceof Error) {
      logger.error(`${message}: ${error.message}`);
    } else {
      logger.error(message);
    }

    if (title && message) {
      dialog.showErrorBox(title, message);
    }

    app.exit(exitCode ?? 1);
    throw error ?? new Error(message);
  }
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly isFatal: boolean;

  constructor(type: ErrorType, message: string, isFatal: boolean = false) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.isFatal = isFatal;
  }

  public static config(message: string, isFatal: boolean = false): AppError {
    return new AppError(ErrorType.CONFIG, message, isFatal);
  }
}

// 使用示例
process.on('uncaughtException', (err: Error) => {
  handleError(err);
  dialog.showErrorBox('严重错误', `应用发生未捕获异常：${err.message}\n请重启应用`);
});

process.on('unhandledRejection', (reason: unknown) => {
  handleError(reason);
});
```

**优化效果：**
- ✅ 统一错误处理
- ✅ 错误分类清晰
- ✅ 便于问题排查

---

## 三、测试建议

### 3.1 启动检测测试
- 测试正常启动场景
- 测试首次安装依赖场景
- 测试端口被占用场景
- 测试启动失败场景

### 3.2 日志测试
- 测试 ANSI 码清理效果
- 测试日志轮转功能
- 测试日志文件大小限制
- 测试独立日志文件功能

### 3.3 进程管理测试
- 测试正常停止
- 测试强制停止
- 测试自动重启
- 测试异常退出处理

### 3.4 窗口消息队列测试
- 测试窗口未就绪时的消息缓存
- 测试渲染进程就绪后的消息刷新
- 测试多窗口消息隔离

### 3.5 健康检查测试
- 测试服务正常运行时的健康检查
- 测试服务异常时的状态更新
- 测试健康检查超时处理

---

## 四、总结

本次优化主要参考 ComfyUI 官方桌面项目的最佳实践，全面提升了应用的稳定性和可靠性。已实施的优化包括：

1. ✅ **HTTP 端点检测** - 使用 wait-on 库检测服务可用性
2. ✅ **ANSI 码清理** - 提升日志可读性
3. ✅ **超时机制优化** - 支持长时间启动场景
4. ✅ **窗口消息队列** - 避免消息丢失，确保状态同步
5. ✅ **IPC 类型安全** - 编译时类型检查，减少运行时错误
6. ✅ **独立日志文件** - 日志分类清晰，便于问题排查
7. ✅ **健康检查机制** - 及时发现服务异常
8. ✅ **优雅退出处理** - 确保进程正确停止
9. ✅ **错误处理优化** - 统一错误处理，便于问题排查

---

*文档更新时间: 2026-03-06*
*参考项目: https://github.com/Comfy-Org/Desktop*

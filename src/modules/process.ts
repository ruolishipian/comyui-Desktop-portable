/**
 * 进程管理模块
 * 集中管理 ComfyUI 进程的启动、停止、重启
 */

import { spawn, ChildProcess } from 'child_process';
import fsSync from 'fs';
import path from 'path';

import { dialog } from 'electron';
import kill from 'tree-kill';
import waitOn from 'wait-on';

import { StateData, LogLevel } from '../types';

import { configManager } from './config';
import { environmentChecker } from './environment';
import { LineBuffer } from './line-buffer';
import { parseLogLine } from './log-parser';
import { logger } from './logger';
import { proxyManager } from './proxy';
import { stateManager, Status } from './state';

// 状态变更回调类型
export type StatusChangeCallback = (data: StateData) => void;

// 进程管理器
export class ProcessManager {
  private _process: ChildProcess | null = null;
  private _timeoutTimer: NodeJS.Timeout | null = null;
  private _onStatusChange: StatusChangeCallback | null = null;
  private _waitOnAbortController: AbortController | null = null;

  // 健康检查
  private _healthCheckTimer: NodeJS.Timeout | null = null;
  private readonly _healthCheckInterval: number = 30000; // 30秒检查一次（从15秒优化）
  private readonly _healthCheckTimeout: number = 15000; // 15秒超时（插件加载时响应慢）
  private _consecutiveFailures: number = 0;
  private readonly _maxConsecutiveFailures: number = 5; // 连续失败5次才标记为失败（从3次优化）
  private _healthCheckStartTime: number = 0; // 健康检查开始时间
  private readonly _healthCheckGracePeriod: number = 180000; // 启动后180秒内的宽容期（插件多时启动慢）

  // 启动检测配置
  public static readonly MAX_FAIL_WAIT = 30 * 60 * 1000; // 30分钟最大等待时间
  public static readonly CHECK_INTERVAL = 1000; // 1秒检查一次

  // 设置状态变更回调
  public setOnStatusChange(callback: StatusChangeCallback): void {
    this._onStatusChange = callback;
  }

  // 检测前端路径（适配便携包）
  private _detectWebRootPath(comfyuiPath: string): string {
    // 优先级1: ComfyUI/web (默认前端)
    const webPath = path.join(comfyuiPath, 'web');
    if (fsSync.existsSync(path.join(webPath, 'index.html'))) {
      logger.info(`使用默认前端: ${webPath}`);
      return webPath;
    }

    // 优先级2: Python包中的前端
    const pythonPath = configManager.get('pythonPath');
    if (pythonPath !== undefined && pythonPath !== '') {
      const packagePath = path.join(
        path.dirname(pythonPath),
        'Lib',
        'site-packages',
        'comfyui_frontend_package',
        'static'
      );
      if (fsSync.existsSync(path.join(packagePath, 'index.html'))) {
        logger.info(`使用Python包前端: ${packagePath}`);
        return packagePath;
      }
    }

    // 未找到前端文件，抛出错误
    throw new Error(
      '未找到 ComfyUI 前端文件！\n' +
        '请检查以下目录是否存在 index.html:\n' +
        `1. ${webPath}\n` +
        'ComfyUI 便携包可能不完整，请重新下载或检查安装。'
    );
  }

  // 部署 sitecustomize.py 到 Python 的 site-packages 目录
  // 此文件修复 Windows 上 subprocess 的 UnicodeDecodeError 问题
  private _deploySitecustomize(sitePackagesDir: string): void {
    if (process.platform !== 'win32') return;

    try {
      if (!fsSync.existsSync(sitePackagesDir)) {
        fsSync.mkdirSync(sitePackagesDir, { recursive: true });
      }

      const targetPath = path.join(sitePackagesDir, 'sitecustomize.py');
      const sourcePath = path.join(__dirname, '..', '..', 'scripts', 'sitecustomize.py');

      // 如果源文件存在且目标不存在或内容不同，则复制
      if (fsSync.existsSync(sourcePath)) {
        let needCopy = true;
        if (fsSync.existsSync(targetPath)) {
          const sourceContent = fsSync.readFileSync(sourcePath, 'utf8');
          const targetContent = fsSync.readFileSync(targetPath, 'utf8');
          needCopy = sourceContent !== targetContent;
        }

        if (needCopy) {
          fsSync.copyFileSync(sourcePath, targetPath);
          logger.info(`已部署 sitecustomize.py 到 ${targetPath}`);
        }
      } else {
        // 源文件不存在时，直接在目标位置创建
        if (!fsSync.existsSync(targetPath)) {
          const content = `"""
sitecustomize.py - 修复 Windows 上 subprocess UnicodeDecodeError
当 PYTHONUTF8=1 时，subprocess text=True 模式使用 UTF-8 解码，
但 Windows 原生程序输出使用 GBK/cp936，导致解码失败。
此模块 monkey-patch subprocess.Popen，自动添加 errors='replace'。
"""
import subprocess
import sys
if sys.platform == 'win32' and sys.flags.utf8_mode:
    _original_popen_init = subprocess.Popen.__init__
    def _patched_popen_init(self, args, **kwargs):
        if kwargs.get('text', False) or kwargs.get('universal_newlines', False) or 'encoding' in kwargs:
            if 'errors' not in kwargs:
                kwargs['errors'] = 'replace'
        _original_popen_init(self, args, **kwargs)
    subprocess.Popen.__init__ = _patched_popen_init
`;
          fsSync.writeFileSync(targetPath, content, 'utf8');
          logger.info(`已创建 sitecustomize.py 到 ${targetPath}`);
        }
      }
    } catch (err) {
      const error = err as Error | null;
      const errorMessage = error?.message ?? '未知错误';
      logger.warn(`部署 sitecustomize.py 失败: ${errorMessage}`);
    }
  }

  // 修复 gitpython 的 str/bytes endswith TypeError (Python 3.13+)
  // git/cmd.py 中 stdout_value.endswith(newline) 在 str/bytes 类型不匹配时会崩溃
  // 由于 git/cmd.py 的顶层 import 会触发 git/__init__.py 的 refresh()，
  // 运行时 monkey-patch 无法在 refresh() 之前生效，必须直接修改源码
  private _patchGitpython(sitePackagesDir: string): void {
    try {
      const cmdPyPath = path.join(sitePackagesDir, 'git', 'cmd.py');
      if (!fsSync.existsSync(cmdPyPath)) return;

      let content = fsSync.readFileSync(cmdPyPath, 'utf8');

      // 检查是否已经修复过
      if (content.includes('_gitpython_compat_patched')) return;

      // 修复 endswith 类型不匹配：在 endswith 调用前加 isinstance 类型检查
      // 原始代码：if stdout_value.endswith(newline) and strip_newline_in_stdout:
      // 修复后：if isinstance(stdout_value, type(newline)) and stdout_value.endswith(newline) and strip_newline_in_stdout:
      const patterns = [
        // 第一处：stdout_value.endswith(newline) and strip_newline_in_stdout
        {
          old: 'if stdout_value.endswith(newline) and strip_newline_in_stdout:  # type: ignore[arg-type]',
          new: 'if isinstance(stdout_value, type(newline)) and stdout_value.endswith(newline) and strip_newline_in_stdout:'
        },
        // 第二处：stderr_value.endswith(newline)（在 output_stream is None 分支）
        {
          old: '                if stderr_value.endswith(newline):  # type: ignore[arg-type]\n                    stderr_value = stderr_value[:-1]\n\n                status = proc.returncode',
          new: '                if isinstance(stderr_value, type(newline)) and stderr_value.endswith(newline):\n                    stderr_value = stderr_value[:-1]\n\n                status = proc.returncode'
        },
        // 第三处：stderr_value.endswith(newline)（在 output_stream 分支）
        {
          old: '                if stderr_value.endswith(newline):  # type: ignore[arg-type]\n                    stderr_value = stderr_value[:-1]\n                status = proc.wait()',
          new: '                if isinstance(stderr_value, type(newline)) and stderr_value.endswith(newline):\n                    stderr_value = stderr_value[:-1]\n                status = proc.wait()'
        }
      ];

      let patched = false;
      for (const { old, new: newStr } of patterns) {
        if (content.includes(old)) {
          content = content.replace(old, newStr);
          patched = true;
        }
      }

      if (patched) {
        // 添加标记，避免重复 patch
        content += '\n_gitpython_compat_patched = True\n';
        fsSync.writeFileSync(cmdPyPath, content, 'utf8');
        logger.info(`已修复 gitpython endswith 兼容性问题: ${cmdPyPath}`);
      }
    } catch (err) {
      const error = err as Error | null;
      const errorMessage = error?.message ?? '未知错误';
      logger.warn(`修复 gitpython 兼容性失败: ${errorMessage}`);
    }
  }

  // 确保必要目录存在
  private _ensureDirectories(comfyuiPath: string): void {
    const directories = [
      path.join(comfyuiPath, 'user'),
      path.join(comfyuiPath, 'input'),
      path.join(comfyuiPath, 'output'),
      path.join(comfyuiPath, 'models'),
      path.join(comfyuiPath, 'custom_nodes')
    ];

    directories.forEach(dir => {
      if (!fsSync.existsSync(dir)) {
        fsSync.mkdirSync(dir, { recursive: true });
        logger.info(`创建目录: ${dir}`);
      }
    });
  }

  // 创建默认的模型路径配置
  private _ensureModelPathsConfig(comfyuiPath: string): string {
    const configPath = path.join(comfyuiPath, 'extra_model_paths.yaml');

    if (!fsSync.existsSync(configPath)) {
      const defaultConfig = `# ComfyUI Extra Model Paths (便携包配置)
comfyui_portable:
  base_path: ${comfyuiPath}
  checkpoints: models/checkpoints/
  loras: models/loras/
  vae: models/vae/
  embeddings: models/embeddings/
  upscale_models: models/upscale_models/
  custom_nodes: custom_nodes/
`;
      fsSync.writeFileSync(configPath, defaultConfig, 'utf8');
      logger.info(`创建默认模型路径配置: ${configPath}`);
    }

    return configPath;
  }

  // 构建启动参数
  private async _buildArguments(): Promise<{ args: string[]; port: number }> {
    const comfyuiPath = configManager.get('comfyuiPath');
    if (comfyuiPath === undefined || comfyuiPath === '') {
      throw new Error('ComfyUI 路径未配置');
    }

    const serverConfig = configManager.server;
    const argNames = serverConfig.argNames ?? {};

    // 调试：输出配置信息
    logger.info(`[调试] serverConfig.customArgs: "${serverConfig.customArgs}"`);
    logger.info(`[调试] serverConfig.argNames: ${JSON.stringify(argNames)}`);

    // 确保必要目录存在
    this._ensureDirectories(comfyuiPath);

    // 查找可用端口
    let port = serverConfig.port ?? 8188;
    const availablePort = await environmentChecker.findAvailablePort(port);

    if (availablePort !== null) {
      port = availablePort;
      // 使用 any 绕过嵌套路径类型检查
      configManager.set('server.port', port);
      logger.info(`使用可用端口：${port}`);
    } else {
      throw new Error('未找到可用端口（8188-8200）');
    }

    // 构建核心参数（参考官方ComfyUI Desktop实现）
    const userDirectory = path.join(comfyuiPath, 'user');
    const inputDirectory = path.join(comfyuiPath, 'input');
    // 使用用户配置的输出目录,或默认目录
    const outputDirectory = serverConfig.outputDir ?? path.join(comfyuiPath, 'output');

    // 数据库路径配置（便携包适配）
    const dbPath = path.join(userDirectory, 'comfyui.db');
    const dbUrl = process.platform === 'win32' ? `sqlite:///${dbPath.replace(/\\/g, '/')}` : `sqlite://${dbPath}`;

    // 检测前端路径
    const webRootPath = this._detectWebRootPath(comfyuiPath);

    // 模型路径配置
    const modelConfigPath = this._ensureModelPathsConfig(comfyuiPath);

    // 检测 ComfyUI-Manager 是否存在
    const managerPath = path.join(comfyuiPath, 'custom_nodes', 'ComfyUI-Manager');
    const hasManager = fsSync.existsSync(managerPath);
    if (hasManager) {
      logger.info('检测到 ComfyUI-Manager 已安装');
    } else {
      logger.info('未检测到 ComfyUI-Manager');
    }

    // 检查自定义参数中是否包含 --base-directory
    const customArgsString = serverConfig.customArgs ?? '';
    const hasCustomBaseDir = customArgsString.includes('--base-directory');

    // 决定使用哪个 base-directory
    let baseDirectory = comfyuiPath; // 默认值
    if (hasCustomBaseDir) {
      // 用户在自定义参数中指定了 --base-directory,使用自定义参数中的值
      logger.info('[调试] 检测到自定义参数中包含 --base-directory,将使用自定义参数中的值');
      // 不添加 --base-directory 参数,让自定义参数处理
      baseDirectory = ''; // 标记为不添加
    } else if (serverConfig.modelDir) {
      // 用户在启动器设置中指定了模型目录
      logger.info(`[调试] 使用启动器设置的模型目录: ${serverConfig.modelDir}`);
      baseDirectory = serverConfig.modelDir;
    } else {
      // 使用默认目录
      logger.info('[调试] 使用默认模型目录');
      baseDirectory = comfyuiPath;
    }

    const args: string[] = [
      path.join(comfyuiPath, 'main.py'),
      '--user-directory',
      userDirectory,
      '--input-directory',
      inputDirectory
    ];

    // 只有在 outputDirectory 不为空时才添加 --output-directory 参数
    if (outputDirectory && outputDirectory.trim() !== '') {
      args.push('--output-directory', outputDirectory);
    }

    args.push('--front-end-root', webRootPath);

    // 只有在需要时才添加 --base-directory
    if (baseDirectory) {
      args.push('--base-directory', baseDirectory);
    }

    // 继续添加其他参数
    args.push(
      '--database-url',
      dbUrl,
      '--extra-model-paths-config',
      modelConfigPath,
      '--log-stdout',
      '--listen',
      serverConfig.listenAll === true ? '0.0.0.0' : '127.0.0.1',
      '--port',
      String(port),
      '--disable-auto-launch'
    );

    // 只有检测到 ComfyUI-Manager 时才添加 --enable-manager 参数
    if (hasManager) {
      args.push('--enable-manager');
    }

    // 可视化开关参数（使用配置中的参数名称，如果未配置则使用默认值）
    if (serverConfig.cpuMode === true) args.push('--cpu');
    if (serverConfig.disableCUDA === true) args.push(argNames.disableCudaMalloc ?? '--disable-cuda-malloc');
    if (serverConfig.disableIPEX === true) args.push(argNames.disableIpexOptimize ?? '--disable-ipex-optimize');

    // 自定义参数（白名单过滤）- 来自设置界面
    if (serverConfig.customArgs !== undefined && serverConfig.customArgs !== '') {
      logger.info(`[调试] 处理自定义参数: "${serverConfig.customArgs}"`);
      const validPrefixes = ['--', '-'];

      // 改进的参数解析：正确处理带值的参数
      // 例如: "--extra-model-paths-config D:\path\to\file" 应该保留两个部分
      const parts = serverConfig.customArgs.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
      const customArgs: string[] = [];

      for (let i = 0; i < parts.length; i++) {
        const part = (parts[i] ?? '').trim();
        if (!part) continue;

        // 如果是选项参数（以 -- 或 - 开头）
        if (validPrefixes.some(prefix => part.startsWith(prefix))) {
          customArgs.push(part);
        } else if (customArgs.length > 0) {
          // 前一个参数是选项，当前是它的值，保留
          customArgs.push(part);
        }
        // 否则忽略（独立的非选项参数）
      }

      logger.info(`[调试] 过滤后的自定义参数: ${JSON.stringify(customArgs)}`);
      if (customArgs.length > 0) args.push(...customArgs);
    }

    return { args, port };
  }

  // 启动进程
  public async start(): Promise<void> {
    // 状态检查
    if (!stateManager.canStart()) {
      logger.warn(`当前状态 ${stateManager.status} 不允许启动`);
      return;
    }

    // 检查是否已有进程在运行
    if (this._process && !this._process.killed) {
      logger.warn('ComfyUI 进程已在运行，先停止旧进程');
      this.stop();
      // 等待进程完全停止
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // 检查并清理端口占用（在环境检查之前）
    const serverConfig = configManager.server;
    const targetPort = serverConfig.port ?? 8188;
    logger.info(`检查端口 ${targetPort} 是否可用...`);
    const cleanResult = await environmentChecker.checkAndCleanPort(targetPort);
    if (cleanResult.cleaned) {
      logger.info(`已清理占用端口 ${targetPort} 的进程: PID ${cleanResult.pids.join(', ')}`);
    } else if (cleanResult.error) {
      logger.warn(`端口 ${targetPort} 清理失败: ${cleanResult.error}，将尝试使用其他端口`);
    }

    // 清理数据库锁文件（防止重启时数据库锁定问题）
    const comfyuiPath = configManager.get('comfyuiPath');
    if (comfyuiPath) {
      this._cleanDatabaseLockFiles(comfyuiPath);
    }

    // 环境检查
    logger.info('开始环境自检');
    const checks = await environmentChecker.runAllChecks();

    // 处理检查结果
    for (const check of checks) {
      const logLevel: LogLevel = check.type === 'error' ? 'error' : check.type === 'warn' ? 'warn' : 'info';
      logger.log(check.msg, logLevel);
      if (check.type === 'error') {
        dialog.showErrorBox('环境检查失败', check.msg);
      } else if (check.type === 'warn') {
        dialog
          .showMessageBox({
            type: 'warning',
            title: '环境检查警告',
            message: check.msg
          })
          .catch((err: unknown) => {
            const error = err as Error | null;
            const errorMessage = error?.message ?? '未知错误';
            logger.error(`显示警告对话框失败：${errorMessage}`);
          });
      }
    }

    // 有错误则停止
    if (environmentChecker.hasErrors()) {
      stateManager.status = Status.FAILED;
      return;
    }

    // 更新状态
    stateManager.status = Status.STARTING;
    stateManager.setManualStop(false);
    this._notifyStatusChange();

    logger.info('开始启动ComfyUI');

    try {
      const { args, port } = await this._buildArguments();
      const pythonPath = configManager.get('pythonPath');
      const envArgs = configManager.get('envArgs') ?? '';
      const envVars = configManager.get('envVars') ?? '';

      // 验证路径
      if (pythonPath === undefined || pythonPath === '' || comfyuiPath === undefined || comfyuiPath === '') {
        throw new Error('Python 路径或 ComfyUI 路径未配置');
      }

      // 注意：不再使用配置的超时时间，因为 HTTP 端点检测 (wait-on) 已经有 30 分钟超时
      // 配置的超时时间仅用于日志记录，不影响实际行为
      const configTimeout = serverConfig.timeout;
      if (configTimeout !== undefined && configTimeout > 0) {
        logger.info(`配置的超时时间: ${configTimeout}ms (HTTP端点检测将使用 ${ProcessManager.MAX_FAIL_WAIT}ms)`);
      }

      // 构建完整的启动命令（Python 参数 + main.py + ComfyUI 参数）
      const fullArgs: string[] = [];

      // 添加 Python 环境参数（来自环境配置界面）
      if (envArgs !== '') {
        const pythonEnvArgs = envArgs.split(' ').filter(arg => arg.trim());
        fullArgs.push(...pythonEnvArgs);
      }

      // 添加 ComfyUI 启动参数
      fullArgs.push(...args);

      // 解析环境变量（每行一个，格式：变量名=值）
      const customEnv: Record<string, string> = {};
      if (envVars !== '') {
        const lines = envVars.split('\n');
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine && !trimmedLine.startsWith('#')) {
            const equalIndex = trimmedLine.indexOf('=');
            if (equalIndex > 0) {
              const key = trimmedLine.substring(0, equalIndex).trim();
              const value = trimmedLine.substring(equalIndex + 1).trim();
              if (key) {
                customEnv[key] = value;
                logger.info(`设置环境变量: ${key}=${value}`);
              }
            }
          }
        }
      }

      // 构建 sitecustomize.py 的路径（修复 Windows 上 subprocess UnicodeDecodeError）
      // sitecustomize.py 会在 Python 启动时自动加载，monkey-patch subprocess 模块
      // 使 text=True 模式下解码子进程输出时使用 errors='replace' 而非抛出异常
      const sitecustomizeDir = path.join(path.dirname(pythonPath), 'Lib', 'site-packages');

      // 构建完整的环境变量对象
      const processEnv: Record<string, string> = {
        ...process.env,
        ...customEnv, // 应用自定义环境变量
        COMFYUI_BASE_PATH: comfyuiPath,
        PYTHONPATH: `${comfyuiPath}${path.delimiter}${process.env['PYTHONPATH'] ?? ''}`,
        // 强制 Python 使用 UTF-8 模式（解决 Windows 上的编码问题）
        // PYTHONUTF8=1 启用 Python UTF-8 模式
        // PYTHONIOENCODING=utf-8 强制标准流使用 UTF-8
        // PYTHONLEGACYWINDOWSSTDIO=0 禁止 Python 在 Windows 上使用遗留的本地编码标准流
        PYTHONUTF8: '1',
        PYTHONIOENCODING: 'utf-8',
        PYTHONLEGACYWINDOWSSTDIO: '0'
      };

      // 应用代理设置到环境变量
      const envWithProxy = proxyManager.applyProxyToEnv(processEnv);

      // 部署 sitecustomize.py 到 Python 的 site-packages 目录
      // 此文件会在 Python 启动时自动加载，修复 subprocess 的 UnicodeDecodeError
      this._deploySitecustomize(sitecustomizeDir);

      // 修复 gitpython 的 str/bytes endswith TypeError (Python 3.13+)
      this._patchGitpython(sitecustomizeDir);

      // 启动进程
      this._process = spawn(pythonPath, fullArgs, {
        cwd: comfyuiPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: envWithProxy
      });

      // 更新状态
      stateManager.pid = this._process.pid ?? null;
      stateManager.port = port;

      logger.info(`启动命令：${pythonPath} ${fullArgs.join(' ')}`);
      logger.info(`ComfyUI PID：${this._process.pid}`);

      // 绑定事件
      this._bindProcessEvents(port);

      // 使用 HTTP 端点检测启动成功（更可靠）
      this._waitForServerReady(port);
    } catch (err) {
      const error = err as Error | null;
      this._clearTimeout();
      this._cancelWaitOn();
      stateManager.status = Status.FAILED;
      this._notifyStatusChange();
      const errorMessage = error?.message ?? '未知错误';
      logger.error(`启动异常：${errorMessage}`);
      dialog.showErrorBox('启动失败', errorMessage);
    }
  }

  // 等待服务器就绪（HTTP 端点检测 - 改进的渐进式检测）
  private _waitForServerReady(port: number): void {
    this._waitOnAbortController = new AbortController();

    // 使用用户配置的超时时间，最少300秒（适应大量插件加载场景）
    const serverConfig = configManager.server;
    const configTimeout = serverConfig.timeout ?? 300000;
    const maxWaitTime = Math.max(configTimeout, 300000);

    // 获取监听地址
    const listenAddress = serverConfig.listenAll === true ? '0.0.0.0' : '127.0.0.1';
    const host = serverConfig.listenAll === true ? 'localhost' : '127.0.0.1';

    logger.info(`启动超时设置: ${maxWaitTime}ms (配置: ${configTimeout}ms)`);
    logger.info(`监听地址: ${listenAddress}:${port}`);

    // 渐进式检测：先快速检测基础端口，再检测完整端点
    // 第一阶段：快速检测端口（30秒内）
    const quickCheckTimeout = 30000;
    const quickOptions: waitOn.WaitOnOptions = {
      resources: [`http://${host}:${port}/`],
      timeout: quickCheckTimeout,
      interval: 2000, // 2秒检查一次
      window: 500
    };

    waitOn(quickOptions)
      .then(() => {
        // 快速检测成功，继续完整检测
        logger.info('基础端口检测成功，继续完整端点检测...');
        this._waitForFullEndpoints(port, host, maxWaitTime - quickCheckTimeout);
      })
      .catch(() => {
        // 快速检测超时，但进程可能还在初始化（插件加载）
        // 继续等待更长时间
        logger.warn('基础端口检测超时，可能插件加载中，继续等待...');
        this._waitForFullEndpoints(port, host, maxWaitTime - quickCheckTimeout);
      });
  }

  // 等待完整端点可用（渐进式检测第二阶段）
  private _waitForFullEndpoints(port: number, host: string, remainingTimeout: number): void {
    // 使用多个端点检测，提高可靠性
    const options: waitOn.WaitOnOptions = {
      resources: [`http://${host}:${port}/queue`, `http://${host}:${port}/system_stats`],
      timeout: remainingTimeout,
      interval: ProcessManager.CHECK_INTERVAL,
      window: 2000, // 窗口时间，确保服务稳定
      simultaneous: 1 // 只要一个端点可用即可
    };

    waitOn(options)
      .then(() => {
        // 检查是否已被取消
        if (this._waitOnAbortController?.signal.aborted === true) {
          return;
        }
        this._clearTimeout();
        stateManager.status = Status.RUNNING;
        stateManager.resetRestartAttempts();
        this._notifyStatusChange();
        logger.info(`ComfyUI启动成功，端口：${port}`);
        // 启动健康检查
        this._startHealthCheck(port);
      })
      .catch((error: Error | null) => {
        // 检查是否已被取消
        if (this._waitOnAbortController?.signal.aborted === true) {
          return;
        }
        this._clearTimeout();

        // 改进：先检查进程是否还在运行
        const isProcessAlive = this._process !== null && !this._process.killed && this._process.pid !== undefined;
        if (isProcessAlive) {
          // 进程还活着，可能是插件加载慢或某些端点未响应
          // 给予宽容处理：标记为运行中，但发出警告
          logger.warn(`HTTP端点检测超时，但进程仍在运行(PID: ${this._process?.pid})`);
          logger.warn('可能原因: 插件加载慢、某些自定义节点有问题、或端点响应慢');
          logger.warn('启动器将标记为运行状态，请查看ComfyUI日志确认是否正常');

          // 尝试一次基础端口检测
          fetch(`http://${host}:${port}/`, { method: 'GET', signal: AbortSignal.timeout(5000) })
            .then(response => {
              if (response.ok) {
                // 基础端口可访问，说明服务已启动
                stateManager.status = Status.RUNNING;
                stateManager.resetRestartAttempts();
                this._notifyStatusChange();
                logger.info('ComfyUI基础端口可访问，标记为运行状态');
                this._startHealthCheck(port);
              } else {
                this._handleStartupFailure(port, error);
              }
            })
            .catch(() => {
              // 基础端口也不可访问，但进程还活着
              // 可能是启动很慢，给予最后一次机会
              logger.warn('基础端口暂时不可访问，但进程存活，将标记为运行并启动健康检查');
              stateManager.status = Status.RUNNING;
              stateManager.resetRestartAttempts();
              this._notifyStatusChange();
              this._startHealthCheck(port);
            });
        } else {
          // 进程已退出，这是真正的失败
          this._handleStartupFailure(port, error);
        }
      });
  }

  // 处理启动失败
  private _handleStartupFailure(_port: number, error: Error | null): void {
    // 先设置状态为失败，防止 _handleExit 再次尝试重启
    stateManager.status = Status.FAILED;
    this._notifyStatusChange();

    // 安全访问 error.message，防止 null 错误
    const errorMessage = error?.message ?? '未知错误（可能是启动被取消）';
    logger.error(`服务器启动失败: ${errorMessage}`);

    // 启动失败时杀死进程
    if (this._process !== null && !this._process.killed && this._process.pid !== undefined) {
      logger.info('启动失败，正在杀死进程...');
      kill(this._process.pid, 'SIGKILL', killErr => {
        if (killErr) {
          logger.error(`杀死进程失败: ${killErr.message}`);
        } else {
          logger.info('进程已杀死');
        }
      });
      this._process = null;
    }

    // 显示错误对话框
    dialog.showErrorBox('启动失败', `ComfyUI 启动失败: ${errorMessage}\n请检查日志或重试`);

    // 检查是否应该尝试自动重启
    const autoRestart = configManager.server.autoRestart ?? false;
    if (autoRestart && stateManager.restartAttempts < stateManager.maxRestartAttempts) {
      logger.info(
        `启动失败，将在3秒后尝试自动重启（${stateManager.restartAttempts + 1}/${stateManager.maxRestartAttempts}）`
      );
      stateManager.incrementRestartAttempts();
      setTimeout(() => {
        void this.start();
      }, 3000);
    } else if (stateManager.restartAttempts >= stateManager.maxRestartAttempts) {
      logger.error('已达到最大重启次数，停止自动重启');
      dialog.showErrorBox('启动失败', 'ComfyUI 启动失败且已达到最大重启次数，请检查日志或手动重启');
    } else if (!autoRestart) {
      stateManager.resetRestartAttempts();
    }
  }

  // 启动健康检查
  private _startHealthCheck(port: number): void {
    this._stopHealthCheck();
    this._consecutiveFailures = 0;
    this._healthCheckStartTime = Date.now(); // 记录开始时间

    // 获取监听地址
    const serverConfig = configManager.server;
    const host = serverConfig.listenAll === true ? 'localhost' : '127.0.0.1';

    this._healthCheckTimer = setInterval(() => {
      void this._doHealthCheck(port, host);
    }, this._healthCheckInterval);

    logger.info('健康检查已启动');
    logger.info(`宽容期: 启动后 ${this._healthCheckGracePeriod / 1000} 秒内的超时将被忽略`);
  }

  // 执行健康检查
  private async _doHealthCheck(port: number, host: string): Promise<void> {
    if (stateManager.status !== Status.RUNNING) {
      return;
    }

    // 检查是否在宽容期内
    const elapsed = Date.now() - this._healthCheckStartTime;
    const inGracePeriod = elapsed < this._healthCheckGracePeriod;

    try {
      const response = await fetch(`http://${host}:${port}/system_stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(this._healthCheckTimeout)
      });

      if (!response.ok) {
        logger.warn(`ComfyUI 服务异常，HTTP 状态码: ${response.status}`);
        this._consecutiveFailures++;
      } else {
        // 成功，重置失败计数
        this._consecutiveFailures = 0;
      }

      // 连续失败次数达到阈值
      if (this._consecutiveFailures >= this._maxConsecutiveFailures) {
        logger.error(`ComfyUI 服务连续 ${this._consecutiveFailures} 次健康检查失败`);
        stateManager.status = Status.FAILED;
        this._notifyStatusChange();
        this._stopHealthCheck();

        // 尝试自动恢复
        void this._attemptRecovery();
      }
    } catch (err) {
      const error = err as Error | null;

      // 在宽容期内，忽略所有错误（插件加载期间服务可能暂时不可用）
      if (inGracePeriod) {
        logger.info(`健康检查失败（宽容期内，忽略）: 启动后 ${Math.floor(elapsed / 1000)} 秒 - ${error?.message ?? '未知'}`);
        return;
      }

      // 非宽容期：超时错误，可能是服务繁忙，仅警告
      if (error?.name === 'AbortError') {
        logger.warn(`健康检查超时: ${error.message || '未知'}（连续失败: ${this._consecutiveFailures + 1}/${this._maxConsecutiveFailures}）`);
      } else {
        // 网络错误等
        const errorMessage = error?.message ?? '未知错误';
        logger.warn(
          `ComfyUI 服务暂时无响应: ${errorMessage}（连续失败: ${this._consecutiveFailures + 1}/${this._maxConsecutiveFailures}）`
        );
      }
      this._consecutiveFailures++;

      if (this._consecutiveFailures >= this._maxConsecutiveFailures) {
        logger.error(`ComfyUI 服务连续 ${this._consecutiveFailures} 次健康检查失败`);
        stateManager.status = Status.FAILED;
        this._notifyStatusChange();
        this._stopHealthCheck();
        void this._attemptRecovery();
      }
    }
  }

  // 停止健康检查
  private _stopHealthCheck(): void {
    if (this._healthCheckTimer) {
      clearInterval(this._healthCheckTimer);
      this._healthCheckTimer = null;
      logger.info('健康检查已停止');
    }
  }

  // 自动恢复机制
  private async _attemptRecovery(): Promise<void> {
    const autoRestart = configManager.server.autoRestart ?? false;
    if (!autoRestart) return;

    logger.info('尝试自动恢复 ComfyUI 服务...');

    // 检查重启次数限制
    if (stateManager.restartAttempts < stateManager.maxRestartAttempts) {
      // 先停止可能存在的进程
      if (this._process && !this._process.killed) {
        logger.info('停止旧进程...');
        this.stop();
        // 等待进程完全停止
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // 增加重启计数
      stateManager.incrementRestartAttempts();
      logger.info(`准备重启（${stateManager.restartAttempts}/${stateManager.maxRestartAttempts}）`);

      // 延迟后重启
      setTimeout(() => {
        void this.start();
      }, 3000);
    } else {
      logger.error('自动恢复失败，已达到最大重启次数');
      dialog.showErrorBox('服务异常', 'ComfyUI 服务异常且自动恢复失败，请手动重启应用');
      // 不再重置重启计数，防止无限重启循环
    }
  }

  // 取消 wait-on 检测
  private _cancelWaitOn(): void {
    if (this._waitOnAbortController) {
      this._waitOnAbortController.abort();
      this._waitOnAbortController = null;
    }
  }

  // 绑定进程事件
  private _bindProcessEvents(_port: number): void {
    if (!this._process) return;

    // 安全解码：优先 UTF-8，失败时回退到 latin1
    const safeDecode = (data: Buffer): string => {
      try {
        return data.toString('utf8');
      } catch {
        return data.toString('latin1');
      }
    };

    // 统一的行处理回调：解析 → 写日志
    const handleLine = (line: string): void => {
      const entry = parseLogLine(line);
      logger.log(entry.message, entry.level);
    };

    // stdout 行缓冲
    const stdoutBuffer = new LineBuffer(handleLine);
    // stderr 行缓冲
    const stderrBuffer = new LineBuffer(handleLine);

    this._process.stdout?.on('data', (data: Buffer) => {
      stdoutBuffer.push(safeDecode(data));
    });

    this._process.stderr?.on('data', (data: Buffer) => {
      stderrBuffer.push(safeDecode(data));
    });

    // 进程退出
    this._process.on('exit', (code, signal) => {
      // 刷新缓冲区中剩余数据
      stdoutBuffer.flush();
      stderrBuffer.flush();
      this._handleExit(code, signal);
    });

    // 进程错误
    this._process.on('error', (err: Error) => {
      stderrBuffer.flush();
      this._handleError(err);
    });
  }

  // 处理超时
  public handleTimeout(): void {
    if (stateManager.status === Status.STARTING) {
      logger.error('启动超时');
      stateManager.status = Status.FAILED;
      this._notifyStatusChange();

      // 强制杀死进程
      if (this._process !== null && !this._process.killed && this._process.pid !== undefined) {
        kill(this._process.pid, 'SIGKILL', () => {
          // 忽略错误
        });
      }

      dialog.showErrorBox('启动失败', 'ComfyUI启动超时，请检查日志或重试');
    }
  }

  // 处理退出
  private _handleExit(code: number | null, signal: string | null): void {
    this._clearTimeout();
    const wasRunning = stateManager.status === Status.RUNNING;
    const currentStatus = stateManager.status;

    logger.warn(`ComfyUI进程退出，PID：${this._process?.pid ?? 'unknown'}，码：${code ?? signal}`);

    this._process = null;
    stateManager.pid = null;

    // 手动停止（由 stop() 触发）
    if (stateManager.isManualStop) {
      // stop() 的 cleanup 会处理状态，这里只记录日志
      logger.info('ComfyUI进程已退出（手动停止）');
      return;
    }

    // 如果当前已经是失败状态或正在重启中，不再尝试重启
    // RESTARTING: restart() 会自己完成重启流程
    // FAILED: _handleStartupFailure 已经处理过
    // STOPPING: stop() 的 cleanup 会处理
    if (currentStatus === Status.FAILED || currentStatus === Status.RESTARTING || currentStatus === Status.STOPPING) {
      logger.warn(`进程退出时状态为 ${currentStatus}，跳过自动重启`);
      return;
    }

    // 自动重启（仅在意外退出时触发）
    const autoRestart = configManager.server.autoRestart ?? false;
    if (autoRestart && wasRunning && stateManager.restartAttempts < stateManager.maxRestartAttempts) {
      // 检查冷却时间
      if (stateManager.canRestart()) {
        stateManager.status = Status.RESTARTING;
        stateManager.incrementRestartAttempts();
        this._notifyStatusChange();
        logger.warn(`进程意外退出，尝试自动重启（${stateManager.restartAttempts}/${stateManager.maxRestartAttempts}）`);
        setTimeout(() => {
          void this.start();
        }, 2000);
      } else {
        // 冷却时间未到，不重启
        const remaining = stateManager.getRestartCooldownRemaining();
        logger.warn(`重启冷却中，剩余 ${Math.ceil(remaining / 1000)} 秒，跳过自动重启`);
        stateManager.status = Status.FAILED;
        this._notifyStatusChange();
        dialog.showErrorBox(
          '进程退出',
          `ComfyUI进程意外退出，重启冷却中（剩余 ${Math.ceil(remaining / 1000)} 秒），请稍后手动重启`
        );
      }
    } else {
      stateManager.status = code === 0 ? Status.STOPPED : Status.FAILED;
      this._notifyStatusChange();

      if (wasRunning && stateManager.restartAttempts >= stateManager.maxRestartAttempts) {
        dialog.showErrorBox('进程退出', 'ComfyUI进程意外退出，且自动重启次数用尽，请检查日志');
      }
    }
  }

  // 处理错误
  private _handleError(err: Error): void {
    this._clearTimeout();
    stateManager.status = Status.FAILED;
    this._notifyStatusChange();
    logger.error(`Python进程启动失败：${err.message}`);
    dialog.showErrorBox('启动失败', `Python执行失败：${err.message}\n请检查Python路径是否正确`);
  }

  // 停止进程 - 优化响应速度
  public stop(): void {
    // 停止健康检查
    this._stopHealthCheck();

    // 取消 wait-on 检测
    this._cancelWaitOn();

    // 清除超时定时器
    this._clearTimeout();

    if (!this._process || this._process.killed) {
      stateManager.status = Status.STOPPED;
      this._notifyStatusChange();
      return;
    }

    const previousStatus = stateManager.status;
    stateManager.status = Status.STOPPING;
    stateManager.setManualStop(true);
    this._notifyStatusChange();

    // 如果是在启动过程中停止，记录日志
    if (previousStatus === Status.STARTING) {
      logger.info('启动过程中被用户中断，正在停止进程...');
    } else {
      logger.info(`停止ComfyUI进程，PID：${this._process.pid}`);
    }

    const pid = this._process.pid;
    let isKilled = false;

    // 清理函数
    const cleanup = () => {
      if (isKilled) return;
      isKilled = true;
      this._process = null;
      stateManager.status = Status.STOPPED;
      stateManager.setManualStop(false);
      // 用户手动停止时重置重启计数器，允许后续手动启动
      stateManager.resetRestartAttempts();
      this._notifyStatusChange();
      logger.info('ComfyUI进程已停止');
    };

    try {
      // Windows 上直接使用 SIGKILL 强制杀死进程树（更可靠且快速）
      // 因为 Windows 不支持 SIGTERM，tree-kill 的 SIGTERM 在 Windows 上可能不可靠
      const signal = process.platform === 'win32' ? 'SIGKILL' : 'SIGTERM';

      if (pid !== undefined) {
        kill(pid, signal, err => {
          if (err) {
            logger.warn(`${signal} 失败：${err.message}，尝试 SIGKILL`);
            // 失败时直接使用 SIGKILL
            this._forceKillProcess(pid, cleanup);
          } else {
            // 成功杀死进程，立即清理
            cleanup();
          }
        });
      }

      // 1.5秒后强制杀死（从 3 秒优化，提高响应速度）
      const killTimer = setTimeout(() => {
        if (!isKilled && pid !== undefined) {
          logger.warn('优雅停止超时，强制杀死进程');
          kill(pid, 'SIGKILL', err => {
            if (err) {
              logger.error(`强制停止失败：${err.message}`);
            } else {
              logger.info('ComfyUI进程树已强制停止');
            }
            cleanup();
          });
        }
      }, 1500);

      // 监听退出
      this._process.on('exit', () => {
        clearTimeout(killTimer);
        cleanup();
      });

      // 监听错误
      this._process.on('error', err => {
        logger.error(`进程错误：${err.message}`);
        clearTimeout(killTimer);
        cleanup();
      });
    } catch (err) {
      const error = err as Error | null;
      const errorMessage = error?.message ?? '未知错误';
      logger.error(`停止异常：${errorMessage}`);
      // 最后的强制清理
      if (pid !== undefined) {
        this._forceKillProcess(pid, cleanup);
      } else {
        cleanup();
      }
    }
  }

  // 清理数据库锁文件
  private _cleanDatabaseLockFiles(comfyuiPath: string): void {
    const userDirectory = path.join(comfyuiPath, 'user');
    const dbPath = path.join(userDirectory, 'comfyui.db');

    const lockFiles = [
      `${dbPath}-journal`,
      `${dbPath}-wal`,
      `${dbPath}-shm`
    ];

    const serverConfig = configManager.server;
    const port = serverConfig.port ?? 8188;
    const managerLogFiles = [
      path.join(userDirectory, `comfyui_${port}.log`),
      path.join(userDirectory, `comfyui_${port}.prev.log`)
    ];

    const allFiles = [...lockFiles, ...managerLogFiles];

    for (const lockFile of allFiles) {
      try {
        if (fsSync.existsSync(lockFile)) {
          fsSync.unlinkSync(lockFile);
          logger.info(`已清理锁文件: ${path.basename(lockFile)}`);
        }
      } catch (err) {
        const error = err as Error;
        logger.warn(`清理锁文件失败 ${path.basename(lockFile)}: ${error.message}`);
      }
    }
  }

  // 重启进程
  public async restart(): Promise<void> {
    // 停止健康检查
    this._stopHealthCheck();

    // 取消 wait-on 检测
    this._cancelWaitOn();

    // 清除超时定时器
    this._clearTimeout();

    // 检查当前状态（在设置 RESTARTING 之前）
    const currentStatus = stateManager.status;
    const isRunning = currentStatus === Status.RUNNING || currentStatus === Status.STARTING;

    // 设置重启状态（在 stop() 之前设置，防止 _handleExit 触发自动重启）
    stateManager.status = Status.RESTARTING;
    stateManager.resetRestartAttempts();
    this._notifyStatusChange();

    // 如果进程正在运行或启动中，先停止
    if (isRunning && this._process && !this._process.killed) {
      logger.info(`重启 ComfyUI：当前状态为 ${currentStatus}，先停止进程 PID: ${this._process.pid}`);

      // 停止进程（isManualStop 由 stop() 设置，_handleExit 会检查 RESTARTING 状态跳过自动重启）
      this.stop();

      // 等待进程完全停止（最多等待10秒）
      const maxWaitTime = 10000;
      const checkInterval = 200;
      let waited = 0;

      while (waited < maxWaitTime) {
        // stop() 的 cleanup 回调会异步修改 this._process，所以需要重新检查
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!this._process || this._process.killed) {
          logger.info('重启：旧进程已完全停止');
          break;
        }
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
      }

      // 如果超时仍未停止，强制杀死进程
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (this._process && !this._process.killed) {
        logger.warn('重启：等待进程停止超时，强制杀死进程');
        if (this._process.pid !== undefined) {
          kill(this._process.pid, 'SIGKILL', () => {});
        }
        this._process = null;
      }
      // 等待端口完全释放（进程退出后端口可能还在 TIME_WAIT 状态）
      logger.info('等待端口释放...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 清理数据库锁文件
      const comfyuiPath = configManager.get('comfyuiPath');
      if (comfyuiPath) {
        this._cleanDatabaseLockFiles(comfyuiPath);
      }
    } else if (!this._process || this._process.killed) {
      logger.info('重启 ComfyUI：没有运行中的进程，直接启动');
    } else {
      logger.info(`重启 ComfyUI：当前状态为 ${currentStatus}，直接启动`);
    }

    // 重启时也检查并清理端口占用
    const serverConfig = configManager.server;
    const targetPort = serverConfig.port ?? 8188;
    logger.info(`重启前检查端口 ${targetPort} 是否可用...`);
    const cleanResult = await environmentChecker.checkAndCleanPort(targetPort);
    if (cleanResult.cleaned) {
      logger.info(`已清理占用端口 ${targetPort} 的进程: PID ${cleanResult.pids.join(', ')}`);
      // 清理后额外等待端口释放
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else if (cleanResult.error) {
      logger.warn(`端口 ${targetPort} 清理失败: ${cleanResult.error}，将尝试使用其他端口`);
    }

    // 启动新进程
    await this.start();
  }

  // 清除超时定时器
  private _clearTimeout(): void {
    if (this._timeoutTimer) {
      clearTimeout(this._timeoutTimer);
      this._timeoutTimer = null;
    }
  }

  // 通知状态变更
  private _notifyStatusChange(): void {
    if (this._onStatusChange) {
      this._onStatusChange(stateManager.getStateData());
    }
  }

  // 强制杀死进程（提取的公共方法）
  private _forceKillProcess(pid: number, cleanup: () => void): void {
    kill(pid, 'SIGKILL', killErr => {
      if (killErr) {
        logger.error(`强制停止失败：${killErr.message}`);
        dialog.showErrorBox('停止失败', `无法停止ComfyUI进程：${killErr.message}`);
      } else {
        logger.info('ComfyUI进程树已强制停止');
      }
      cleanup();
    });
  }

  // 强制杀死进程（用于退出时的最后清理）
  public forceKill(): void {
    if (this._process?.pid !== undefined && this._process.killed !== true) {
      const pid = this._process.pid;
      logger.info(`强制杀死进程 PID: ${pid}`);
      kill(pid, 'SIGKILL', err => {
        if (err) {
          logger.error(`强制杀死进程失败: ${err.message}`);
        }
      });
      this._process = null;
      stateManager.status = Status.STOPPED;
      this._notifyStatusChange();
    }
  }

  // 获取进程信息
  public getProcessInfo(): { pid: number | null; killed: boolean } {
    return {
      pid: this._process?.pid ?? null,
      killed: this._process?.killed ?? true
    };
  }
}

// 导出单例
export const processManager = new ProcessManager();
